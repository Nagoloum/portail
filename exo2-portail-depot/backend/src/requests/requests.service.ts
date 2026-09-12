import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepositRequest } from './deposit-request.entity';
import { DepositFile, DepositFileStatus } from '../files/deposit-file.entity';
import { DepositRequestStatus } from './request-status.enum';
import { RequestStatusService } from './request-status.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { ListRequestsDto } from './dto/list-requests.dto';
import { MetricsService } from '../metrics/metrics.service';
import { Paginated, paginated, resolvePagination } from '../common/pagination';
import { hashPin, generatePin } from '../common/security/pin.util';
import { generateRequestToken } from '../common/security/token.util';

export interface RequestSummary {
  id: string;
  title: string;
  status: DepositRequestStatus;
  requiredCount: number;
  uploadedCount: number;
  createdAt: Date;
  expiresAt: Date;
  link: string;
}

/** What `loadRelationCountAndMap` grafts onto each hydrated row. */
type RequestWithCount = DepositRequest & { uploadedCount: number };

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(DepositRequest) private readonly repo: Repository<DepositRequest>,
    private readonly statusService: RequestStatusService,
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
  ) {}

  private buildLink(token: string): string {
    const base = this.config.getOrThrow<string>('FRONTEND_PUBLIC_BASE_URL').replace(/\/$/, '');
    return `${base}/d/${token}`;
  }

  async create(lawyerId: string, dto: CreateRequestDto) {
    const pepper = this.config.getOrThrow<string>('PIN_PEPPER');
    const ttlDays = dto.expiresInDays ?? this.config.get<number>('LINK_DEFAULT_TTL_DAYS', 7);

    const pin = generatePin();
    const token = generateRequestToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    const entity = this.repo.create({
      lawyerId,
      title: dto.title,
      token,
      pinHash: await hashPin(pin, pepper),
      requiredCount: dto.requiredCount ?? 1,
      expiresAt,
      status: DepositRequestStatus.PENDING,
    });
    const saved = await this.repo.save(entity);
    this.metrics.requestsCreatedTotal.inc();

    // The PIN is returned once, at creation time, and never again: it is
    // not stored in clear anywhere, only its salted+peppered hash is.
    return {
      id: saved.id,
      title: saved.title,
      token: saved.token,
      pin,
      link: this.buildLink(saved.token),
      expiresAt: saved.expiresAt,
      requiredCount: saved.requiredCount,
      status: saved.status,
    };
  }

  /**
   * Paginated on purpose: a lawyer's request list grows without bound, and
   * the previous version loaded every request *and every file row of every
   * request* just to end up displaying a "2 sur 4" counter.
   *
   * `loadRelationCountAndMap` does that counting in SQL (one extra grouped
   * query for the page, not one per row and not one row per file), so the
   * cost of a page no longer depends on how many pieces were deposited.
   */
  async list(lawyerId: string, query: ListRequestsDto = {}): Promise<Paginated<RequestSummary>> {
    const pagination = resolvePagination(query);

    const [rows, total] = await this.repo
      .createQueryBuilder('request')
      .where('request.lawyerId = :lawyerId', { lawyerId })
      .loadRelationCountAndMap('request.uploadedCount', 'request.files', 'file', (qb) =>
        qb.andWhere('file.status = :uploaded', { uploaded: DepositFileStatus.UPLOADED }),
      )
      .orderBy('request.createdAt', 'DESC')
      // createdAt is not unique, so it cannot order a stable page on its
      // own: two requests created in the same millisecond could swap
      // between page 1 and page 2. The id breaks the tie deterministically.
      .addOrderBy('request.id', 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit)
      .getManyAndCount();

    const items = (rows as RequestWithCount[]).map((row) => this.toSummary(row, row.uploadedCount));
    return paginated(items, total, pagination);
  }

  async findOneForLawyer(lawyerId: string, id: string) {
    // Ownership is part of the WHERE clause rather than an if() after the
    // read: a request that is not this lawyer's is indistinguishable from
    // one that does not exist, so the endpoint cannot be used to probe
    // which ids exist.
    const request = await this.repo
      .createQueryBuilder('request')
      .where('request.id = :id', { id })
      .andWhere('request.lawyerId = :lawyerId', { lawyerId })
      .leftJoinAndSelect(
        'request.files',
        'file',
        'file.status = :uploaded',
        { uploaded: DepositFileStatus.UPLOADED },
      )
      .orderBy('file.createdAt', 'ASC')
      .getOne();

    if (!request) {
      throw new NotFoundException('Demande introuvable');
    }

    const files: DepositFile[] = request.files ?? [];
    return {
      ...this.toSummary(request, files.length),
      files: files.map((f) => ({
        id: f.id,
        originalName: f.originalName,
        size: Number(f.size),
        uploadedAt: f.uploadedAt,
      })),
    };
  }

  private toSummary(request: DepositRequest, uploadedCount: number): RequestSummary {
    const status = this.statusService.computeEffectiveStatus({
      persistedStatus: request.status,
      expiresAt: request.expiresAt,
      uploadedCount,
      requiredCount: request.requiredCount,
    });

    return {
      id: request.id,
      title: request.title,
      status,
      requiredCount: request.requiredCount,
      uploadedCount,
      createdAt: request.createdAt,
      expiresAt: request.expiresAt,
      link: this.buildLink(request.token),
    };
  }
}

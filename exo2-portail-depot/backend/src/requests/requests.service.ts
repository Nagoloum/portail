import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepositRequest } from './deposit-request.entity';
import { DepositFileStatus } from '../files/deposit-file.entity';
import { DepositRequestStatus } from './request-status.enum';
import { RequestStatusService } from './request-status.service';
import { CreateRequestDto } from './dto/create-request.dto';
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

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(DepositRequest) private readonly repo: Repository<DepositRequest>,
    private readonly statusService: RequestStatusService,
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

  async list(lawyerId: string): Promise<RequestSummary[]> {
    const requests = await this.repo.find({
      where: { lawyerId },
      relations: { files: true },
      order: { createdAt: 'DESC' },
    });

    return requests.map((request) => this.toSummary(request));
  }

  async findOneForLawyer(lawyerId: string, id: string) {
    const request = await this.repo.findOne({ where: { id }, relations: { files: true } });
    if (!request) {
      throw new NotFoundException('Demande introuvable');
    }
    if (request.lawyerId !== lawyerId) {
      throw new ForbiddenException('Cette demande ne vous appartient pas');
    }

    return {
      ...this.toSummary(request),
      files: request.files
        .filter((f) => f.status === DepositFileStatus.UPLOADED)
        .map((f) => ({
          id: f.id,
          originalName: f.originalName,
          size: Number(f.size),
          uploadedAt: f.uploadedAt,
        })),
    };
  }

  private toSummary(request: DepositRequest): RequestSummary {
    const uploadedCount = request.files?.filter((f) => f.status === DepositFileStatus.UPLOADED).length ?? 0;
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

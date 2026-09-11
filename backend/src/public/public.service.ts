import {
  ConflictException,
  GoneException,
  HttpException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DepositRequest } from '../requests/deposit-request.entity';
import { DepositRequestStatus } from '../requests/request-status.enum';
import { RequestStatusService } from '../requests/request-status.service';
import { FilesService } from '../files/files.service';
import { StorageService } from '../files/storage.service';
import { isAllowedMimeType } from '../files/file-validation.util';
import { AuditAction } from '../audit/audit-log.entity';
import { AuditContext, AuditService } from '../audit/audit.service';
import { MetricsService } from '../metrics/metrics.service';
import { verifyPin } from '../common/security/pin.util';
import { generateStorageKey } from '../common/security/token.util';
import { isLocked, registerFailedAttempt, registerSuccess } from '../common/security/pin-lockout.util';
import { PublicJwtPayload } from '../auth/jwt-payload.type';

@Injectable()
export class PublicService {
  constructor(
    @InjectRepository(DepositRequest) private readonly repo: Repository<DepositRequest>,
    private readonly statusService: RequestStatusService,
    private readonly filesService: FilesService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly metrics: MetricsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private async loadOrThrow(token: string): Promise<DepositRequest> {
    const request = await this.repo.findOne({ where: { token } });
    if (!request) {
      this.metrics.publicLinkAccessTotal.inc({ result: 'not_found' });
      throw new NotFoundException('Lien introuvable');
    }
    return request;
  }

  private async summarize(request: DepositRequest) {
    const uploadedCount = await this.filesService.countUploaded(request.id);
    const status = this.statusService.computeEffectiveStatus({
      persistedStatus: request.status,
      expiresAt: request.expiresAt,
      uploadedCount,
      requiredCount: request.requiredCount,
    });
    const files = await this.filesService.listUploaded(request.id);

    return {
      title: request.title,
      status,
      requiredCount: request.requiredCount,
      uploadedCount,
      expiresAt: request.expiresAt,
      files: files.map((f) => ({ id: f.id, originalName: f.originalName, size: Number(f.size), uploadedAt: f.uploadedAt })),
    };
  }

  async unlock(token: string, pin: string, ctx: AuditContext): Promise<{ accessToken: string; request: Awaited<ReturnType<PublicService['summarize']>> }> {
    const request = await this.loadOrThrow(token);
    const now = new Date();

    const uploadedCount = await this.filesService.countUploaded(request.id);
    const effectiveStatus = this.statusService.computeEffectiveStatus({
      persistedStatus: request.status,
      expiresAt: request.expiresAt,
      uploadedCount,
      requiredCount: request.requiredCount,
      now,
    });

    if (effectiveStatus === DepositRequestStatus.EXPIRED) {
      this.metrics.publicLinkAccessTotal.inc({ result: 'expired' });
      await this.audit.record(request.id, AuditAction.LINK_ACCESSED, ctx, { outcome: 'expired' });
      throw new GoneException('Ce lien a expire');
    }

    if (isLocked({ failedAttempts: request.pinFailedAttempts, lockedUntil: request.pinLockedUntil }, now)) {
      this.metrics.pinVerificationTotal.inc({ result: 'locked' });
      await this.audit.record(request.id, AuditAction.PIN_LOCKED, ctx);
      // 423 Locked (WebDAV, RFC 4918) - not in @nestjs/common's HttpStatus
      // enum in this version, hence the literal.
      throw new HttpException('Trop de tentatives, reessayez plus tard', 423);
    }

    const pepper = this.config.getOrThrow<string>('PIN_PEPPER');
    const valid = await verifyPin(pin, pepper, request.pinHash);

    if (!valid) {
      const maxAttempts = this.config.get<number>('PIN_MAX_ATTEMPTS', 5);
      const lockoutMinutes = this.config.get<number>('PIN_LOCKOUT_MINUTES', 15);
      const next = registerFailedAttempt(
        { failedAttempts: request.pinFailedAttempts, lockedUntil: request.pinLockedUntil },
        now,
        maxAttempts,
        lockoutMinutes,
      );
      await this.repo.update(request.id, { pinFailedAttempts: next.failedAttempts, pinLockedUntil: next.lockedUntil });
      const justLocked = !!next.lockedUntil;
      this.metrics.pinVerificationTotal.inc({ result: justLocked ? 'locked' : 'failure' });
      await this.audit.record(request.id, justLocked ? AuditAction.PIN_LOCKED : AuditAction.PIN_FAILURE, ctx);
      throw new UnauthorizedException('Code PIN invalide');
    }

    const reset = registerSuccess();
    await this.repo.update(request.id, { pinFailedAttempts: reset.failedAttempts, pinLockedUntil: reset.lockedUntil });
    this.metrics.pinVerificationTotal.inc({ result: 'success' });
    this.metrics.publicLinkAccessTotal.inc({ result: 'ok' });
    await this.audit.record(request.id, AuditAction.PIN_SUCCESS, ctx);

    const payload: PublicJwtPayload = { sub: request.id, token: request.token, type: 'public' };
    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get<string>('PUBLIC_JWT_EXPIRES_IN'),
    });

    return { accessToken, request: await this.summarize(request) };
  }

  async getStatus(requestId: string) {
    const request = await this.repo.findOneOrFail({ where: { id: requestId } });
    return this.summarize(request);
  }

  async uploadFile(requestId: string, file: Express.Multer.File, ctx: AuditContext) {
    const request = await this.repo.findOneOrFail({ where: { id: requestId } });
    const uploadedCountBefore = await this.filesService.countUploaded(request.id);

    const accepting = this.statusService.isAcceptingUploads({
      persistedStatus: request.status,
      expiresAt: request.expiresAt,
      uploadedCount: uploadedCountBefore,
      requiredCount: request.requiredCount,
    });
    if (!accepting) {
      this.metrics.filesRejectedTotal.inc({ reason: 'expired' });
      await this.audit.record(request.id, AuditAction.FILE_REJECTED, ctx, { reason: 'not_accepting' });
      throw new ConflictException('Ce depot n\'accepte plus de nouvelles pieces');
    }

    if (!isAllowedMimeType(file.mimetype)) {
      this.metrics.filesRejectedTotal.inc({ reason: 'type' });
      await this.audit.record(request.id, AuditAction.FILE_REJECTED, ctx, { reason: 'declared_type', mimetype: file.mimetype });
      throw new UnprocessableEntityException('Type de fichier non autorise (PDF, JPG ou PNG uniquement)');
    }

    // Do not trust the declared Content-Type: sniff the actual magic bytes.
    // This is our "verification de type" line of defense (renamed .exe as
    // .pdf, corrupted uploads, etc.) - see README for why we did not wire
    // a full antivirus engine (ClamAV) into this exercise.
    // `file-type` is ESM-only, hence the dynamic import from this CJS build.
    const { fileTypeFromBuffer } = await import('file-type');
    const detected = await fileTypeFromBuffer(file.buffer);
    if (!detected || !isAllowedMimeType(detected.mime)) {
      this.metrics.filesRejectedTotal.inc({ reason: 'type' });
      await this.audit.record(request.id, AuditAction.FILE_REJECTED, ctx, {
        reason: 'magic_bytes_mismatch',
        declared: file.mimetype,
        detected: detected?.mime ?? null,
      });
      throw new UnprocessableEntityException('Le contenu du fichier ne correspond pas a un PDF, JPG ou PNG valide');
    }

    const storageKey = generateStorageKey(request.id, uuidv4(), file.originalname);
    await this.storage.putObject(storageKey, file.buffer, detected.mime);

    const saved = await this.filesService.recordUpload({
      requestId: request.id,
      originalName: file.originalname,
      declaredMimeType: file.mimetype,
      detectedMimeType: detected.mime,
      size: file.size,
      storageKey,
    });

    this.metrics.filesUploadedTotal.inc();
    this.metrics.filesUploadedBytesTotal.inc(file.size);
    await this.audit.record(request.id, AuditAction.FILE_UPLOADED, ctx, { fileId: saved.id, size: file.size });

    const uploadedCountAfter = uploadedCountBefore + 1;
    if (
      request.status === DepositRequestStatus.PENDING &&
      this.statusService.isTargetReached(uploadedCountAfter, request.requiredCount)
    ) {
      await this.repo.update(request.id, { status: DepositRequestStatus.COMPLETE });
    }

    return this.getStatus(request.id);
  }
}

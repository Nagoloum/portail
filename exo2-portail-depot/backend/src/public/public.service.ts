import {
  ConflictException,
  GoneException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DepositRequest } from '../requests/deposit-request.entity';
import { DepositRequestStatus } from '../requests/request-status.enum';
import { RequestStatusService } from '../requests/request-status.service';
import { FilesService } from '../files/files.service';
import { StorageService } from '../files/storage.service';
import { detectMimeTypeFromBytes, isAllowedMimeType } from '../files/file-validation.util';
import { AuditAction } from '../audit/audit-log.entity';
import { AuditContext, AuditService } from '../audit/audit.service';
import { MetricsService } from '../metrics/metrics.service';
import { verifyPin } from '../common/security/pin.util';
import { generateStorageKey } from '../common/security/token.util';
import { isLocked, registerFailedAttempt, registerSuccess } from '../common/security/pin-lockout.util';
import { PublicJwtPayload } from '../auth/jwt-payload.type';

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(
    @InjectRepository(DepositRequest) private readonly repo: Repository<DepositRequest>,
    @InjectDataSource() private readonly dataSource: DataSource,
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

  /**
   * One query, not two: the uploaded count is the length of the list we
   * already have to fetch anyway. `uploadedCount` is passed in when the
   * caller has just computed it, so `unlock` does not count a third time.
   */
  private async summarize(request: DepositRequest) {
    const files = await this.filesService.listUploaded(request.id);
    const uploadedCount = files.length;
    const status = this.statusService.computeEffectiveStatus({
      persistedStatus: request.status,
      expiresAt: request.expiresAt,
      uploadedCount,
      requiredCount: request.requiredCount,
    });

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

  /**
   * The session JWT carries the request id, so the row existed when the
   * token was minted - but a 404 is still the right answer if it has since
   * been deleted. `findOneOrFail` would have raised TypeORM's
   * EntityNotFoundError here, which is not an HttpException and surfaces as
   * a 500.
   */
  private async loadByIdOrThrow(requestId: string): Promise<DepositRequest> {
    const request = await this.repo.findOne({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Demande introuvable');
    }
    return request;
  }

  async getStatus(requestId: string) {
    return this.summarize(await this.loadByIdOrThrow(requestId));
  }

  async uploadFile(requestId: string, file: Express.Multer.File, ctx: AuditContext) {
    const request = await this.loadByIdOrThrow(requestId);

    // Cheap pre-check: refuse an obviously closed link before spending
    // bandwidth on MinIO. The authoritative check is the one inside the
    // transaction below - this one only exists to fail fast.
    const accepting = this.statusService.isAcceptingUploads({
      persistedStatus: request.status,
      expiresAt: request.expiresAt,
      uploadedCount: await this.filesService.countUploaded(request.id),
      requiredCount: request.requiredCount,
    });
    if (!accepting) {
      await this.rejectUpload(request.id, ctx, 'expired', 'not_accepting');
      throw new ConflictException("Ce depot n'accepte plus de nouvelles pieces");
    }

    if (!isAllowedMimeType(file.mimetype)) {
      await this.rejectUpload(request.id, ctx, 'type', 'declared_type', { mimetype: file.mimetype });
      throw new UnprocessableEntityException('Type de fichier non autorise (PDF, JPG ou PNG uniquement)');
    }

    // Do not trust the declared Content-Type: sniff the actual magic bytes.
    // This is our "verification de type" line of defense (renamed .exe as
    // .pdf, corrupted uploads, etc.) - see README for why we did not wire
    // a full antivirus engine (ClamAV) into this exercise.
    const detected = detectMimeTypeFromBytes(file.buffer);
    if (!detected) {
      await this.rejectUpload(request.id, ctx, 'type', 'magic_bytes_mismatch', {
        declared: file.mimetype,
        detected: null,
      });
      throw new UnprocessableEntityException('Le contenu du fichier ne correspond pas a un PDF, JPG ou PNG valide');
    }

    const storageKey = generateStorageKey(request.id, uuidv4(), file.originalname);
    await this.storage.putObject(storageKey, file.buffer, detected);

    let saved;
    try {
      saved = await this.commitUpload(request.id, {
        originalName: file.originalname,
        declaredMimeType: file.mimetype,
        detectedMimeType: detected,
        size: file.size,
        storageKey,
      });
    } catch (err) {
      // The bytes are already in MinIO but no row references them: drop the
      // object rather than leave it orphaned in the bucket forever.
      await this.storage.deleteObject(storageKey).catch((cleanupErr) => {
        this.logger.error(`Orphaned object left in the bucket: ${storageKey}`, cleanupErr as Error);
      });
      if (err instanceof ConflictException) {
        await this.rejectUpload(request.id, ctx, 'expired', 'not_accepting');
      }
      throw err;
    }

    this.metrics.filesUploadedTotal.inc();
    this.metrics.filesUploadedBytesTotal.inc(file.size);
    await this.audit.record(request.id, AuditAction.FILE_UPLOADED, ctx, { fileId: saved.id, size: file.size });

    return this.getStatus(request.id);
  }

  /**
   * The whole point of this method: re-check, insert and flip to COMPLETE
   * atomically.
   *
   * Read-then-write outside a transaction let two uploads arriving at the
   * same instant on a `requiredCount: 1` request both read "0 uploaded",
   * both conclude the link was still accepting, and both store a file. The
   * pessimistic lock on the request row serialises them: the second one
   * wakes up seeing 1 uploaded and is refused.
   */
  private async commitUpload(
    requestId: string,
    file: { originalName: string; declaredMimeType: string; detectedMimeType: string; size: number; storageKey: string },
  ) {
    return this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(DepositRequest, {
        where: { id: requestId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) {
        throw new NotFoundException('Demande introuvable');
      }

      const uploadedCount = await this.filesService.countUploaded(requestId, manager);
      const accepting = this.statusService.isAcceptingUploads({
        persistedStatus: locked.status,
        expiresAt: locked.expiresAt,
        uploadedCount,
        requiredCount: locked.requiredCount,
      });
      if (!accepting) {
        throw new ConflictException("Ce depot n'accepte plus de nouvelles pieces");
      }

      const saved = await this.filesService.recordUpload({ requestId, ...file }, manager);

      if (
        locked.status === DepositRequestStatus.PENDING &&
        this.statusService.isTargetReached(uploadedCount + 1, locked.requiredCount)
      ) {
        await manager.update(DepositRequest, requestId, { status: DepositRequestStatus.COMPLETE });
      }

      return saved;
    });
  }

  /** Metric + audit trail for a refused deposit, always emitted together. */
  private async rejectUpload(
    requestId: string,
    ctx: AuditContext,
    reason: string,
    auditReason: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    this.metrics.filesRejectedTotal.inc({ reason });
    await this.audit.record(requestId, AuditAction.FILE_REJECTED, ctx, { reason: auditReason, ...metadata });
  }

  /** Surfaced for the 413 message; multer's own limit comes from the same key. */
  get maxFileSizeMb(): number {
    return this.config.get<number>('MAX_FILE_SIZE_MB', 20);
  }

  /**
   * Called by PayloadTooLargeFilter: multer aborts the upload before this
   * service ever sees a buffer, so the rejection has to be journalled and
   * counted from there.
   */
  async recordOversizedUpload(requestId: string, ctx: AuditContext): Promise<void> {
    await this.rejectUpload(requestId, ctx, 'size', 'file_too_large');
  }
}

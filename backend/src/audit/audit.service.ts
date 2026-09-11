import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction, AuditLog } from './audit-log.entity';

export interface AuditContext {
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  async record(
    requestId: string,
    action: AuditAction,
    context: AuditContext = {},
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.repo.save(
        this.repo.create({
          requestId,
          action,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
          metadata: metadata ?? null,
        }),
      );
    } catch (err) {
      // Audit logging must never break the request/response flow it observes.
      this.logger.error(`Failed to write audit log for ${requestId}/${action}`, err as Error);
    }
  }
}

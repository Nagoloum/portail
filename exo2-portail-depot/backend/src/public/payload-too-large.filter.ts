import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger, PayloadTooLargeException } from '@nestjs/common';
import { Request, Response } from 'express';
import { PublicJwtPayload } from '../auth/jwt-payload.type';
import { PublicService } from './public.service';

/**
 * Multer aborts an oversized upload while it is still streaming, long
 * before the controller runs. `@nestjs/platform-express` already turns
 * that into a 413 (`transformException`, multer/multer.utils.js), so the
 * status code was never wrong - but that path bypasses every one of our
 * own checks, and with them the two things the README promises:
 *
 *   - an `audit_logs` row for the refused deposit;
 *   - `deposit_files_rejected_total{reason="size"}`, a series documented
 *     in "Observabilite" that no code ever incremented, so it read a
 *     reassuring zero no matter how many deposits bounced.
 *
 * It also replies "File too large", multer's English string, in an
 * otherwise French interface.
 *
 * Guards run before interceptors, so `req.user` is already the public
 * session here and the rejection can be attributed to the right request.
 */
@Catch(PayloadTooLargeException)
export class PayloadTooLargeFilter implements ExceptionFilter {
  private readonly logger = new Logger(PayloadTooLargeFilter.name);

  constructor(private readonly publicService: PublicService) {}

  async catch(_exception: PayloadTooLargeException, host: ArgumentsHost): Promise<void> {
    const http = host.switchToHttp();
    const req = http.getRequest<Request & { user?: PublicJwtPayload }>();
    const res = http.getResponse<Response>();

    if (req.user?.sub) {
      // Best effort: failing to journal must not turn a clean 413 into a 500.
      await this.publicService
        .recordOversizedUpload(req.user.sub, { ip: req.ip, userAgent: req.headers['user-agent'] ?? null })
        .catch((err) => this.logger.error('Failed to record an oversized upload', err as Error));
    }

    const maxMb = this.publicService.maxFileSizeMb;
    res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      message: `Fichier trop volumineux (${maxMb} Mo maximum par piece)`,
      error: 'Payload Too Large',
    });
  }
}

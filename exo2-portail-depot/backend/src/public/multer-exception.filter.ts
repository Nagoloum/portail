import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { MulterError } from 'multer';
import { PublicJwtPayload } from '../auth/jwt-payload.type';
import { PublicService } from './public.service';

/**
 * Multer rejects an oversized upload while it is still streaming, before
 * the controller (and therefore any of our own checks) ever runs. Left
 * alone, that MulterError is not an HttpException and Nest answers 500 -
 * so the most ordinary user mistake, "my scan is 30 Mo", looked like a
 * server crash, was never audited, and never reached the
 * `deposit_files_rejected_total{reason="size"}` counter the README
 * documents.
 *
 * Guards run before interceptors, so `req.user` is already the public
 * session here and the rejection can be attributed to the right request.
 */
@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MulterExceptionFilter.name);

  constructor(private readonly publicService: PublicService) {}

  async catch(error: MulterError, host: ArgumentsHost): Promise<void> {
    const http = host.switchToHttp();
    const req = http.getRequest<Request & { user?: PublicJwtPayload }>();
    const res = http.getResponse<Response>();

    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    const status = tooLarge ? HttpStatus.PAYLOAD_TOO_LARGE : HttpStatus.BAD_REQUEST;
    const maxMb = Number(process.env.MAX_FILE_SIZE_MB ?? 20);
    const message = tooLarge
      ? `Fichier trop volumineux (${maxMb} Mo maximum)`
      : 'Depot invalide';

    if (tooLarge && req.user?.sub) {
      // Best effort: a failure to journal must not turn a clean 413 into a 500.
      await this.publicService
        .recordOversizedUpload(req.user.sub, { ip: req.ip, userAgent: req.headers['user-agent'] ?? null })
        .catch((err) => this.logger.error('Failed to record an oversized upload', err as Error));
    }

    res.status(status).json({ statusCode: status, message, error: tooLarge ? 'Payload Too Large' : 'Bad Request' });
  }
}

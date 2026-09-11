import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const start = process.hrtime.bigint();
    // Route template (e.g. "/requests/:id") rather than the raw URL, so a
    // metric's cardinality never grows with the number of distinct ids hit.
    const route = request.route?.path ?? request.url;

    const record = () => {
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
      this.metrics.httpRequestDuration.observe(
        { method: request.method, route, status_code: String(response.statusCode) },
        durationSeconds,
      );
    };

    return next.handle().pipe(tap({ next: record, error: record }));
  }
}

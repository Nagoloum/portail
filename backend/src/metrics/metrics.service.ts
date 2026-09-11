import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

/**
 * Deliberately small set of metrics, chosen for what they let us act on
 * rather than for dashboard decoration (see README "Observabilite"):
 *
 *  - http_request_duration_seconds: latency + error rate (RED method) on
 *    every route, the generic "is the API healthy" signal an alert fires on.
 *  - pin_verification_total{result}: the security-relevant one - a spike
 *    in "failure" is a brute-force attempt against a client's PIN.
 *  - deposit_files_uploaded_(total|bytes_total) / deposit_files_rejected_total:
 *    the product's core job (pieces actually flowing in) and its failure mode
 *    (rejected uploads - wrong type, or errors).
 *  - deposit_requests_created_total / public_link_access_total{result}:
 *    usage of the two-sided flow (lawyer creates, client opens the link).
 */
@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [this.registry],
  });

  readonly pinVerificationTotal = new Counter({
    name: 'pin_verification_total',
    help: 'PIN verification attempts on public links, by result',
    labelNames: ['result'] as const, // success | failure | locked
    registers: [this.registry],
  });

  readonly filesUploadedTotal = new Counter({
    name: 'deposit_files_uploaded_total',
    help: 'Number of files successfully uploaded',
    registers: [this.registry],
  });

  readonly filesUploadedBytesTotal = new Counter({
    name: 'deposit_files_uploaded_bytes_total',
    help: 'Total bytes successfully uploaded',
    registers: [this.registry],
  });

  readonly filesRejectedTotal = new Counter({
    name: 'deposit_files_rejected_total',
    help: 'Number of uploads rejected, by reason',
    labelNames: ['reason'] as const, // type | size | expired
    registers: [this.registry],
  });

  readonly requestsCreatedTotal = new Counter({
    name: 'deposit_requests_created_total',
    help: 'Number of deposit requests created by lawyers',
    registers: [this.registry],
  });

  readonly publicLinkAccessTotal = new Counter({
    name: 'public_link_access_total',
    help: 'Public link accesses, by outcome',
    labelNames: ['result'] as const, // ok | not_found | expired
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry });
  }

  async metricsText(): Promise<string> {
    return this.registry.metrics();
  }
}

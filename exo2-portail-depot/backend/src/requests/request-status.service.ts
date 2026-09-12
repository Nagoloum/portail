import { Injectable } from '@nestjs/common';
import { DepositRequestStatus } from './request-status.enum';

export interface StatusInput {
  /** The only two states we actually persist. */
  persistedStatus: DepositRequestStatus.PENDING | DepositRequestStatus.COMPLETE;
  expiresAt: Date;
  uploadedCount: number;
  requiredCount: number;
  now?: Date;
}

/**
 * All request-status business rules live here, isolated from TypeORM and
 * HTTP, so they can be unit tested with plain objects and fake clocks
 * (see request-status.service.spec.ts). Two callers depend on this:
 *  - RequestsService, to display the effective status of a request;
 *  - PublicAccessService, to decide whether a link still accepts uploads
 *    and whether a completed upload should flip the status to COMPLETE.
 */
@Injectable()
export class RequestStatusService {
  isExpired(expiresAt: Date, now: Date = new Date()): boolean {
    return now.getTime() > expiresAt.getTime();
  }

  /**
   * COMPLETE is sticky: once every requested piece has been uploaded, the
   * request stays COMPLETE even if the link later expires - the lawyer
   * got what they asked for, expiry is only about *pending* access.
   * Otherwise EXPIRED overrides PENDING once the deadline has passed.
   */
  computeEffectiveStatus(input: StatusInput): DepositRequestStatus {
    const now = input.now ?? new Date();

    if (input.persistedStatus === DepositRequestStatus.COMPLETE) {
      return DepositRequestStatus.COMPLETE;
    }

    if (this.isExpired(input.expiresAt, now)) {
      return DepositRequestStatus.EXPIRED;
    }

    return DepositRequestStatus.PENDING;
  }

  /** Whether uploading `uploadedCount` files satisfies the request's target. */
  isTargetReached(uploadedCount: number, requiredCount: number): boolean {
    return uploadedCount >= requiredCount;
  }

  /**
   * A public link only accepts new uploads while it is PENDING: not
   * expired, and not already complete (nothing left to ask for).
   *
   * "Nothing left to ask for" is checked against the count directly, not
   * only against the persisted COMPLETE flag. Relying on the flag alone
   * made the cap depend on an earlier write having happened: a request
   * sitting at 4 of 4 whose status had not been flipped yet would still
   * have accepted a fifth piece.
   */
  isAcceptingUploads(input: StatusInput): boolean {
    if (this.computeEffectiveStatus(input) !== DepositRequestStatus.PENDING) {
      return false;
    }
    return !this.isTargetReached(input.uploadedCount, input.requiredCount);
  }
}

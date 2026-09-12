import { RequestStatusService } from './request-status.service';
import { DepositRequestStatus } from './request-status.enum';

describe('RequestStatusService', () => {
  let service: RequestStatusService;
  const NOW = new Date('2026-03-15T12:00:00.000Z');
  const FUTURE = new Date('2026-03-20T12:00:00.000Z');
  const PAST = new Date('2026-03-10T12:00:00.000Z');

  beforeEach(() => {
    service = new RequestStatusService();
  });

  describe('isExpired', () => {
    it('is not expired before the deadline', () => {
      expect(service.isExpired(FUTURE, NOW)).toBe(false);
    });

    it('is expired strictly after the deadline', () => {
      expect(service.isExpired(PAST, NOW)).toBe(true);
    });

    it('is not expired exactly at the deadline (boundary is inclusive of the last instant)', () => {
      expect(service.isExpired(NOW, NOW)).toBe(false);
    });

    it('is expired one millisecond after the deadline', () => {
      const oneMsAfter = new Date(NOW.getTime() + 1);
      expect(service.isExpired(NOW, oneMsAfter)).toBe(true);
    });
  });

  describe('computeEffectiveStatus - transitions', () => {
    it('stays PENDING before expiry with the target not reached', () => {
      const status = service.computeEffectiveStatus({
        persistedStatus: DepositRequestStatus.PENDING,
        expiresAt: FUTURE,
        uploadedCount: 1,
        requiredCount: 4,
        now: NOW,
      });
      expect(status).toBe(DepositRequestStatus.PENDING);
    });

    it('transitions PENDING -> EXPIRED once the deadline has passed', () => {
      const status = service.computeEffectiveStatus({
        persistedStatus: DepositRequestStatus.PENDING,
        expiresAt: PAST,
        uploadedCount: 1,
        requiredCount: 4,
        now: NOW,
      });
      expect(status).toBe(DepositRequestStatus.EXPIRED);
    });

    it('transitions to COMPLETE when the persisted status is already COMPLETE', () => {
      const status = service.computeEffectiveStatus({
        persistedStatus: DepositRequestStatus.COMPLETE,
        expiresAt: FUTURE,
        uploadedCount: 4,
        requiredCount: 4,
        now: NOW,
      });
      expect(status).toBe(DepositRequestStatus.COMPLETE);
    });

    it('COMPLETE is sticky and overrides an expired deadline', () => {
      const status = service.computeEffectiveStatus({
        persistedStatus: DepositRequestStatus.COMPLETE,
        expiresAt: PAST,
        uploadedCount: 4,
        requiredCount: 4,
        now: NOW,
      });
      expect(status).toBe(DepositRequestStatus.COMPLETE);
    });

    it('never reports COMPLETE from counts alone - that transition must be persisted explicitly', () => {
      const status = service.computeEffectiveStatus({
        persistedStatus: DepositRequestStatus.PENDING,
        expiresAt: FUTURE,
        uploadedCount: 4,
        requiredCount: 4,
        now: NOW,
      });
      expect(status).toBe(DepositRequestStatus.PENDING);
    });
  });

  describe('isTargetReached', () => {
    it('is false while fewer files than required were uploaded', () => {
      expect(service.isTargetReached(2, 4)).toBe(false);
    });

    it('is true once the required count is met', () => {
      expect(service.isTargetReached(4, 4)).toBe(true);
    });

    it('is true when more files than required were uploaded', () => {
      expect(service.isTargetReached(5, 4)).toBe(true);
    });
  });

  describe('isAcceptingUploads', () => {
    it('accepts uploads while PENDING and not expired', () => {
      expect(
        service.isAcceptingUploads({
          persistedStatus: DepositRequestStatus.PENDING,
          expiresAt: FUTURE,
          uploadedCount: 0,
          requiredCount: 4,
          now: NOW,
        }),
      ).toBe(true);
    });

    it('rejects uploads once expired', () => {
      expect(
        service.isAcceptingUploads({
          persistedStatus: DepositRequestStatus.PENDING,
          expiresAt: PAST,
          uploadedCount: 0,
          requiredCount: 4,
          now: NOW,
        }),
      ).toBe(false);
    });

    it('rejects uploads once already COMPLETE, even before expiry', () => {
      expect(
        service.isAcceptingUploads({
          persistedStatus: DepositRequestStatus.COMPLETE,
          expiresAt: FUTURE,
          uploadedCount: 4,
          requiredCount: 4,
          now: NOW,
        }),
      ).toBe(false);
    });

    // The cap must hold on the count itself, not on a COMPLETE flag that
    // some earlier write was supposed to have set: this row is at 4 of 4
    // and still persisted as PENDING, and it must not take a fifth piece.
    it('rejects uploads once the target is reached, even if still persisted PENDING', () => {
      expect(
        service.isAcceptingUploads({
          persistedStatus: DepositRequestStatus.PENDING,
          expiresAt: FUTURE,
          uploadedCount: 4,
          requiredCount: 4,
          now: NOW,
        }),
      ).toBe(false);
    });

    it('still accepts the very last piece', () => {
      expect(
        service.isAcceptingUploads({
          persistedStatus: DepositRequestStatus.PENDING,
          expiresAt: FUTURE,
          uploadedCount: 3,
          requiredCount: 4,
          now: NOW,
        }),
      ).toBe(true);
    });
  });
});

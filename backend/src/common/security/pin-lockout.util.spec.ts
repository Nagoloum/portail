import { isLocked, registerFailedAttempt, registerSuccess } from './pin-lockout.util';

describe('pin-lockout.util', () => {
  const NOW = new Date('2026-03-15T12:00:00.000Z');
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MINUTES = 15;

  describe('isLocked', () => {
    it('is not locked when lockedUntil is null', () => {
      expect(isLocked({ failedAttempts: 2, lockedUntil: null }, NOW)).toBe(false);
    });

    it('is locked while lockedUntil is in the future', () => {
      const lockedUntil = new Date(NOW.getTime() + 60_000);
      expect(isLocked({ failedAttempts: 5, lockedUntil }, NOW)).toBe(true);
    });

    it('is not locked once lockedUntil is in the past', () => {
      const lockedUntil = new Date(NOW.getTime() - 1);
      expect(isLocked({ failedAttempts: 5, lockedUntil }, NOW)).toBe(false);
    });
  });

  describe('registerFailedAttempt', () => {
    it('increments the counter without locking below the threshold', () => {
      const next = registerFailedAttempt({ failedAttempts: 1, lockedUntil: null }, NOW, MAX_ATTEMPTS, LOCKOUT_MINUTES);
      expect(next.failedAttempts).toBe(2);
      expect(next.lockedUntil).toBeNull();
    });

    it('locks the account exactly on the Nth failed attempt', () => {
      const next = registerFailedAttempt(
        { failedAttempts: MAX_ATTEMPTS - 1, lockedUntil: null },
        NOW,
        MAX_ATTEMPTS,
        LOCKOUT_MINUTES,
      );
      expect(next.failedAttempts).toBe(MAX_ATTEMPTS);
      expect(next.lockedUntil).not.toBeNull();
      expect(next.lockedUntil!.getTime()).toBe(NOW.getTime() + LOCKOUT_MINUTES * 60_000);
    });

    it('keeps locking (refreshing the window) on further attempts past the threshold', () => {
      const next = registerFailedAttempt(
        { failedAttempts: MAX_ATTEMPTS, lockedUntil: new Date(NOW.getTime() + 1000) },
        NOW,
        MAX_ATTEMPTS,
        LOCKOUT_MINUTES,
      );
      expect(next.failedAttempts).toBe(MAX_ATTEMPTS + 1);
      expect(next.lockedUntil!.getTime()).toBe(NOW.getTime() + LOCKOUT_MINUTES * 60_000);
    });
  });

  describe('registerSuccess', () => {
    it('resets attempts and clears the lock', () => {
      expect(registerSuccess()).toEqual({ failedAttempts: 0, lockedUntil: null });
    });
  });
});

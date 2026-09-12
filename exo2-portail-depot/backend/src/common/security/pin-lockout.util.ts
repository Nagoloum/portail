export interface LockoutState {
  failedAttempts: number;
  lockedUntil: Date | null;
}

/**
 * Pure brute-force lockout state machine, deliberately free of NestJS/TypeORM
 * so it can be unit tested with plain objects and fake clocks. Used by
 * PublicAccessService around each PIN check.
 */
export function isLocked(state: LockoutState, now: Date): boolean {
  return !!state.lockedUntil && state.lockedUntil.getTime() > now.getTime();
}

export function registerFailedAttempt(
  state: LockoutState,
  now: Date,
  maxAttempts: number,
  lockoutMinutes: number,
): LockoutState {
  const failedAttempts = state.failedAttempts + 1;
  if (failedAttempts >= maxAttempts) {
    return { failedAttempts, lockedUntil: new Date(now.getTime() + lockoutMinutes * 60_000) };
  }
  return { failedAttempts, lockedUntil: null };
}

export function registerSuccess(): LockoutState {
  return { failedAttempts: 0, lockedUntil: null };
}

/**
 * Status is never trusted from the database column alone at read time:
 * EXPIRED is derived from `expiresAt` vs now, COMPLETE is derived from
 * uploaded file count vs `requiredCount`. Only the "explicit" states below
 * are persisted; see RequestStatusService for the derivation rules that
 * are covered by unit tests.
 */
export enum DepositRequestStatus {
  PENDING = 'PENDING',
  COMPLETE = 'COMPLETE',
  EXPIRED = 'EXPIRED',
}

import { nanoid } from 'nanoid';

/**
 * URL-safe, unguessable identifier for the public link (/d/:token).
 * 21 chars of nanoid's default alphabet is ~126 bits of entropy - the
 * expiry and PIN are the "real" access controls, this just avoids
 * sequential/guessable ids.
 */
export function generateRequestToken(): string {
  return nanoid();
}

export function generateStorageKey(requestId: string, fileId: string, originalName: string): string {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
  return `requests/${requestId}/${fileId}-${safeName}`;
}

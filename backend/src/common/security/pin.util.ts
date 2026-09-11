import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * A 4-digit PIN only has 10 000 possibilities, so bcrypt alone is not
 * enough against an offline attacker who steals the `pinHash` column: at
 * bcrypt cost 10 the whole keyspace can be tried in minutes on a laptop.
 * We append a server-side pepper (PIN_PEPPER, never stored in the
 * database) before hashing, so a DB leak alone is not sufficient to brute
 * force the PIN offline - the pepper also has to be exfiltrated from the
 * running server/secret store. Online brute force is separately handled
 * by the attempt counter + lockout in PublicAccessService.
 */
export function hashPin(pin: string, pepper: string): Promise<string> {
  return bcrypt.hash(`${pin}${pepper}`, SALT_ROUNDS);
}

export function verifyPin(pin: string, pepper: string, hash: string): Promise<boolean> {
  return bcrypt.compare(`${pin}${pepper}`, hash);
}

export function generatePin(): string {
  const value = Math.floor(Math.random() * 10000);
  return value.toString().padStart(4, '0');
}

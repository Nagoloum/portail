import { generatePin, hashPin, verifyPin } from './pin.util';

describe('pin.util', () => {
  const PEPPER = 'test-pepper';

  it('verifies a correct PIN against its hash', async () => {
    const hash = await hashPin('1234', PEPPER);
    await expect(verifyPin('1234', PEPPER, hash)).resolves.toBe(true);
  });

  it('rejects an incorrect PIN', async () => {
    const hash = await hashPin('1234', PEPPER);
    await expect(verifyPin('9999', PEPPER, hash)).resolves.toBe(false);
  });

  it('rejects the correct PIN if the pepper does not match', async () => {
    const hash = await hashPin('1234', PEPPER);
    await expect(verifyPin('1234', 'wrong-pepper', hash)).resolves.toBe(false);
  });

  describe('generatePin', () => {
    it('always generates a 4-digit, zero-padded numeric string', () => {
      for (let i = 0; i < 50; i += 1) {
        const pin = generatePin();
        expect(pin).toMatch(/^\d{4}$/);
      }
    });
  });
});

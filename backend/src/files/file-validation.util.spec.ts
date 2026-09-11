import { detectMimeTypeFromBytes, isAllowedMimeType } from './file-validation.util';

/**
 * Written after the real failure it guards against: the previous
 * implementation imported the ESM-only `file-type` package from a CommonJS
 * build, so every upload threw ERR_PACKAGE_PATH_NOT_EXPORTED at runtime
 * while every unit test still passed - nothing exercised the check.
 */
describe('file validation', () => {
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n');
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

  describe('declared MIME type allow-list', () => {
    it('accepts exactly the three formats announced in the drop zone', () => {
      expect(isAllowedMimeType('application/pdf')).toBe(true);
      expect(isAllowedMimeType('image/jpeg')).toBe(true);
      expect(isAllowedMimeType('image/png')).toBe(true);
    });

    it('rejects anything else, including an absent type', () => {
      expect(isAllowedMimeType('application/x-msdownload')).toBe(false);
      expect(isAllowedMimeType('text/html')).toBe(false);
      expect(isAllowedMimeType('image/svg+xml')).toBe(false);
      expect(isAllowedMimeType(undefined)).toBe(false);
    });
  });

  describe('magic-byte detection', () => {
    it('recognises each accepted format from its signature alone', () => {
      expect(detectMimeTypeFromBytes(pdf)).toBe('application/pdf');
      expect(detectMimeTypeFromBytes(jpeg)).toBe('image/jpeg');
      expect(detectMimeTypeFromBytes(png)).toBe('image/png');
    });

    it('rejects an executable renamed .pdf - the attack this control exists for', () => {
      const renamedExe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
      expect(detectMimeTypeFromBytes(renamedExe)).toBeNull();
    });

    it('rejects content whose signature is merely close', () => {
      expect(detectMimeTypeFromBytes(Buffer.from('%PDG-1.4'))).toBeNull();
      expect(detectMimeTypeFromBytes(Buffer.from([0xff, 0xd8, 0xfe]))).toBeNull();
      expect(detectMimeTypeFromBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0b]))).toBeNull();
    });

    it('rejects a buffer too short to carry a signature instead of throwing', () => {
      expect(detectMimeTypeFromBytes(Buffer.alloc(0))).toBeNull();
      expect(detectMimeTypeFromBytes(Buffer.from([0xff, 0xd8]))).toBeNull();
      expect(detectMimeTypeFromBytes(Buffer.from([0x89, 0x50, 0x4e]))).toBeNull();
    });
  });
});

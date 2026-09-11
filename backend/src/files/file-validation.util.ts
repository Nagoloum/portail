/**
 * Allow-list rather than a deny-list, per the drop zone copy in the UI
 * kit: "PDF, JPG ou PNG, 20 Mo maximum par fichier". Kept in one place so
 * the multer filter, the magic-byte check and the frontend hint agree.
 */
export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export function isAllowedMimeType(mime: string | undefined): mime is AllowedMimeType {
  return !!mime && (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

/**
 * Magic-byte signatures for exactly the three formats we accept.
 *
 * This replaces the `file-type` package, which is ESM-only from v17: the
 * backend compiles to CommonJS, so TypeScript rewrote `await
 * import('file-type')` into a `require()` and every single upload died at
 * runtime with ERR_PACKAGE_PATH_NOT_EXPORTED - the type check never ran in
 * production, which is the worst possible failure mode for a security
 * control.
 *
 * Three fixed formats do not justify a dependency, an ESM/CJS hazard, or a
 * 2 MB install: their signatures are stable and specified.
 *   PDF  "%PDF-"                       (ISO 32000-1, 7.5.2)
 *   JPEG FF D8 FF                      (SOI marker, JFIF/Exif alike)
 *   PNG  89 "PNG" CR LF 1A LF          (RFC 2083, 3.1)
 */
const SIGNATURES: ReadonlyArray<{ mime: AllowedMimeType; bytes: readonly number[] }> = [
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
];

/**
 * Returns the MIME type the bytes actually are, or null when the content
 * matches none of the accepted formats. Never trusts the declared
 * Content-Type: a renamed .exe is caught here.
 */
export function detectMimeTypeFromBytes(buffer: Buffer): AllowedMimeType | null {
  for (const { mime, bytes } of SIGNATURES) {
    if (buffer.length < bytes.length) continue;
    if (bytes.every((byte, i) => buffer[i] === byte)) return mime;
  }
  return null;
}

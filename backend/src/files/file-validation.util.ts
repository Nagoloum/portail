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

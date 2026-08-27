export const MAX_PUBLIC_UPLOAD_BYTES = 8_000_000;

export const PUBLIC_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

export const RESOURCE_FILE_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

export const PUBLIC_UPLOAD_MIME_TYPES = [...PUBLIC_IMAGE_MIME_TYPES, ...RESOURCE_FILE_MIME_TYPES] as const;
export type PublicUploadMimeType = (typeof PUBLIC_UPLOAD_MIME_TYPES)[number];

export function isPublicImageMimeType(mimeType: string): mimeType is (typeof PUBLIC_IMAGE_MIME_TYPES)[number] {
  return (PUBLIC_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType.toLowerCase());
}

export function isSupportedResourceFileMimeType(mimeType: string): mimeType is (typeof RESOURCE_FILE_MIME_TYPES)[number] {
  return (RESOURCE_FILE_MIME_TYPES as readonly string[]).includes(mimeType.toLowerCase());
}

export function isSupportedPublicUploadMimeType(mimeType: string): mimeType is PublicUploadMimeType {
  return isPublicImageMimeType(mimeType) || isSupportedResourceFileMimeType(mimeType);
}

export function formatFileSize(byteSize: number) {
  if (byteSize < 1024 * 1024) return `${Math.max(1, Math.ceil(byteSize / 1024))} KB`;
  return `${(byteSize / (1024 * 1024)).toFixed(byteSize >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

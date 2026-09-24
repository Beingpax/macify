export type MediaRole = "icon" | "preview_image" | "screenshot";

export type PreparedMedia = {
  id: string;
  role: MediaRole;
  bytes: Uint8Array;
  digest: ArrayBuffer;
  checksum: string;
  storageKey: string;
  mimeType: string;
  fileName: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  sourceUrl: string | null;
  altText: string | null;
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const convertibleImageTypes = [
  "image/svg+xml",
  "image/gif",
  "image/bmp",
  "image/tiff",
] as const;

export const allowedImageTypes: Record<MediaRole, ReadonlySet<string>> = {
  icon: new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/avif",
    ...convertibleImageTypes,
    "image/vnd.microsoft.icon",
    "image/x-icon",
  ]),
  preview_image: new Set(["image/png", "image/jpeg", "image/webp", "image/avif", ...convertibleImageTypes]),
  screenshot: new Set(["image/png", "image/jpeg", "image/webp", "image/avif", ...convertibleImageTypes]),
};

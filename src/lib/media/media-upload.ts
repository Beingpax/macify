import { allowedImageTypes, MAX_UPLOAD_BYTES, type MediaRole, type PreparedMedia } from "@/lib/media/media-types";
import { bytesToHex, matchesFileSignature, safeFileName } from "@/lib/media/media-validation";
import { fetchRemoteImage } from "@/lib/media/remote-image";
import { optimizeImage } from "@/lib/media/image-optimization";
import { normalizeIcoSource } from "@/lib/media/ico";

export type { MediaRole, PreparedMedia } from "@/lib/media/media-types";

export async function prepareMediaSource(
  appId: string,
  role: MediaRole,
  file: File | null,
  remoteUrl: string,
  altText: string,
  images: ImagesBinding | undefined,
) {
  if (file && remoteUrl) return { ok: false, error: "Choose a local file or enter an image URL, not both." } as const;
  let source: { bytes: Uint8Array; mimeType: string; fileName: string; sourceUrl: string | null };
  if (remoteUrl) {
    const remote = await fetchRemoteImage(remoteUrl, role);
    if (!remote.ok) return remote;
    source = remote;
  } else if (file) {
    if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: `${file.name} is larger than the 10 MB per-file limit.` } as const;
    if (!allowedImageTypes[role].has(file.type)) return { ok: false, error: `${file.name} is not a supported image type.` } as const;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!matchesFileSignature(bytes, file.type)) return { ok: false, error: `${file.name} does not match its declared image type.` } as const;
    source = { bytes, mimeType: file.type, fileName: file.name, sourceUrl: null };
  } else {
    return { ok: false, error: "Choose a file or enter an image URL." } as const;
  }

  try {
    source = await normalizeIcoSource(source);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The ICO file could not be decoded.",
    } as const;
  }

  let optimized: Awaited<ReturnType<typeof optimizeImage>>;
  try {
    optimized = await optimizeImage(images, role, source);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The image could not be processed.",
    } as const;
  }
  const digestInput = optimized.bytes.buffer.slice(
    optimized.bytes.byteOffset,
    optimized.bytes.byteOffset + optimized.bytes.byteLength,
  ) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", digestInput);
  const checksum = bytesToHex(new Uint8Array(digest));
  const id = crypto.randomUUID();
  return {
    ok: true,
    media: {
      id,
      role,
      bytes: optimized.bytes,
      digest,
      checksum,
      storageKey: ["apps", appId, role, `${checksum.slice(0, 16)}-${id}-${safeFileName(optimized.fileName)}`].join("/"),
      mimeType: optimized.mimeType,
      fileName: optimized.fileName,
      byteSize: optimized.bytes.byteLength,
      width: optimized.width,
      height: optimized.height,
      sourceUrl: source.sourceUrl,
      altText: altText.trim().slice(0, 300) || null,
    } satisfies PreparedMedia,
  } as const;
}

export async function putPreparedMedia(bucket: R2Bucket, asset: PreparedMedia) {
  await bucket.put(asset.storageKey, asset.bytes, {
    httpMetadata: {
      contentType: asset.mimeType,
      contentDisposition: "inline",
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: { appId: asset.storageKey.split("/")[1] ?? "", role: asset.role },
    sha256: asset.digest,
  });
}

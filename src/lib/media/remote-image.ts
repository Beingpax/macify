import { allowedImageTypes, MAX_UPLOAD_BYTES, type MediaRole } from "@/lib/media/media-types";
import { detectImageMimeType, matchesFileSignature, parseRemoteImageUrl } from "@/lib/media/media-validation";

async function readResponseWithLimit(response: Response) {
  if (!response.body) throw new Error("The remote server returned an empty response.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_UPLOAD_BYTES) {
      await reader.cancel();
      throw new Error("The remote image is larger than the 10 MB limit.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function fetchRemoteImage(value: string, role: MediaRole) {
  let url = parseRemoteImageUrl(value);
  if (!url) return { ok: false, error: "Use a public HTTPS image URL." } as const;
  const sourceUrl = url.toString();
  try {
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      const response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(12_000),
        headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/svg+xml,image/gif,image/bmp,image/tiff" },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location || redirects === 3) return { ok: false, error: "The image URL redirects too many times." } as const;
        url = parseRemoteImageUrl(new URL(location, url).toString());
        if (!url) return { ok: false, error: "The image URL redirects to a blocked location." } as const;
        continue;
      }
      if (!response.ok) return { ok: false, error: `The image server returned HTTP ${response.status}.` } as const;
      let mimeType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() ?? "";
      if (!allowedImageTypes[role].has(mimeType)) {
        return {
          ok: false,
          error: role === "icon"
            ? "The URL does not return a supported PNG, JPEG, WebP, AVIF, SVG, GIF, BMP, TIFF, or ICO image."
            : "The URL does not return a supported PNG, JPEG, WebP, AVIF, SVG, GIF, BMP, or TIFF image.",
        } as const;
      }
      if (Number(response.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES) return { ok: false, error: "The remote image is larger than the 10 MB limit." } as const;
      const bytes = await readResponseWithLimit(response);
      if (!matchesFileSignature(bytes, mimeType)) {
        const detectedMimeType = detectImageMimeType(bytes);
        if (!detectedMimeType || !allowedImageTypes[role].has(detectedMimeType)) {
          return { ok: false, error: "The downloaded content does not match its image type." } as const;
        }
        mimeType = detectedMimeType;
      }
      return {
        ok: true,
        bytes,
        mimeType,
        fileName: decodeURIComponent(url.pathname.split("/").pop() || "remote-image"),
        sourceUrl,
      } as const;
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The remote image could not be downloaded." } as const;
  }
  return { ok: false, error: "The remote image could not be downloaded." } as const;
}

import type { MediaRole } from "@/lib/media/media-types";

type ImageSource = {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
};

type OptimizedImage = ImageSource & {
  width: number | null;
  height: number | null;
  optimized: boolean;
};

const formatsRequiringRasterization = new Set(["image/svg+xml", "image/gif", "image/bmp", "image/tiff"]);

function imageStream(bytes: Uint8Array) {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([buffer]).stream();
}

function webpFileName(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/-+$/, "") || "image";
  return `${base}.webp`;
}

export async function optimizeImage(
  images: ImagesBinding | undefined,
  role: MediaRole,
  source: ImageSource,
): Promise<OptimizedImage> {
  if (!images) {
    if (formatsRequiringRasterization.has(source.mimeType)) {
      throw new Error("This image format requires conversion before it can be stored.");
    }
    return { ...source, width: null, height: null, optimized: false };
  }
  try {
    const info = await images.info(imageStream(source.bytes));
    const dimensions = "width" in info
      ? { width: info.width, height: info.height }
      : { width: null, height: null };
    const transformed = await images
      .input(imageStream(source.bytes))
      .output({
        format: "image/webp",
        quality: role === "icon" ? 92 : 88,
        anim: false,
      });
    const optimizedBytes = new Uint8Array(await transformed.response().arrayBuffer());
    if (!formatsRequiringRasterization.has(source.mimeType) && optimizedBytes.byteLength >= source.bytes.byteLength) {
      return { ...source, ...dimensions, optimized: false };
    }
    return {
      bytes: optimizedBytes,
      mimeType: "image/webp",
      fileName: webpFileName(source.fileName),
      ...dimensions,
      optimized: true,
    };
  } catch (error) {
    console.error(JSON.stringify({
      event: "media.optimize.failed",
      role,
      message: error instanceof Error ? error.message : "Unknown image transformation error",
    }));
    if (formatsRequiringRasterization.has(source.mimeType)) {
      throw new Error("The source image could not be converted to WebP.");
    }
    return { ...source, width: null, height: null, optimized: false };
  }
}

import type { ImageLoaderProps } from "next/image";

export default function mediaImageLoader({ src, width, quality }: ImageLoaderProps) {
  if (!src.startsWith("/media/")) return src;

  const separator = src.includes("?") ? "&" : "?";
  const qualityParameter = quality ? `&quality=${quality}` : "";
  return `${src}${separator}width=${width}${qualityParameter}`;
}

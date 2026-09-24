import { decodeIco } from "icojs/browser";

const icoMimeTypes = new Set(["image/vnd.microsoft.icon", "image/x-icon"]);

type ImageSource = {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
};

export async function normalizeIcoSource<T extends ImageSource>(source: T): Promise<T> {
  if (!icoMimeTypes.has(source.mimeType)) return source;

  const input = source.bytes.buffer.slice(
    source.bytes.byteOffset,
    source.bytes.byteOffset + source.bytes.byteLength,
  ) as ArrayBuffer;
  const images = await decodeIco(input, "image/png");
  const largest = images.toSorted((left, right) =>
    (right.width * right.height) - (left.width * left.height) || right.bpp - left.bpp
  )[0];
  if (!largest) throw new Error("The ICO file does not contain a decodable image.");

  return {
    ...source,
    bytes: new Uint8Array(largest.buffer),
    mimeType: "image/png",
    fileName: `${source.fileName.replace(/\.ico$/i, "") || "icon"}.png`,
  };
}

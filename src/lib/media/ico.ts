import decodeIco from "decode-ico";

const icoMimeTypes = new Set(["image/vnd.microsoft.icon", "image/x-icon"]);
const pngSignature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

type ImageSource = {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
};

function pngChunk(type: string, data: Uint8Array) {
  const chunk = new Uint8Array(data.byteLength + 12);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.byteLength);
  chunk.set(new TextEncoder().encode(type), 4);
  chunk.set(data, 8);

  let crc = 0xffffffff;
  for (let index = 4; index < chunk.byteLength - 4; index += 1) {
    crc ^= chunk[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
    }
  }
  view.setUint32(chunk.byteLength - 4, (crc ^ 0xffffffff) >>> 0);
  return chunk;
}

async function bmpFrameToPng(width: number, height: number, pixels: Uint8ClampedArray) {
  const stride = width * 4;
  const rows = new Uint8Array(height * (stride + 1));
  for (let row = 0; row < height; row += 1) {
    rows.set(pixels.subarray(row * stride, (row + 1) * stride), row * (stride + 1) + 1);
  }

  // PNG scanlines use a zlib stream. Workers support the Web Compression Streams API.
  const compressed = new Uint8Array(await new Response(
    new Blob([rows.buffer as ArrayBuffer]).stream().pipeThrough(new CompressionStream("deflate")),
  ).arrayBuffer());
  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width);
  headerView.setUint32(4, height);
  header[8] = 8; // 8 bits per channel
  header[9] = 6; // RGBA

  const chunks = [pngSignature, pngChunk("IHDR", header), pngChunk("IDAT", compressed), pngChunk("IEND", new Uint8Array())];
  const output = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

export async function normalizeIcoSource<T extends ImageSource>(source: T): Promise<T> {
  if (!icoMimeTypes.has(source.mimeType)) return source;

  const frames = decodeIco(source.bytes);
  const largest = frames.toSorted((left, right) =>
    (right.width * right.height) - (left.width * left.height) || right.bpp - left.bpp
  )[0];
  if (!largest) throw new Error("The ICO file does not contain a decodable image.");

  const bytes = largest.type === "png"
    ? new Uint8Array(largest.data)
    : await bmpFrameToPng(largest.width, largest.height, largest.data);
  return {
    ...source,
    bytes,
    mimeType: "image/png",
    fileName: `${source.fileName.replace(/\.ico$/i, "") || "icon"}.png`,
  };
}

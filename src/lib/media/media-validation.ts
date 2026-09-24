function bytesStartWith(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((value, index) => bytes[offset + index] === value);
}

function looksLikeSvg(bytes: Uint8Array) {
  const prefix = new TextDecoder().decode(bytes.slice(0, 4096))
    .replace(/^\uFEFF/, "")
    .trimStart()
    .replace(/^<\?xml\b[^>]*\?>\s*/i, "")
    .replace(/^(?:<!--[^]*?-->\s*)*/i, "")
    .replace(/^<!doctype\s+svg\b[^>]*>\s*/i, "");
  return /^<svg(?:\s|>)/i.test(prefix);
}

export function matchesFileSignature(bytes: Uint8Array, mimeType: string) {
  switch (mimeType) {
    case "image/png":
      return bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/jpeg":
      return bytesStartWith(bytes, [0xff, 0xd8, 0xff]);
    case "image/webp":
      return bytesStartWith(bytes, [0x52, 0x49, 0x46, 0x46]) && bytesStartWith(bytes, [0x57, 0x45, 0x42, 0x50], 8);
    case "image/avif":
      return bytesStartWith(bytes, [0x66, 0x74, 0x79, 0x70], 4) && ["avif", "avis"].includes(new TextDecoder().decode(bytes.slice(8, 12)));
    case "image/svg+xml":
      return looksLikeSvg(bytes);
    case "image/gif":
      return bytesStartWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61])
        || bytesStartWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    case "image/bmp":
      return bytesStartWith(bytes, [0x42, 0x4d]);
    case "image/tiff":
      return bytesStartWith(bytes, [0x49, 0x49, 0x2a, 0x00])
        || bytesStartWith(bytes, [0x4d, 0x4d, 0x00, 0x2a]);
    case "image/vnd.microsoft.icon":
    case "image/x-icon":
      return bytesStartWith(bytes, [0x00, 0x00, 0x01, 0x00]);
    default:
      return false;
  }
}

export function detectImageMimeType(bytes: Uint8Array) {
  for (const mimeType of [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/avif",
    "image/svg+xml",
    "image/gif",
    "image/bmp",
    "image/tiff",
    "image/vnd.microsoft.icon",
  ] as const) {
    if (matchesFileSignature(bytes, mimeType)) return mimeType;
  }
  return null;
}

export function safeFileName(name: string) {
  const normalized = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return normalized || "asset";
}

export function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function blockedRemoteHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "localhost" || normalized.endsWith(".localhost") || normalized.endsWith(".local") || normalized.includes(":")) return true;
  const octets = normalized.split(".").map(Number);
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return false;
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168);
}

export function parseRemoteImageUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:"
      || !hostname
      || url.username
      || url.password
      || blockedRemoteHostname(hostname)
    ) return null;
    return url;
  } catch {
    return null;
  }
}

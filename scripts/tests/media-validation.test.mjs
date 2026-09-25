import assert from "node:assert/strict";
import test from "node:test";
import { inflateSync } from "node:zlib";

import {
  matchesFileSignature as matchesLocalFileSignature,
  parseRemoteImageUrl as parseLocalRemoteImageUrl,
} from "../lib/local-media.mjs";
import {
  detectImageMimeType,
  matchesFileSignature as matchesWorkerFileSignature,
  parseRemoteImageUrl as parseWorkerRemoteImageUrl,
} from "../../src/lib/media/media-validation.ts";
import { normalizeIcoSource } from "../../src/lib/media/ico.ts";

test("Worker detects a supported image when the server declares the wrong MIME type", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  assert.equal(detectImageMimeType(jpeg), "image/jpeg");
  assert.equal(matchesWorkerFileSignature(jpeg, "image/png"), false);
});

const parsers = [
  ["Worker", parseWorkerRemoteImageUrl],
  ["local sync", parseLocalRemoteImageUrl],
];

for (const [name, parseRemoteImageUrl] of parsers) {
  test(`${name} accepts public HTTPS image hosts without an allowlist`, () => {
    assert.equal(
      parseRemoteImageUrl("https://new-app.example/assets/icon.png")?.toString(),
      "https://new-app.example/assets/icon.png",
    );
  });

  test(`${name} rejects unsafe image destinations`, () => {
    for (const value of [
      "http://example.com/icon.png",
      "https://user:password@example.com/icon.png",
      "https://localhost/icon.png",
      "https://app.local/icon.png",
      "https://127.0.0.1/icon.png",
      "https://10.0.0.1/icon.png",
      "https://169.254.169.254/icon.png",
      "https://192.168.1.2/icon.png",
      "https://[::1]/icon.png",
    ]) {
      assert.equal(parseRemoteImageUrl(value), null, value);
    }
  });
}

for (const [name, matchesFileSignature] of [
  ["Worker", matchesWorkerFileSignature],
  ["local sync", matchesLocalFileSignature],
]) {
  test(`${name} accepts ICO signatures for common MIME types`, () => {
    const ico = new Uint8Array([0x00, 0x00, 0x01, 0x00, 0x01, 0x00]);
    assert.equal(matchesFileSignature(ico, "image/vnd.microsoft.icon"), true);
    assert.equal(matchesFileSignature(ico, "image/x-icon"), true);
  });

  test(`${name} rejects cursor and malformed files declared as ICO`, () => {
    const cursor = new Uint8Array([0x00, 0x00, 0x02, 0x00, 0x01, 0x00]);
    assert.equal(matchesFileSignature(cursor, "image/vnd.microsoft.icon"), false);
    assert.equal(matchesFileSignature(new Uint8Array([0x00, 0x00]), "image/x-icon"), false);
  });
}

test("Worker converts a BMP-backed ICO without browser canvas APIs", async () => {
  const ico = new Uint8Array(70);
  const view = new DataView(ico.buffer);
  view.setUint16(2, 1, true); // ICO type
  view.setUint16(4, 1, true); // one frame
  ico[6] = 1;
  ico[7] = 1;
  view.setUint16(12, 32, true); // bits per pixel
  view.setUint32(14, 48, true); // BMP header, pixel, and mask
  view.setUint32(18, 22, true); // frame offset
  view.setUint32(22, 40, true); // BMP header size
  view.setUint32(26, 1, true); // width
  view.setUint32(30, 2, true); // height includes transparency mask
  view.setUint16(34, 1, true); // planes
  view.setUint16(36, 32, true); // bits per pixel
  ico.set([0x11, 0x22, 0x33, 0xff], 62); // BGRA pixel

  const result = await normalizeIcoSource({ bytes: ico, mimeType: "image/x-icon", fileName: "app.ico" });
  assert.equal(result.mimeType, "image/png");
  assert.equal(result.fileName, "app.png");
  assert.deepEqual([...result.bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const png = new DataView(result.bytes.buffer, result.bytes.byteOffset, result.bytes.byteLength);
  const idatLength = png.getUint32(33);
  const scanline = inflateSync(result.bytes.subarray(41, 41 + idatLength));
  assert.deepEqual([...scanline], [0, 0x33, 0x22, 0x11, 0xff]);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  matchesFileSignature as matchesLocalFileSignature,
  parseRemoteImageUrl as parseLocalRemoteImageUrl,
} from "../lib/local-media.mjs";
import {
  detectImageMimeType,
  matchesFileSignature as matchesWorkerFileSignature,
  parseRemoteImageUrl as parseWorkerRemoteImageUrl,
} from "../../src/lib/media/media-validation.ts";

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

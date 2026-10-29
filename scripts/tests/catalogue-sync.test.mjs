import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { sendSyncItem } from "../lib/catalogue-sync-client.mjs";
import { handleCatalogueSync } from "../../src/lib/catalogue/catalogue-sync-handler.ts";

const secret = "regression-test-secret";
const config = { endpoint: "https://example.com/sync", secret, repository: "Beingpax/macify", commitSha: "a".repeat(40) };
const item = { changeType: "upsert", path: "catalog/apps/ardia.json", manifest: JSON.parse(readFileSync(new URL("../../catalog/apps/ardia.json", import.meta.url))) };
const ack = (entry = item) => ({ ok: true, results: [{ path: entry.path, result: { ok: true, revisionId: "revision" } }] });
const options = { sleep: async () => {}, log: () => {} };
const response = (status, body, headers) => new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers });
function request(body, signature) {
  return new Request(config.endpoint, { method: "POST", headers: { "x-macify-signature": signature ?? createHmac("sha256", secret).update(body).digest("hex") }, body });
}
function dependencies(ingest = async () => ({ ok: true })) {
  return { secret, repository: config.repository, ingest, reportError() {} };
}

for (const status of [408, 425, 429, 500, 502, 503, 504, 530]) {
  test(`recovers from HTTP ${status} with identical signed request`, async () => {
    const sent = [];
    const result = await sendSyncItem(item, config, { ...options, fetchImpl: async (_, init) => {
      sent.push(init);
      return sent.length === 1 ? response(status, "<html>Worker threw exception 1101</html>") : response(200, ack());
    } });
    assert.equal(result.ok, true);
    assert.equal(sent.length, 2);
    assert.equal(sent[0].body, sent[1].body);
    assert.equal(sent[0].headers["x-macify-signature"], sent[1].headers["x-macify-signature"]);
  });
}
for (const status of [400, 401, 403, 413, 422]) {
  test(`does not retry permanent HTTP ${status}`, async () => {
    let calls = 0;
    await assert.rejects(sendSyncItem(item, config, { ...options, fetchImpl: async () => { calls++; return response(status, { error: "invalid" }); } }), (error) => error.retryable === false);
    assert.equal(calls, 1);
  });
}
test("retries stale deployment schema and network errors", async () => {
  let calls = 0;
  await sendSyncItem(item, config, { ...options, fetchImpl: async () => {
    calls++;
    if (calls === 1) throw new TypeError("fetch failed");
    return calls === 2 ? response(422, { error: 'Manifest validation failed: Unrecognized keys isFeatured' }) : response(200, ack());
  } });
  assert.equal(calls, 3);
});
test("persistent outage stops at retry budget", async () => {
  let calls = 0;
  await assert.rejects(sendSyncItem(item, config, { ...options, maxAttempts: 3, fetchImpl: async () => { calls++; return response(503, {}); } }), (error) => error.retryable);
  assert.equal(calls, 3);
});
test("honors bounded Retry-After", async () => {
  const delays = []; let calls = 0;
  await sendSyncItem(item, config, { ...options, sleep: async (ms) => delays.push(ms), fetchImpl: async () => ++calls === 1 ? response(429, {}, { "retry-after": "15" }) : response(200, ack()) });
  assert.deepEqual(delays, [15000]);
});
for (const body of ["<html>login</html>", { ok: true }, { ok: true, results: [{ path: "wrong", result: { ok: true } }] }, { ok: false, results: [] }]) {
  test(`rejects invalid success acknowledgement ${JSON.stringify(body)}`, async () => {
    await assert.rejects(sendSyncItem(item, config, { ...options, maxAttempts: 1, fetchImpl: async () => response(200, body) }));
  });
}
test("oversized server responses cannot pass as success", async () => {
  await assert.rejects(sendSyncItem(item, config, { ...options, maxAttempts: 1, fetchImpl: async () => response(200, "x".repeat(64001)) }), /64 KB/);
});
test("rejects invalid signatures before ingestion", async () => {
  const body = JSON.stringify({ ...config, items: [item] });
  const res = await handleCatalogueSync(request(body, "0".repeat(64)), dependencies(() => assert.fail("must not ingest")));
  assert.equal(res.status, 401);
});
for (const [name, body, status] of [
  ["malformed JSON", "{", 400],
  ["wrong repository", JSON.stringify({ repository: "Other/repo", commitSha: config.commitSha, items: [item] }), 403],
  ["multiple items", JSON.stringify({ repository: config.repository, commitSha: config.commitSha, items: [item, item] }), 400],
  ["oversized body", "x".repeat(1000001), 413],
]) {
  test(`rejects ${name}`, async () => {
    assert.equal((await handleCatalogueSync(request(body), dependencies(() => assert.fail("must not ingest")))).status, status);
  });
}
test("ingestion exceptions become retryable JSON with diagnostic ID", async () => {
  let diagnostic;
  const body = JSON.stringify({ repository: config.repository, commitSha: config.commitSha, items: [item] });
  const res = await handleCatalogueSync(request(body), { ...dependencies(async () => { throw Error("private database detail"); }), reportError: (id) => { diagnostic = id; } });
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("retry-after"), "15");
  const payload = await res.json();
  assert.equal(payload.requestId, diagnostic);
  assert.doesNotMatch(JSON.stringify(payload), /private database detail/);
});
test("manifest failures remain actionable 422 responses", async () => {
  const body = JSON.stringify({ repository: config.repository, commitSha: config.commitSha, items: [item] });
  const res = await handleCatalogueSync(request(body), dependencies(async () => ({ ok: false, error: "Invalid artwork", revisionId: "failed-revision" })));
  assert.equal(res.status, 422);
  assert.equal((await res.json()).results[0].result.revisionId, "failed-revision");
});
test("real HTTP: both browser manifests survive Worker outage and lost acknowledgement", async () => {
  const revisions = new Map(); let outage = true; let lostAck = true;
  const server = createServer(async (req, res) => {
    let body = ""; for await (const chunk of req) body += chunk;
    if (outage) { outage = false; res.writeHead(500); res.end("Worker threw exception 1101"); return; }
    const result = await handleCatalogueSync(request(body, req.headers["x-macify-signature"]), dependencies(async (entry, source) => {
      const key = source.commitSha + entry.path;
      if (revisions.has(key)) return { ok: true, duplicate: true, revisionId: revisions.get(key) };
      revisions.set(key, "revision-" + revisions.size);
      return { ok: true, revisionId: revisions.get(key) };
    }));
    if (lostAck) { lostAck = false; res.destroy(); return; }
    res.writeHead(result.status, Object.fromEntries(result.headers)); res.end(await result.text());
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  try {
    for (const slug of ["ardia", "yet-another-browser"]) {
      const entry = { ...item, path: `catalog/apps/${slug}.json`, manifest: JSON.parse(readFileSync(new URL(`../../catalog/apps/${slug}.json`, import.meta.url))) };
      const payload = await sendSyncItem(entry, { ...config, endpoint: `http://127.0.0.1:${server.address().port}/sync` }, options);
      assert.equal(payload.ok, true);
    }
    assert.equal(revisions.size, 2);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
test("real HTTP: a hung response body times out and retries", async () => {
  let calls = 0;
  const server = createServer((req, res) => {
    calls++;
    res.writeHead(200, { "content-type": "application/json" });
    if (calls === 1) { res.write('{"ok":'); return; }
    res.end(JSON.stringify(ack()));
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  try {
    const payload = await sendSyncItem(item, { ...config, endpoint: `http://127.0.0.1:${server.address().port}/sync` }, { ...options, timeoutMs: 200 });
    assert.equal(payload.ok, true);
    assert.equal(calls, 2);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
test("declared oversized requests are rejected before their bodies are read", async () => {
  const req = request("{}"); req.headers.set("content-length", "1000001");
  assert.equal((await handleCatalogueSync(req, dependencies(() => assert.fail("must not ingest")))).status, 413);
});
test("missing sync configuration is a service error", async () => {
  assert.equal((await handleCatalogueSync(request("{}"), { ingest: () => assert.fail("must not ingest") })).status, 503);
});

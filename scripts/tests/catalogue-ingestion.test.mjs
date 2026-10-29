import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/d1";

// Exercise the production ingestion code and SQL against the real schema.
// Only the request context and external image/storage services are substituted.
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/db/client") return { url: "data:text/javascript,export async function getDatabase(){return globalThis.catalogueRegressionDatabase}", shortCircuit: true };
  if (specifier.startsWith("@/")) return next(new URL(`../../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
  return next(specifier, context);
} });
const { ingestCatalogueItem } = await import("../../src/lib/catalogue/catalogue-ingestion.ts");
function fixture() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../../database/schema.sql", import.meta.url), "utf8"));
  const adapter = {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      let params = [];
      return {
        bind(...values) { params = values; return this; },
        async raw() { statement.setReturnArrays(true); return statement.all(...params); },
        async all() { return { results: statement.all(...params), success: true }; },
        async run() { statement.run(...params); return { results: [], success: true }; },
      };
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.all());
        sqlite.exec("COMMIT"); return results;
      } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  globalThis.catalogueRegressionDatabase = drizzle(adapter);
  const stored = new Map();
  const env = { MEDIA: {
    async put(key, bytes) { stored.set(key, bytes); },
    async delete(keys) { for (const key of keys) stored.delete(key); },
  } };
  return { sqlite, stored, env };
}
const source = { repository: "Beingpax/macify", commitSha: "b".repeat(40) };
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=", "base64");
for (const slug of ["ardia", "yet-another-browser"]) {
  test(`${slug}: real ingestion creates pending review and replay is idempotent`, async (t) => {
    const { sqlite, stored, env } = fixture();
    t.after(() => sqlite.close());
    t.mock.method(globalThis, "fetch", async () => new Response(png, { headers: { "content-type": "image/png" } }));
    const item = { changeType: "upsert", path: `catalog/apps/${slug}.json`, manifest: JSON.parse(readFileSync(new URL(`../../catalog/apps/${slug}.json`, import.meta.url))) };
    const first = await ingestCatalogueItem(item, source, env);
    assert.equal(first.ok, true);
    const revision = sqlite.prepare("SELECT * FROM catalogue_revisions").get();
    assert.equal(revision.status, "pending");
    assert.equal(revision.app_slug, slug);
    assert.equal(JSON.parse(revision.prepared_media).length, slug === "ardia" ? 4 : 2);
    const uploads = stored.size;
    const replay = await ingestCatalogueItem(item, source, env);
    assert.equal(replay.duplicate, true);
    assert.equal(replay.revisionId, first.revisionId);
    assert.equal(sqlite.prepare("SELECT count(*) AS count FROM catalogue_revisions").get().count, 1);
    assert.equal(stored.size, uploads);
    // A later full reconciliation must not queue another unchanged revision.
    assert.equal((await ingestCatalogueItem(item, { ...source, commitSha: "c".repeat(40) }, env)).ignored, true);
  });
}
test("image failure is recorded, partial uploads cleaned, same-commit retry recovers", async (t) => {
  const { sqlite, stored, env } = fixture(); t.after(() => sqlite.close());
  let downloads = 0; let fail = true;
  t.mock.method(globalThis, "fetch", async () => {
    downloads++;
    return fail && downloads === 2 ? new Response("unavailable", { status: 503 }) : new Response(png, { headers: { "content-type": "image/png" } });
  });
  const item = { changeType: "upsert", path: "catalog/apps/ardia.json", manifest: JSON.parse(readFileSync(new URL("../../catalog/apps/ardia.json", import.meta.url))) };
  const failed = await ingestCatalogueItem(item, source, env);
  assert.equal(failed.ok, false);
  assert.equal(sqlite.prepare("SELECT status FROM catalogue_revisions").get().status, "failed");
  assert.equal(stored.size, 0);
  fail = false;
  const recovered = await ingestCatalogueItem(item, source, env);
  assert.equal(recovered.ok, true);
  assert.equal(recovered.revisionId, failed.revisionId);
  assert.equal(sqlite.prepare("SELECT status FROM catalogue_revisions").get().status, "pending");
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM catalogue_revisions").get().count, 1);
});

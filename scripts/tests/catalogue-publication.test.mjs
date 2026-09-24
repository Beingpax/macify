import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { publicationStatus } from "../../src/lib/catalogue/catalogue-publication-guard.ts";

for (const state of ["pending", "rejected", "published", "superseded"]) {
  test(`publication batch ${state === "pending" ? "commits" : "rolls back"} for a ${state} revision`, () => {
    const db = fixture(state);
    const guard = new SQLiteSyncDialect().sqlToQuery(publicationStatus("r1", "catalog/apps/app.json", new Date(1000)));
    db.exec("BEGIN; UPDATE apps SET name = 'new'");
    try {
      db.prepare(`UPDATE catalogue_revisions SET status = ${guard.sql} WHERE id = 'r1'`).run(...guard.params);
      db.exec("COMMIT");
      assert.equal(state, "pending");
    } catch (error) {
      db.exec("ROLLBACK");
      assert.notEqual(state, "pending");
      assert.match(error.message, /NOT NULL/);
    }
    assert.equal(db.prepare("SELECT name FROM apps").get().name, state === "pending" ? "new" : "old");
    db.close();
  });
}
for (const timestamp of [1000, 1001]) {
  test(`a newer sync at ${timestamp} prevents stale publication`, () => {
    const db = fixture("pending");
    db.prepare("INSERT INTO catalogue_revisions VALUES ('r2', 'catalog/apps/app.json', ?, 'failed')").run(timestamp);
    const guard = new SQLiteSyncDialect().sqlToQuery(publicationStatus("r1", "catalog/apps/app.json", new Date(1000)));
    assert.throws(() => db.prepare(`UPDATE catalogue_revisions SET status = ${guard.sql} WHERE id = 'r1'`).run(...guard.params), /NOT NULL/);
    assert.equal(db.prepare("SELECT status FROM catalogue_revisions WHERE id = 'r1'").get().status, "pending");
    db.close();
  });
}
function fixture(status) {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE apps (name TEXT); INSERT INTO apps VALUES ('old'); CREATE TABLE catalogue_revisions (id TEXT PRIMARY KEY, source_path TEXT NOT NULL, created_at INTEGER NOT NULL, status TEXT NOT NULL)");
  db.prepare("INSERT INTO catalogue_revisions VALUES ('r1', 'catalog/apps/app.json', 1000, ?)").run(status);
  return db;
}

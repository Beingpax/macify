#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseLocalOptions } from "./lib/local-options.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const target = args.shift();
if (!["--local", "--production"].includes(target)) {
  throw new Error("Choose --local or --production explicitly.");
}

if (target === "--production" && args.length) throw new Error("Production initialization does not accept local options.");
const { persistenceArguments } = parseLocalOptions(args);

const scope = target === "--production"
  ? ["--remote", "--env", "production"]
  : ["--local", ...persistenceArguments];
const wrangler = path.join(root, "node_modules", ".bin", "wrangler");

function run(command, capture = false) {
  return execFileSync(wrangler, command, {
    cwd: root,
    env: { ...process.env, CI: "true", NO_D1_WARNING: "true" },
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
    encoding: "utf8",
  });
}

function query(sql) {
  const results = JSON.parse(run(["d1", "execute", "DB", ...scope, "--command", sql, "--json"], true));
  if (!Array.isArray(results) || results.some((result) => !result.success || !Array.isArray(result.results))) {
    throw new Error("Could not inspect the database.");
  }
  return results.flatMap((result) => result.results);
}

function ensureCacheMetadata() {
  run([
    "d1", "execute", "NEXT_TAG_CACHE_D1", ...scope,
    "--command",
    "CREATE TABLE IF NOT EXISTS revalidations (tag TEXT NOT NULL, revalidatedAt INTEGER NOT NULL, stale INTEGER, expire INTEGER DEFAULT NULL, UNIQUE(tag) ON CONFLICT REPLACE)",
  ]);
}

const expectedTables = [
  "admin_login_attempts",
  "app_categories",
  "app_relationships",
  "apps",
  "catalogue_revisions",
  "categories",
  "deals",
  "media_assets",
];
const tables = query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'd1_%' ORDER BY name").map(({ name }) => name);

if (tables.length === 0) {
  run(["d1", "execute", "DB", ...scope, "--file", path.join(root, "database", "schema.sql")]);
  ensureCacheMetadata();
  console.log(`Initialized the ${target === "--production" ? "production" : "local"} database from database/schema.sql.`);
  process.exit(0);
}

const missingTables = expectedTables.filter((table) => !tables.includes(table));
const appColumns = new Set(query("SELECT name FROM pragma_table_info('apps')").map(({ name }) => name));
if (missingTables.length || !appColumns.has("is_editors_pick")) {
  const problems = [
    missingTables.length ? `missing tables: ${missingTables.join(", ")}` : null,
    !appColumns.has("is_editors_pick") ? "missing apps.is_editors_pick" : null,
  ].filter(Boolean).join("; ");
  throw new Error(`Database is partially initialized (${problems}). Refusing to apply the fresh-database schema over existing data.`);
}

ensureCacheMetadata();
console.log(`The ${target === "--production" ? "production" : "local"} database is already initialized; no schema changes were made.`);

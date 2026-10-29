#!/usr/bin/env node

import { sendSyncItem } from "./lib/catalogue-sync-client.mjs";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";

const [baseSha, commitSha] = process.argv.slice(2);
const endpoint = process.env.CATALOG_SYNC_URL;
const secret = process.env.CATALOG_SYNC_SECRET;
const repository = process.env.GITHUB_REPOSITORY;
if (!baseSha || !commitSha || !endpoint || !secret || !repository) {
  throw new Error("Usage: sync-catalogue-changes.mjs <base-sha> <commit-sha> with CATALOG_SYNC_URL, CATALOG_SYNC_SECRET, and GITHUB_REPOSITORY set.");
}

const changes = execFileSync("git", ["diff", "--name-status", "--find-renames", baseSha, commitSha, "--", "catalog/apps", "catalog/deals"], { encoding: "utf8" })
  .trim().split("\n").filter(Boolean);
const deletedPaths = new Set();
for (const line of changes) {
  const [status, ...paths] = line.split("\t");
  if (status.startsWith("D") && paths[0]?.endsWith(".json")) deletedPaths.add(paths[0]);
  if (status.startsWith("R") && paths[0]?.endsWith(".json")) deletedPaths.add(paths[0]);
}

const manifestPaths = [];
for (const directory of ["catalog/apps", "catalog/deals"]) {
  const files = await readdir(directory, { withFileTypes: true });
  for (const file of files) {
    if (file.isFile() && file.name.endsWith(".json")) manifestPaths.push(`${directory}/${file.name}`);
  }
}
manifestPaths.sort();

const items = [
  ...[...deletedPaths].sort().map((path) => ({ changeType: "delete", path })),
  ...manifestPaths.map((path) => ({ changeType: "upsert", path })),
];

let failed = 0;
let succeeded = 0;
for (const item of items) {
  try {
    let syncItem = item;
    if (item.changeType === "upsert") {
      try {
        syncItem = { ...item, manifest: JSON.parse(await readFile(item.path, "utf8")) };
      } catch (error) {
        syncItem = {
          ...item,
          manifest: null,
          sourceError: `JSON parsing failed: ${error instanceof Error ? error.message : "Invalid JSON."}`,
        };
      }
    }
    const payload = await sendSyncItem(syncItem, { endpoint, secret, repository, commitSha });
    succeeded += 1;
    const result = payload.results?.[0]?.result;
    if (result?.ignored) console.log(`Checked ${item.path}: ${result.reason}`);
    else if (result?.duplicate) console.log(`Checked ${item.path}: revision already recorded.`);
    else console.log(`Queued ${item.path} for editorial review.`);
  } catch (error) {
    failed += 1;
    console.error(`${item.path}: ${error instanceof Error ? error.message : "Catalogue synchronization failed."}`);
    if (error?.retryable) {
      console.error("Catalogue endpoint is unavailable after retries; stopping reconciliation. Rerun this workflow to resume safely.");
      process.exitCode = 1;
      break;
    }
  }
}

if (failed > 0) {
  console.error(`Catalogue synchronization completed with ${failed} failure(s) and ${succeeded} success(es), and ${items.length - failed - succeeded} not attempted.`);
  process.exitCode = 1;
} else {
  console.log(`Catalogue reconciliation checked ${items.length} manifest(s).`);
}

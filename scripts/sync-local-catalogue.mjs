#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MAX_APPLICATION_MEDIA_BYTES, prepareLocalMedia } from "./lib/local-media.mjs";
import { parseLocalOptions } from "./lib/local-options.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogueDirectory = path.join(root, "catalog", "apps");
const dealsDirectory = path.join(root, "catalog", "deals");
const wrangler = path.join(root, "node_modules", ".bin", "wrangler");
const wranglerConfigPath = path.join(root, "wrangler.jsonc");
const now = Date.now();

const { fast, persistPath, persistenceArguments } = parseLocalOptions(process.argv.slice(2), { allowFast: true });
const backupDirectory = path.join(persistPath ?? path.join(root, ".wrangler"), "backups");
const backupPath = path.join(backupDirectory, `catalogue-local-before-sync.${persistPath ? "sqlite" : "sql"}`);
const wranglerConfig = JSON.parse(readFileSync(wranglerConfigPath, "utf8"));
const localMediaBucket = wranglerConfig.r2_buckets?.find(({ binding }) => binding === "MEDIA")?.bucket_name;
const productionMediaBucket = wranglerConfig.env?.production?.r2_buckets?.find(({ binding }) => binding === "MEDIA")?.bucket_name;
if (wranglerConfig.vars?.APP_ENV !== "local" || !localMediaBucket || localMediaBucket === productionMediaBucket) {
  throw new Error("Local catalogue synchronization requires a distinct local MEDIA bucket.");
}

function runWrangler(arguments_, options = {}) {
  return execFileSync(wrangler, arguments_, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NO_D1_WARNING: "true" },
    ...options,
  });
}

function query(sql) {
  const payload = JSON.parse(runWrangler([
    "d1", "execute", "DB", "--local", ...persistenceArguments, "--command", sql, "--json",
  ]));
  const result = payload[0];
  if (!result?.success || !Array.isArray(result.results)) throw new Error("Local D1 query failed.");
  return result.results;
}

function sql(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function stableId(prefix, value) {
  return `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}

function categoryName(slug, existingNames) {
  const existing = existingNames.get(slug);
  if (existing) return existing;
  if (slug === "ai") return "AI";
  return slug.split("-").map((word, index) => index === 0
    ? `${word.charAt(0).toUpperCase()}${word.slice(1)}`
    : word).join(" ");
}

function manifestMedia(manifest) {
  return [
    { role: "icon", ...manifest.media.icon },
    { role: "preview_image", ...manifest.media.preview },
    ...manifest.media.screenshots.map((item) => ({ role: "screenshot", ...item })),
  ];
}

function localObjectPath(storageKey) {
  return `${localMediaBucket}/${storageKey}`;
}

function localObjectMatches(asset, temporaryDirectory) {
  if (fast) return true;
  const outputPath = path.join(temporaryDirectory, `verify-${stableId("asset", asset.storageKey)}.bin`);
  try {
    runWrangler([
      "r2", "object", "get", localObjectPath(asset.storageKey), "--local", ...persistenceArguments,
      "--file", outputPath,
    ], { stdio: "ignore" });
    return createHash("sha256").update(readFileSync(outputPath)).digest("hex") === asset.checksum;
  } catch {
    return false;
  } finally {
    rmSync(outputPath, { force: true });
  }
}

function putLocalObject(asset, temporaryDirectory) {
  const inputPath = path.join(temporaryDirectory, `upload-${stableId("asset", asset.storageKey)}.bin`);
  writeFileSync(inputPath, asset.bytes);
  try {
    runWrangler([
      "r2", "object", "put", localObjectPath(asset.storageKey), "--local", ...persistenceArguments,
      "--file", inputPath,
      "--content-type", asset.mimeType,
      "--content-disposition", "inline",
      "--cache-control", "public, max-age=31536000, immutable",
      "--force",
    ], { stdio: "ignore" });
  } finally {
    rmSync(inputPath, { force: true });
  }
}

function deleteLocalObject(storageKey) {
  try {
    runWrangler([
      "r2", "object", "delete", localObjectPath(storageKey), "--local", ...persistenceArguments, "--force",
    ], { stdio: "ignore" });
  } catch {
    // A missing local object already has the intended result.
  }
}

function applySql(statements, temporaryDirectory, fileName) {
  const sqlPath = path.join(temporaryDirectory, fileName);
  writeFileSync(sqlPath, `${statements.join("\n")}\n`);
  runWrangler(["d1", "execute", "DB", "--local", ...persistenceArguments, "--file", sqlPath, "--yes"]);
}

function findLocalDatabaseFile(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = findLocalDatabaseFile(entryPath);
      if (nested) return nested;
    } else if (entry.name.endsWith(".sqlite")) return entryPath;
  }
  return null;
}

execFileSync(process.execPath, [path.join(root, "scripts", "validate-catalogue.mjs")], {
  cwd: root,
  stdio: "inherit",
});

const manifests = readdirSync(catalogueDirectory)
  .filter((file) => file.endsWith(".json"))
  .sort()
  .map((file) => JSON.parse(readFileSync(path.join(catalogueDirectory, file), "utf8")));
const dealManifests = readdirSync(dealsDirectory)
  .filter((file) => file.endsWith(".json"))
  .sort()
  .map((file) => JSON.parse(readFileSync(path.join(dealsDirectory, file), "utf8")));
const existingApps = query("SELECT id, slug FROM apps");
const appIds = new Map(existingApps.map(({ id, slug }) => [slug, id]));
for (const manifest of manifests) {
  if (!appIds.has(manifest.slug)) appIds.set(manifest.slug, stableId("local-app", manifest.slug));
}

const existingCategories = query("SELECT slug, name FROM categories");
const categoryNames = new Map(existingCategories.map(({ slug, name }) => [slug, name]));
const statements = ["PRAGMA foreign_keys = ON;"];

for (const manifest of manifests) {
  const appId = appIds.get(manifest.slug);
  statements.push(`INSERT INTO apps (
    id, slug, name, website_url, tagline, description, pricing_type, billing_type,
    pricing_details, source_type, youtube_url, status, is_featured, is_editors_pick, featured_at, published_at,
    created_at, updated_at, deleted_at
  ) VALUES (
    ${sql(appId)}, ${sql(manifest.slug)}, ${sql(manifest.name)}, ${sql(manifest.websiteUrl)},
    ${sql(manifest.tagline)}, ${sql(manifest.description)}, ${sql(manifest.pricingType)},
    ${sql(manifest.billingType)}, ${sql(manifest.pricingDetails)}, ${sql(manifest.sourceType)},
    ${sql(manifest.youtubeUrl)}, 'published', ${sql(manifest.isFeatured ? 1 : 0)},
    ${sql(manifest.isEditorsPick ? 1 : 0)}, ${manifest.isFeatured ? now : "NULL"}, ${now}, ${now}, ${now}, NULL
  ) ON CONFLICT(slug) DO UPDATE SET
    name = excluded.name,
    website_url = excluded.website_url,
    tagline = excluded.tagline,
    description = excluded.description,
    pricing_type = excluded.pricing_type,
    billing_type = excluded.billing_type,
    pricing_details = excluded.pricing_details,
    source_type = excluded.source_type,
    youtube_url = excluded.youtube_url,
    status = 'published',
    deleted_at = NULL,
    published_at = coalesce(apps.published_at, excluded.published_at),
    updated_at = excluded.updated_at;`);
}

statements.push("DELETE FROM deals;");
for (const deal of dealManifests) {
  const appId = appIds.get(deal.appSlug);
  statements.push(`INSERT INTO deals (
    id, app_id, discount_percent, code, url, starts_at, ends_at, created_at, updated_at
  ) VALUES (
    ${sql(stableId("local-deal", deal.appSlug))}, ${sql(appId)}, ${deal.discountPercent},
    ${sql(deal.code)}, ${sql(deal.url)}, ${Date.parse(deal.startsAt)}, ${Date.parse(deal.endsAt)}, ${now}, ${now}
  );`);
}

const manifestSlugs = manifests.map(({ slug }) => slug);
statements.push(`UPDATE apps SET status = 'archived', updated_at = ${now}
  WHERE status = 'published' AND deleted_at IS NULL AND slug NOT IN (${manifestSlugs.map(sql).join(", ")});`);

const allCategories = [...new Set(manifests.flatMap(({ categories }) => categories))].sort();
for (const slug of allCategories) {
  statements.push(`INSERT INTO categories (id, slug, name, created_at)
    VALUES (${sql(`category-${slug}`)}, ${sql(slug)}, ${sql(categoryName(slug, categoryNames))}, ${now})
    ON CONFLICT(slug) DO UPDATE SET name = excluded.name;`);
}

const manifestAppIds = manifests.map(({ slug }) => appIds.get(slug));
for (const appId of manifestAppIds) {
  statements.push(`DELETE FROM app_categories WHERE app_id = ${sql(appId)};`);
}
for (const manifest of manifests) {
  const appId = appIds.get(manifest.slug);
  for (const categorySlug of manifest.categories) {
    statements.push(`INSERT INTO app_categories (app_id, category_id)
      SELECT ${sql(appId)}, id FROM categories WHERE slug = ${sql(categorySlug)};`);
  }
}

const manifestIdList = manifestAppIds.map(sql).join(", ");
statements.push(`DELETE FROM app_relationships
  WHERE source_app_id IN (${manifestIdList}) OR target_app_id IN (${manifestIdList});`);

const relationshipPairs = new Set();
for (const manifest of manifests) {
  for (const relatedSlug of manifest.relatedAppSlugs) {
    const pair = [appIds.get(manifest.slug), appIds.get(relatedSlug)].sort();
    relationshipPairs.add(pair.join(":"));
  }
}
for (const pair of [...relationshipPairs].sort()) {
  const [sourceAppId, targetAppId] = pair.split(":");
  statements.push(`INSERT INTO app_relationships (id, source_app_id, target_app_id, created_at)
    VALUES (${sql(stableId("local-relation", pair))}, ${sql(sourceAppId)}, ${sql(targetAppId)}, ${now});`);
}

mkdirSync(backupDirectory, { recursive: true });
rmSync(backupPath, { force: true });
if (persistPath) {
  const databasePath = findLocalDatabaseFile(persistPath);
  if (!databasePath) throw new Error("The local D1 database file could not be located for backup.");
  copyFileSync(databasePath, backupPath);
} else {
  runWrangler([
    "d1", "export", "DB", "--local",
    "--output", backupPath, "--skip-confirmation",
  ]);
}

const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "macify-catalogue-"));
let reusedMedia = 0;
let storedMedia = 0;
let removedMedia = 0;
try {
  applySql(statements, temporaryDirectory, "sync.sql");

  const existingMedia = query(`SELECT
    id, app_id, role, storage_key, mime_type, byte_size, width, height,
    checksum, source_url, alt_text, created_at
    FROM media_assets WHERE app_id IN (${manifestIdList})`);
  const existingByApp = new Map();
  for (const asset of existingMedia) {
    const appMedia = existingByApp.get(asset.app_id) ?? [];
    appMedia.push(asset);
    existingByApp.set(asset.app_id, appMedia);
  }

  const desiredMedia = [];
  const newlyStoredKeys = [];
  try {
    for (const manifest of manifests) {
      const appId = appIds.get(manifest.slug);
      const existing = existingByApp.get(appId) ?? [];
      const reusable = new Map(existing.map((asset) => [`${asset.role}:${asset.source_url ?? ""}`, asset]));
      const desiredForApp = [];
      const missing = [];

      for (const [index, source] of manifestMedia(manifest).entries()) {
        const prior = reusable.get(`${source.role}:${source.sourceUrl}`);
        if (prior && localObjectMatches({ storageKey: prior.storage_key, checksum: prior.checksum }, temporaryDirectory)) {
          desiredForApp.push({
            id: prior.id,
            appId,
            role: prior.role,
            storageKey: prior.storage_key,
            mimeType: prior.mime_type,
            byteSize: Number(prior.byte_size),
            width: prior.width === null ? null : Number(prior.width),
            height: prior.height === null ? null : Number(prior.height),
            checksum: prior.checksum,
            sourceUrl: source.sourceUrl,
            altText: source.altText,
            createdAt: prior.created_at === null ? now + index : Number(prior.created_at),
          });
          reusedMedia += 1;
        } else {
          missing.push({ index, source });
        }
      }

      const preparedForApp = await Promise.all(missing.map(async ({ index, source }) => {
        try {
          return {
            ...await prepareLocalMedia(appId, source.role, source.sourceUrl, source.altText),
            appId,
            createdAt: now + index,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "The image could not be prepared.";
          throw new Error(`${manifest.slug} ${source.role}: ${message}`);
        }
      }));
      const combinedBytes = [...desiredForApp, ...preparedForApp]
        .reduce((total, asset) => total + asset.byteSize, 0);
      if (combinedBytes > MAX_APPLICATION_MEDIA_BYTES) {
        throw new Error(`${manifest.slug}: combined optimized media exceeds the 40 MB application limit.`);
      }

      for (const asset of preparedForApp) {
        putLocalObject(asset, temporaryDirectory);
        newlyStoredKeys.push(asset.storageKey);
        storedMedia += 1;
        const { bytes: discardedBytes, ...storedAsset } = asset;
        void discardedBytes;
        desiredForApp.push(storedAsset);
      }
      desiredForApp.sort((left, right) => left.createdAt - right.createdAt);
      desiredMedia.push(...desiredForApp);
    }

    const mediaStatements = [
      "PRAGMA foreign_keys = ON;",
      `DELETE FROM media_assets WHERE app_id IN (${manifestIdList});`,
    ];
    for (const asset of desiredMedia) {
      mediaStatements.push(`INSERT INTO media_assets (
        id, app_id, role, storage_key, mime_type, byte_size, width, height,
        checksum, source_url, alt_text, created_at
      ) VALUES (
        ${sql(asset.id)}, ${sql(asset.appId)}, ${sql(asset.role)}, ${sql(asset.storageKey)},
        ${sql(asset.mimeType)}, ${asset.byteSize}, ${sql(asset.width)}, ${sql(asset.height)},
        ${sql(asset.checksum)}, ${sql(asset.sourceUrl)}, ${sql(asset.altText)}, ${asset.createdAt}
      );`);
    }
    applySql(mediaStatements, temporaryDirectory, "media.sql");
  } catch (error) {
    for (const storageKey of newlyStoredKeys) deleteLocalObject(storageKey);
    throw error;
  }

  const desiredKeys = new Set(desiredMedia.map(({ storageKey }) => storageKey));
  for (const asset of existingMedia) {
    if (!desiredKeys.has(asset.storage_key)) {
      deleteLocalObject(asset.storage_key);
      removedMedia += 1;
    }
  }
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

const summary = query(`SELECT
  count(*) AS published,
  sum(instr(description, '## Privacy and requirements') > 0) AS with_privacy,
  sum(instr(description, '## Pricing') > 0) AS with_pricing
  FROM apps WHERE status = 'published' AND deleted_at IS NULL`)[0];
const dealSummary = query("SELECT count(*) AS count FROM deals")[0];
const mediaSummary = query(`SELECT count(*) AS count FROM media_assets
  WHERE app_id IN (${manifestIdList})`)[0];
const expectedMedia = manifests.reduce((total, manifest) => total + manifestMedia(manifest).length, 0);

if (Number(summary.published) !== manifests.length
  || Number(summary.with_privacy) !== manifests.length
  || Number(summary.with_pricing) !== manifests.length
  || Number(dealSummary.count) !== dealManifests.length
  || Number(mediaSummary.count) !== expectedMedia) {
  throw new Error(`Local catalogue verification failed: ${JSON.stringify({ summary, dealSummary, mediaSummary })}`);
}

console.log(`Synchronized ${manifests.length} applications and ${dealManifests.length} deals.`);
console.log(`Media: ${reusedMedia} reused, ${storedMedia} stored, ${removedMedia} removed from local R2.`);
console.log(`Backup: ${path.relative(root, backupPath)}`);

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appsDirectory = path.join(root, "catalog", "apps");
const dealsDirectory = path.join(root, "catalog", "deals");
const examplesDirectory = path.join(root, "catalog", "examples");
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const allowedPricing = new Set(["free", "freemium", "paid"]);
const allowedBilling = new Set(["one_time", "subscription"]);
const allowedSource = new Set(["open_source", "closed_source"]);
const requiredManifestKeys = ["$schema", "schemaVersion", "name", "slug", "websiteUrl", "tagline", "description", "pricingType", "billingType", "pricingDetails", "sourceType", "youtubeUrl", "categories", "media"];
const optionalManifestKeys = ["isFeatured", "isEditorsPick", "relatedAppSlugs"];

function isHttpUrl(value, httpsOnly = false) {
  if (typeof value !== "string" || value.length > 2_000) return false;
  try {
    const url = new URL(value);
    if (url.username || url.password) return false;
    if (httpsOnly ? url.protocol !== "https:" : !["http:", "https:"].includes(url.protocol)) return false;
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.includes(":")) return false;
    const octets = hostname.split(".").map(Number);
    if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
    const [a, b] = octets;
    return !(a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168));
  } catch {
    return false;
  }
}

function validateMedia(value, label, issues) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push(`${label} must be an object.`);
    return;
  }
  for (const key of Object.keys(value)) if (!["sourceUrl", "altText"].includes(key)) issues.push(`${label}.${key} is not allowed.`);
  if (!isHttpUrl(value.sourceUrl, true)) issues.push(`${label}.sourceUrl must be a public HTTPS URL.`);
  if (typeof value.altText !== "string" || value.altText.trim().length < 3 || value.altText.length > 300) {
    issues.push(`${label}.altText must contain 3 to 300 characters.`);
  }
}

function validateManifest(manifest, expectedSlug) {
  const issues = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return ["manifest must be a JSON object."];
  }
  const allowedKeys = new Set([...requiredManifestKeys, ...optionalManifestKeys]);
  for (const key of requiredManifestKeys) if (!(key in manifest)) issues.push(`${key} is required.`);
  for (const key of Object.keys(manifest)) if (!allowedKeys.has(key)) issues.push(`${key} is not an allowed manifest field.`);
  const text = (key, min, max) => {
    const value = manifest[key];
    if (typeof value !== "string" || value.trim().length < min || value.length > max) issues.push(`${key} must contain ${min} to ${max} characters.`);
  };
  if (manifest.schemaVersion !== 1) issues.push("schemaVersion must be 1.");
  for (const key of ["isFeatured", "isEditorsPick"]) {
    if (key in manifest && typeof manifest[key] !== "boolean") issues.push(`${key} must be a boolean when provided.`);
  }
  if (manifest.$schema !== "../schema/application.schema.json") issues.push("$schema must reference ../schema/application.schema.json.");
  text("name", 2, 80);
  text("slug", 2, 90);
  text("tagline", 10, 140);
  text("description", 40, 20_000);
  if (!slugPattern.test(manifest.slug ?? "")) issues.push("slug must use lowercase letters, numbers, and hyphens.");
  if (manifest.slug !== expectedSlug) issues.push(`slug must match the filename (${expectedSlug}).`);
  if (!isHttpUrl(manifest.websiteUrl, true)) issues.push("websiteUrl must be an HTTPS URL without credentials.");
  if (!allowedPricing.has(manifest.pricingType)) issues.push("pricingType must be free, freemium, or paid.");
  if (manifest.pricingType === "free" && manifest.billingType != null) issues.push("Free applications must use a null billingType.");
  if (manifest.pricingType !== "free" && !allowedBilling.has(manifest.billingType)) issues.push("Paid and freemium applications require a billingType.");
  if (manifest.pricingDetails != null && (typeof manifest.pricingDetails !== "string" || manifest.pricingDetails.length > 240)) issues.push("pricingDetails must be null or no more than 240 characters.");
  if (!allowedSource.has(manifest.sourceType)) issues.push("sourceType must be open_source or closed_source.");
  if (manifest.youtubeUrl != null && !isHttpUrl(manifest.youtubeUrl, true)) issues.push("youtubeUrl must be null or a public HTTPS URL.");
  for (const [key, limit, minimum] of [["categories", 12, 1], ["relatedAppSlugs", 12, 0]]) {
    const values = manifest[key];
    if (key === "relatedAppSlugs" && values === undefined) continue;
    if (!Array.isArray(values) || values.length < minimum || values.length > limit || values.some((item) => typeof item !== "string" || !slugPattern.test(item))) {
      issues.push(`${key} must contain ${minimum} to ${limit} valid slugs.`);
    } else if (new Set(values).size !== values.length) {
      issues.push(`${key} cannot contain duplicates.`);
    }
  }
  if (manifest.relatedAppSlugs?.includes(manifest.slug)) issues.push("An application cannot relate to itself.");
  if (!manifest.media || typeof manifest.media !== "object") {
    issues.push("media is required.");
  } else {
    for (const key of Object.keys(manifest.media)) if (!["icon", "preview", "screenshots"].includes(key)) issues.push(`media.${key} is not allowed.`);
    validateMedia(manifest.media.icon, "media.icon", issues);
    validateMedia(manifest.media.preview, "media.preview", issues);
    if (!Array.isArray(manifest.media.screenshots) || manifest.media.screenshots.length > 8) {
      issues.push("media.screenshots must be an array containing no more than 8 items.");
    } else {
      manifest.media.screenshots.forEach((item, index) => validateMedia(item, `media.screenshots[${index}]`, issues));
      const mediaUrls = [manifest.media.icon?.sourceUrl, manifest.media.preview?.sourceUrl, ...manifest.media.screenshots.map(({ sourceUrl }) => sourceUrl)];
      if (new Set(mediaUrls).size !== mediaUrls.length) issues.push("Every media source URL must be unique within an application.");
    }
  }
  return issues;
}

function validateDealManifest(manifest, expectedSlug) {
  const issues = [];
  const keys = ["$schema", "schemaVersion", "appSlug", "discountPercent", "code", "url", "startsAt", "endsAt"];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return ["manifest must be a JSON object."];
  for (const key of keys) if (!(key in manifest)) issues.push(`${key} is required.`);
  for (const key of Object.keys(manifest)) if (!keys.includes(key)) issues.push(`${key} is not an allowed manifest field.`);
  if (manifest.$schema !== "../schema/deal.schema.json") issues.push("$schema must reference ../schema/deal.schema.json.");
  if (manifest.schemaVersion !== 1) issues.push("schemaVersion must be 1.");
  if (!slugPattern.test(manifest.appSlug ?? "")) issues.push("appSlug must use lowercase letters, numbers, and hyphens.");
  if (manifest.appSlug !== expectedSlug) issues.push(`appSlug must match the filename (${expectedSlug}).`);
  if (!Number.isInteger(manifest.discountPercent) || manifest.discountPercent < 1 || manifest.discountPercent > 100) {
    issues.push("discountPercent must be an integer from 1 to 100.");
  }
  if (manifest.code !== null && (typeof manifest.code !== "string" || manifest.code.trim().length < 1 || manifest.code.length > 80)) {
    issues.push("code must be null or contain 1 to 80 characters.");
  }
  if (!isHttpUrl(manifest.url, true)) issues.push("url must be a public HTTPS URL.");
  const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
  for (const key of ["startsAt", "endsAt"]) {
    if (typeof manifest[key] !== "string" || !timestampPattern.test(manifest[key]) || Number.isNaN(Date.parse(manifest[key]))) {
      issues.push(`${key} must be an ISO 8601 date-time with a timezone.`);
    }
  }
  if (!Number.isNaN(Date.parse(manifest.startsAt)) && !Number.isNaN(Date.parse(manifest.endsAt))
    && Date.parse(manifest.endsAt) <= Date.parse(manifest.startsAt)) {
    issues.push("endsAt must be after startsAt.");
  }
  return issues;
}

const files = (await readdir(appsDirectory)).filter((file) => file.endsWith(".json")).sort();
if (files.length === 0) throw new Error("The catalogue contains no application manifests.");
const manifests = [];
let failed = false;
for (const file of files) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(path.join(appsDirectory, file), "utf8"));
  } catch (error) {
    console.error(`${file}: ${error instanceof Error ? error.message : "invalid JSON"}`);
    failed = true;
    continue;
  }
  const issues = validateManifest(manifest, file.slice(0, -5));
  for (const issue of issues) console.error(`${file}: ${issue}`);
  failed ||= issues.length > 0;
  manifests.push({ file, manifest });
}

const bySlug = new Map(manifests.map(({ manifest }) => [manifest.slug, manifest]));
const websites = new Map();
for (const { file, manifest } of manifests) {
  const normalizedWebsite = String(manifest.websiteUrl ?? "").replace(/\/$/, "").toLowerCase();
  if (websites.has(normalizedWebsite)) {
    console.error(`${file}: websiteUrl duplicates ${websites.get(normalizedWebsite)}.`);
    failed = true;
  } else {
    websites.set(normalizedWebsite, file);
  }
  for (const relatedSlug of manifest.relatedAppSlugs ?? []) {
    if (!bySlug.has(relatedSlug)) {
      console.error(`${file}: related application ${relatedSlug} does not exist.`);
      failed = true;
    }
  }
}

const dealFiles = (await readdir(dealsDirectory)).filter((file) => file.endsWith(".json")).sort();
const dealAppSlugs = new Set();
for (const file of dealFiles) {
  try {
    const manifest = JSON.parse(await readFile(path.join(dealsDirectory, file), "utf8"));
    const issues = validateDealManifest(manifest, file.slice(0, -5));
    if (!bySlug.has(manifest.appSlug)) issues.push(`appSlug ${manifest.appSlug} does not exist in catalog/apps.`);
    if (dealAppSlugs.has(manifest.appSlug)) issues.push(`appSlug ${manifest.appSlug} already has a deal manifest.`);
    dealAppSlugs.add(manifest.appSlug);
    for (const issue of issues) console.error(`deals/${file}: ${issue}`);
    failed ||= issues.length > 0;
  } catch (error) {
    console.error(`deals/${file}: ${error instanceof Error ? error.message : "invalid JSON"}`);
    failed = true;
  }
}

for (const [file, validate, expectedSlug] of [
  ["application.example.json", validateManifest, "example-app"],
  ["deal.example.json", validateDealManifest, "example-app"],
]) {
  try {
    const manifest = JSON.parse(await readFile(path.join(examplesDirectory, file), "utf8"));
    const issues = validate(manifest, expectedSlug);
    for (const issue of issues) console.error(`examples/${file}: ${issue}`);
    failed ||= issues.length > 0;
  } catch (error) {
    console.error(`examples/${file}: ${error instanceof Error ? error.message : "invalid JSON"}`);
    failed = true;
  }
}

if (failed) process.exitCode = 1;
else console.log(`Validated ${manifests.length} application manifest(s), ${dealFiles.length} deal manifest(s), and the contributor examples.`);

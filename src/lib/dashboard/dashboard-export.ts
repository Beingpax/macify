import { asc, desc, eq, isNull } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import {
  appCategories,
  appRelationships,
  apps,
  categories,
  deals,
  mediaAssets,
} from "@/db/schema";

const columns = [
  "id",
  "name",
  "slug",
  "listing_url",
  "website_url",
  "tagline",
  "description",
  "pricing_type",
  "billing_type",
  "pricing_details",
  "source_type",
  "youtube_url",
  "status",
  "is_featured",
  "is_editors_pick",
  "categories",
  "related_apps",
  "related_app_urls",
  "icon_url",
  "og_image_url",
  "screenshot_urls",
  "all_asset_urls",
  "asset_source_urls",
  "deal_discount_percent",
  "deal_code",
  "deal_url",
  "deal_starts_at",
  "deal_ends_at",
  "featured_at",
  "published_at",
  "created_at",
  "updated_at",
] as const;

function isoDate(value: Date | null) {
  return value?.toISOString() ?? "";
}

function mediaUrl(origin: string, storageKey: string) {
  const encodedKey = storageKey.split("/").map(encodeURIComponent).join("/");
  return new URL(`/dashboard/media/${encodedKey}`, origin).toString();
}

function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  // Prevent spreadsheet applications from treating exported content as a formula.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function createApplicationsCsv(origin: string) {
  const database = await getDatabase();
  const [applicationRows, categoryRows, relationshipRows, mediaRows, dealRows] = await Promise.all([
    database.select().from(apps).where(isNull(apps.deletedAt)).orderBy(asc(apps.name), asc(apps.id)),
    database
      .select({ appId: appCategories.appId, name: categories.name })
      .from(appCategories)
      .innerJoin(categories, eq(categories.id, appCategories.categoryId))
      .orderBy(asc(categories.name)),
    database.select().from(appRelationships).orderBy(asc(appRelationships.createdAt)),
    database
      .select({
        appId: mediaAssets.appId,
        role: mediaAssets.role,
        storageKey: mediaAssets.storageKey,
        sourceUrl: mediaAssets.sourceUrl,
      })
      .from(mediaAssets)
      .orderBy(desc(mediaAssets.createdAt), asc(mediaAssets.id)),
    database.select().from(deals),
  ]);

  const appsById = new Map(applicationRows.map((app) => [app.id, app]));
  const categoriesByApp = new Map<string, string[]>();
  const relatedIdsByApp = new Map<string, Set<string>>();
  const mediaByApp = new Map<string, typeof mediaRows>();
  const dealByApp = new Map(dealRows.map((deal) => [deal.appId, deal]));

  for (const row of categoryRows) {
    const names = categoriesByApp.get(row.appId) ?? [];
    names.push(row.name);
    categoriesByApp.set(row.appId, names);
  }
  for (const relationship of relationshipRows) {
    if (!appsById.has(relationship.sourceAppId) || !appsById.has(relationship.targetAppId)) continue;
    const sourceRelated = relatedIdsByApp.get(relationship.sourceAppId) ?? new Set<string>();
    const targetRelated = relatedIdsByApp.get(relationship.targetAppId) ?? new Set<string>();
    sourceRelated.add(relationship.targetAppId);
    targetRelated.add(relationship.sourceAppId);
    relatedIdsByApp.set(relationship.sourceAppId, sourceRelated);
    relatedIdsByApp.set(relationship.targetAppId, targetRelated);
  }
  for (const asset of mediaRows) {
    if (!asset.appId || !appsById.has(asset.appId)) continue;
    const assets = mediaByApp.get(asset.appId) ?? [];
    assets.push(asset);
    mediaByApp.set(asset.appId, assets);
  }

  const rows = applicationRows.map((app) => {
    const assets = mediaByApp.get(app.id) ?? [];
    const icon = assets.find((asset) => asset.role === "icon");
    const preview = assets.find((asset) => asset.role === "preview_image");
    const screenshots = assets.filter((asset) => asset.role === "screenshot");
    const related = [...(relatedIdsByApp.get(app.id) ?? [])]
      .map((id) => appsById.get(id))
      .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
      .sort((left, right) => left.name.localeCompare(right.name));
    const deal = dealByApp.get(app.id);
    const record: Record<(typeof columns)[number], unknown> = {
      id: app.id,
      name: app.name,
      slug: app.slug,
      listing_url: new URL(`/apps/${encodeURIComponent(app.slug)}`, origin).toString(),
      website_url: app.websiteUrl,
      tagline: app.tagline,
      description: app.description,
      pricing_type: app.pricingType,
      billing_type: app.billingType,
      pricing_details: app.pricingDetails,
      source_type: app.sourceType,
      youtube_url: app.youtubeUrl,
      status: app.status,
      is_featured: app.isFeatured,
      is_editors_pick: app.isEditorsPick,
      categories: (categoriesByApp.get(app.id) ?? []).join(" | "),
      related_apps: related.map(({ name }) => name).join(" | "),
      related_app_urls: related.map(({ slug }) => new URL(`/apps/${encodeURIComponent(slug)}`, origin).toString()).join(" | "),
      icon_url: icon ? mediaUrl(origin, icon.storageKey) : "",
      og_image_url: preview ? mediaUrl(origin, preview.storageKey) : "",
      screenshot_urls: screenshots.map(({ storageKey }) => mediaUrl(origin, storageKey)).join(" | "),
      all_asset_urls: assets.map(({ storageKey }) => mediaUrl(origin, storageKey)).join(" | "),
      asset_source_urls: [...new Set(assets.map(({ sourceUrl }) => sourceUrl).filter(Boolean))].join(" | "),
      deal_discount_percent: deal?.discountPercent,
      deal_code: deal?.code,
      deal_url: deal?.url,
      deal_starts_at: isoDate(deal?.startsAt ?? null),
      deal_ends_at: isoDate(deal?.endsAt ?? null),
      featured_at: isoDate(app.featuredAt),
      published_at: isoDate(app.publishedAt),
      created_at: isoDate(app.createdAt),
      updated_at: isoDate(app.updatedAt),
    };
    return columns.map((column) => csvCell(record[column])).join(",");
  });

  return `\uFEFF${columns.join(",")}\r\n${rows.join("\r\n")}\r\n`;
}

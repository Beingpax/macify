import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { apps, mediaAssets } from "@/db/schema";

export type DirectorySearchFilters = {
  query: string;
  pricing: "" | "free" | "freemium" | "paid";
  billing: "" | "one_time" | "subscription";
  openSource: boolean;
  page: number;
};

export const cardFields = {
  id: apps.id,
  slug: apps.slug,
  name: apps.name,
  tagline: apps.tagline,
  pricingType: apps.pricingType,
  billingType: apps.billingType,
  pricingDetails: apps.pricingDetails,
  isFeatured: apps.isFeatured,
  isEditorsPick: apps.isEditorsPick,
};

export const publicApplicationFields = {
  id: apps.id,
  slug: apps.slug,
  name: apps.name,
  websiteUrl: apps.websiteUrl,
  tagline: apps.tagline,
  description: apps.description,
  pricingType: apps.pricingType,
  billingType: apps.billingType,
  pricingDetails: apps.pricingDetails,
  sourceType: apps.sourceType,
  youtubeUrl: apps.youtubeUrl,
  publishedAt: apps.publishedAt,
  isFeatured: apps.isFeatured,
  isEditorsPick: apps.isEditorsPick,
};

type AppIconMedia = {
  appId: string | null;
  storageKey: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

export async function getAppIcons(appIds: string[]): Promise<Map<string, AppIconMedia>> {
  if (!appIds.length) return new Map<string, AppIconMedia>();
  const database = await getDatabase();
  const uniqueIds = [...new Set(appIds)];
  const rows = [];
  // Leave room for other bindings under D1's per-query parameter limit.
  for (let index = 0; index < uniqueIds.length; index += 75) {
    rows.push(...await database
      .select({
        appId: mediaAssets.appId,
        storageKey: mediaAssets.storageKey,
        altText: mediaAssets.altText,
        width: mediaAssets.width,
        height: mediaAssets.height,
      })
      .from(mediaAssets)
      .where(and(
        inArray(mediaAssets.appId, uniqueIds.slice(index, index + 75)),
        eq(mediaAssets.role, "icon"),
      ))
      .orderBy(desc(mediaAssets.createdAt)));
  }
  const icons = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (row.appId && !icons.has(row.appId)) icons.set(row.appId, row);
  }
  return icons;
}

export async function getCardMedia(appIds: string[]) {
  if (!appIds.length) return { icons: new Map(), previews: new Map() };
  const database = await getDatabase();
  const rows = [];
  const chunkSize = 75;
  for (let index = 0; index < appIds.length; index += chunkSize) {
    const chunk = appIds.slice(index, index + chunkSize);
    rows.push(...await database
      .select({
        appId: mediaAssets.appId,
        role: mediaAssets.role,
        storageKey: mediaAssets.storageKey,
        altText: mediaAssets.altText,
        width: mediaAssets.width,
        height: mediaAssets.height,
      })
      .from(mediaAssets)
      .where(and(
        inArray(mediaAssets.appId, chunk),
        or(eq(mediaAssets.role, "icon"), eq(mediaAssets.role, "preview_image")),
      ))
      .orderBy(desc(mediaAssets.createdAt)));
  }
  const icons = new Map<string, (typeof rows)[number]>();
  const previews = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!row.appId) continue;
    if (row.role === "icon" && !icons.has(row.appId)) icons.set(row.appId, row);
    if (row.role === "preview_image" && !previews.has(row.appId)) previews.set(row.appId, row);
  }
  return { icons, previews };
}

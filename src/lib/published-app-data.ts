import { and, asc, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { unstable_cache } from "next/cache";
import { getDatabase } from "@/db/client";
import {
  appRelationships,
  appCategories,
  apps,
  deals,
  mediaAssets,
  categories,
} from "@/db/schema";
import { getAppIcons, publicApplicationFields } from "@/lib/directory-shared";
import { PUBLIC_CATALOGUE_CACHE_TAG } from "@/lib/public-cache";

async function queryPublishedApplicationBySlug(slug: string) {
  const database = await getDatabase();
  const applicationRows = await database
    .select(publicApplicationFields)
    .from(apps)
    .where(and(eq(apps.slug, slug), eq(apps.status, "published"), isNull(apps.deletedAt)))
    .limit(1);
  const application = applicationRows[0];
  if (!application) return null;

  const relatedApp = alias(apps, "related_app");
  const relatedFields = {
    id: relatedApp.id,
    slug: relatedApp.slug,
    name: relatedApp.name,
    tagline: relatedApp.tagline,
    pricingType: relatedApp.pricingType,
    billingType: relatedApp.billingType,
    pricingDetails: relatedApp.pricingDetails,
    isFeatured: relatedApp.isFeatured,
    isEditorsPick: relatedApp.isEditorsPick,
  };
  const now = new Date();
  const [categoryRows, media, outgoing, dealRows, incoming] = await Promise.all([
    database
      .select({ id: categories.id, slug: categories.slug, name: categories.name })
      .from(appCategories)
      .innerJoin(categories, eq(categories.id, appCategories.categoryId))
      .where(eq(appCategories.appId, application.id))
      .orderBy(asc(categories.name)),
    database
      .select({
        id: mediaAssets.id,
        role: mediaAssets.role,
        storageKey: mediaAssets.storageKey,
        sourceUrl: mediaAssets.sourceUrl,
        mimeType: mediaAssets.mimeType,
        width: mediaAssets.width,
        height: mediaAssets.height,
        altText: mediaAssets.altText,
      })
      .from(mediaAssets)
      .where(and(
        eq(mediaAssets.appId, application.id),
        sql`${mediaAssets.role} <> 'audio'`,
      ))
      .orderBy(asc(mediaAssets.createdAt)),
    database
      .select(relatedFields)
      .from(appRelationships)
      .innerJoin(relatedApp, eq(relatedApp.id, appRelationships.targetAppId))
      .where(and(
        eq(appRelationships.sourceAppId, application.id),
        eq(relatedApp.status, "published"),
        isNull(relatedApp.deletedAt),
      ))
      .orderBy(asc(relatedApp.name))
      .limit(6),
    database
      .select({
        discountPercent: deals.discountPercent,
        code: deals.code,
        url: deals.url,
        startsAt: deals.startsAt,
        endsAt: deals.endsAt,
      })
      .from(deals)
      .where(and(
        eq(deals.appId, application.id),
        lte(deals.startsAt, now),
        gte(deals.endsAt, now),
      ))
      .limit(1),
    database
      .select(relatedFields)
      .from(appRelationships)
      .innerJoin(relatedApp, eq(relatedApp.id, appRelationships.sourceAppId))
      .where(and(
        eq(appRelationships.targetAppId, application.id),
        eq(relatedApp.status, "published"),
        isNull(relatedApp.deletedAt),
      ))
      .orderBy(asc(relatedApp.name))
      .limit(6),
  ]);

  const relatedRecords = Array.from(
    [...outgoing, ...incoming]
      .reduce(
        (items, item) => items.set(item.id, item),
        new Map<string, (typeof outgoing)[number]>(),
      )
      .values(),
  ).slice(0, 6);
  const icons = await getAppIcons(relatedRecords.map(({ id }) => id));
  return {
    ...application,
    categories: categoryRows,
    media,
    deal: dealRows[0] ?? null,
    related: relatedRecords.map((record) => ({
      ...record,
      icon: icons.get(record.id) ?? null,
    })),
  };
}

export async function getPublishedApplicationBySlug(slug: string) {
  return unstable_cache(
    () => queryPublishedApplicationBySlug(slug),
    ["published-application", slug],
    { revalidate: false, tags: [PUBLIC_CATALOGUE_CACHE_TAG] },
  )();
}

async function queryPublishedApplicationSlugs() {
  const database = await getDatabase();
  return database
    .select({ slug: apps.slug, updatedAt: apps.updatedAt })
    .from(apps)
    .where(and(eq(apps.status, "published"), isNull(apps.deletedAt)))
    .orderBy(desc(apps.updatedAt));
}

export const getPublishedApplicationSlugs = unstable_cache(
  queryPublishedApplicationSlugs,
  ["published-application-slugs"],
  { revalidate: false, tags: [PUBLIC_CATALOGUE_CACHE_TAG] },
);

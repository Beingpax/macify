import { and, asc, count, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { getAppIcons } from "@/lib/directory/directory-shared";
import { alias } from "drizzle-orm/sqlite-core";
import { getDatabase } from "@/db/client";
import {
  appCategories,
  appRelationships,
  deals,
  apps,
  mediaAssets,
  categories,
  catalogueRevisions,
} from "@/db/schema";

export async function getApplicationsDashboardData() {
  const database = await getDatabase();
  const [records, statsRows, revisionRows] = await Promise.all([
    database
      .select({
        id: apps.id,
        name: apps.name,
        slug: apps.slug,
        tagline: apps.tagline,
        pricingType: apps.pricingType,
        billingType: apps.billingType,
        pricingDetails: apps.pricingDetails,
        sourceType: apps.sourceType,
        status: apps.status,
        isFeatured: apps.isFeatured,
        isEditorsPick: apps.isEditorsPick,
        updatedAt: apps.updatedAt,
      })
      .from(apps)
      .where(isNull(apps.deletedAt))
      .orderBy(desc(apps.createdAt), asc(apps.id))
      .limit(50),
    database
      .select({
        total: count(),
        published: sql<number>`coalesce(sum(case when ${apps.status} = 'published' then 1 else 0 end), 0)`,
      })
      .from(apps)
      .where(isNull(apps.deletedAt)),
    database.select({ count: count() }).from(catalogueRevisions).where(and(
      eq(catalogueRevisions.status, "pending"),
      like(catalogueRevisions.sourcePath, "catalog/apps/%"),
    )),
  ]);

  const applicationIds = records.map(({ id }) => id);
  const mediaRowsForApplications = applicationIds.length > 0
    ? await database
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
        inArray(mediaAssets.appId, applicationIds),
        or(eq(mediaAssets.role, "icon"), eq(mediaAssets.role, "preview_image")),
      ))
      .orderBy(desc(mediaAssets.createdAt))
    : [];
  const iconsByApplication = new Map<string, (typeof mediaRowsForApplications)[number]>();
  const previewsByApplication = new Map<string, (typeof mediaRowsForApplications)[number]>();
  for (const asset of mediaRowsForApplications) {
    if (asset.appId && asset.role === "icon" && !iconsByApplication.has(asset.appId)) {
      iconsByApplication.set(asset.appId, asset);
    }
    if (asset.appId && asset.role === "preview_image" && !previewsByApplication.has(asset.appId)) {
      previewsByApplication.set(asset.appId, asset);
    }
  }

  return {
    applications: records.map((record) => {
      const icon = iconsByApplication.get(record.id);
      const preview = previewsByApplication.get(record.id);
      return {
        ...record,
        iconStorageKey: icon?.storageKey ?? null,
        iconAltText: icon?.altText ?? null,
        previewStorageKey: preview?.storageKey ?? null,
        previewAltText: preview?.altText ?? null,
        previewWidth: preview?.width ?? null,
        previewHeight: preview?.height ?? null,
      };
    }),
    stats: statsRows[0] ?? { total: 0, published: 0 },
    pendingRevisions: revisionRows[0]?.count ?? 0,
  };
}

export async function getApplicationEditorData(id: string) {
  const database = await getDatabase();
  const [applicationRows, media, categoryRows] = await Promise.all([
    database
      .select({
        id: apps.id,
        name: apps.name,
        slug: apps.slug,
        websiteUrl: apps.websiteUrl,
        tagline: apps.tagline,
        description: apps.description,
        pricingType: apps.pricingType,
        billingType: apps.billingType,
        pricingDetails: apps.pricingDetails,
        sourceType: apps.sourceType,
        youtubeUrl: apps.youtubeUrl,
        publishedAt: apps.publishedAt,
        updatedAt: apps.updatedAt,
        status: apps.status,
        isFeatured: apps.isFeatured,
        isEditorsPick: apps.isEditorsPick,
      })
      .from(apps)
      .where(and(eq(apps.id, id), isNull(apps.deletedAt)))
      .limit(1),
    database
      .select({
        id: mediaAssets.id,
        role: mediaAssets.role,
        storageKey: mediaAssets.storageKey,
        mimeType: mediaAssets.mimeType,
        byteSize: mediaAssets.byteSize,
        width: mediaAssets.width,
        height: mediaAssets.height,
        sourceUrl: mediaAssets.sourceUrl,
        altText: mediaAssets.altText,
        createdAt: mediaAssets.createdAt,
      })
      .from(mediaAssets)
      .where(and(eq(mediaAssets.appId, id), sql`${mediaAssets.role} <> 'audio'`))
      .orderBy(desc(mediaAssets.createdAt)),
    database
      .select({ id: categories.id, slug: categories.slug, name: categories.name })
      .from(appCategories)
      .innerJoin(categories, eq(categories.id, appCategories.categoryId))
      .where(eq(appCategories.appId, id))
      .orderBy(asc(categories.name)),
  ]);

  const application = applicationRows[0]
    ? {
        ...applicationRows[0],
        categories: categoryRows,
        categoriesText: categoryRows.map(({ name }) => name).join(", "),
      }
    : null;

  return { application, media };
}

export async function getDashboardApplicationDetail(id: string) {
  const detail = await getApplicationEditorData(id);
  if (!detail.application) return { ...detail, related: [], deal: null };
  const database = await getDatabase();
  const relatedApp = alias(apps, "related_app");
  const [related, dealRows] = await Promise.all([
    database.selectDistinct({ id: relatedApp.id, slug: relatedApp.slug, name: relatedApp.name })
      .from(appRelationships)
      .innerJoin(relatedApp, or(
        and(eq(appRelationships.sourceAppId, id), eq(relatedApp.id, appRelationships.targetAppId)),
        and(eq(appRelationships.targetAppId, id), eq(relatedApp.id, appRelationships.sourceAppId)),
      ))
      .where(isNull(relatedApp.deletedAt))
      .orderBy(asc(relatedApp.name)).limit(12),
    database.select().from(deals).where(eq(deals.appId, id)).limit(1),
  ]);
  const icons = await getAppIcons(related.map(({ id }) => id));
  return { ...detail, related: related.map((app) => ({ ...app, icon: icons.get(app.id) ?? null })), deal: dealRows[0] ?? null };
}

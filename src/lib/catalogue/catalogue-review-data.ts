import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import {
  appCategories,
  appRelationships,
  apps,
  categories,
  mediaAssets,
} from "@/db/schema";

const snapshotFields = {
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
  status: apps.status,
  isFeatured: apps.isFeatured,
  isEditorsPick: apps.isEditorsPick,
};

type QueueApplication = Pick<typeof apps.$inferSelect,
  | "id" | "name" | "slug" | "websiteUrl" | "tagline" | "description"
  | "pricingType" | "billingType" | "pricingDetails" | "sourceType" | "youtubeUrl"
  | "status" | "isFeatured" | "isEditorsPick"
> & {
  media: Array<{
    appId: string | null;
    role: "icon" | "preview_image" | "screenshot";
    storageKey: string;
    checksum: string;
    sourceUrl: string | null;
    altText: string | null;
  }>;
};

export async function getCatalogueReviewSnapshot(appId: string | null) {
  if (!appId) return null;
  const database = await getDatabase();
  const applicationRows = await database.select(snapshotFields).from(apps)
    .where(and(eq(apps.id, appId), isNull(apps.deletedAt))).limit(1);
  const application = applicationRows[0];
  if (!application) return null;

  const [categoryRows, relationshipRows, media] = await Promise.all([
    database.select({ slug: categories.slug }).from(appCategories)
      .innerJoin(categories, eq(categories.id, appCategories.categoryId))
      .where(eq(appCategories.appId, appId)).orderBy(asc(categories.slug)),
    database.select({ sourceAppId: appRelationships.sourceAppId, targetAppId: appRelationships.targetAppId })
      .from(appRelationships)
      .where(or(eq(appRelationships.sourceAppId, appId), eq(appRelationships.targetAppId, appId))),
    database.select({
      id: mediaAssets.id,
      role: mediaAssets.role,
      storageKey: mediaAssets.storageKey,
      mimeType: mediaAssets.mimeType,
      byteSize: mediaAssets.byteSize,
      width: mediaAssets.width,
      height: mediaAssets.height,
      checksum: mediaAssets.checksum,
      sourceUrl: mediaAssets.sourceUrl,
      altText: mediaAssets.altText,
    }).from(mediaAssets).where(eq(mediaAssets.appId, appId)).orderBy(asc(mediaAssets.createdAt)),
  ]);

  const relatedIds = relationshipRows.map((relationship) => (
    relationship.sourceAppId === appId ? relationship.targetAppId : relationship.sourceAppId
  ));
  const relatedRows = relatedIds.length > 0
    ? await database.select({ id: apps.id, slug: apps.slug }).from(apps)
      .where(and(inArray(apps.id, relatedIds), isNull(apps.deletedAt)))
    : [];

  return {
    ...application,
    categories: categoryRows.map(({ slug }) => slug),
    relatedAppSlugs: relatedRows.map(({ slug }) => slug).sort(),
    media,
  };
}

export async function getCatalogueQueueApplications(appIds: string[]) {
  const ids = [...new Set(appIds)];
  if (ids.length === 0) return new Map<string, QueueApplication>();
  const database = await getDatabase();
  const [applicationRows, mediaRows] = await Promise.all([
    database.select(snapshotFields).from(apps).where(and(inArray(apps.id, ids), isNull(apps.deletedAt))),
    database.select({
      appId: mediaAssets.appId,
      role: mediaAssets.role,
      storageKey: mediaAssets.storageKey,
      checksum: mediaAssets.checksum,
      sourceUrl: mediaAssets.sourceUrl,
      altText: mediaAssets.altText,
    }).from(mediaAssets).where(inArray(mediaAssets.appId, ids)),
  ]);
  const mediaByApp = new Map<string, typeof mediaRows>();
  for (const media of mediaRows) {
    if (!media.appId) continue;
    const existing = mediaByApp.get(media.appId) ?? [];
    existing.push(media);
    mediaByApp.set(media.appId, existing);
  }
  return new Map<string, QueueApplication>(applicationRows.map((application) => [application.id, {
    ...application,
    media: mediaByApp.get(application.id) ?? [],
  }]));
}

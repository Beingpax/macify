import { and, asc, count, desc, eq, gte, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDatabase } from "@/db/client";
import { appCategories, apps, categories } from "@/db/schema";
import {
  cardFields,
  getCardMedia,
  type DirectorySearchFilters,
} from "@/lib/directory/directory-shared";
import { getTrendingApplicationVisits } from "@/lib/analytics/datafast-analytics";
import {
  HOMEPAGE_APPLICATION_SLUGS,
  homepageApplicationPosition,
} from "@/lib/directory/homepage-application-order";
import { PUBLIC_CATALOGUE_CACHE_TAG } from "@/lib/shared/public-cache";

type HomepageView = "hot" | "trending" | "latest";
const homepageApplicationLimit = HOMEPAGE_APPLICATION_SLUGS.length;
const latestApplicationWindowMs = 15 * 24 * 60 * 60 * 1000;

function searchConditions(filters?: DirectorySearchFilters) {
  const conditions: SQL[] = [eq(apps.status, "published"), isNull(apps.deletedAt)];
  if (filters?.query) {
    const pattern = `%${filters.query.toLowerCase()}%`;
    conditions.push(sql`(
      lower(${apps.name}) like ${pattern}
      or lower(${apps.tagline}) like ${pattern}
      or lower(${apps.description}) like ${pattern}
      or exists (
        select 1 from ${appCategories}
        inner join ${categories} on ${categories.id} = ${appCategories.categoryId}
        where ${appCategories.appId} = ${apps.id} and lower(${categories.name}) like ${pattern}
      )
    )`);
  }
  if (filters?.pricing) conditions.push(eq(apps.pricingType, filters.pricing));
  if (filters?.billing) conditions.push(eq(apps.billingType, filters.billing));
  if (filters?.openSource) conditions.push(eq(apps.sourceType, "open_source"));
  return conditions;
}

async function queryHomepageDirectoryData(filters?: DirectorySearchFilters, view: HomepageView = "hot") {
  const database = await getDatabase();
  const latestPublishedAt = new Date(Date.now() - latestApplicationWindowMs);
  const [fallbackRecords, analyticsVisits] = await Promise.all([
    view === "latest"
      ? database.select(cardFields).from(apps)
        .where(and(
          eq(apps.status, "published"),
          isNull(apps.deletedAt),
          gte(apps.publishedAt, latestPublishedAt),
        ))
        .orderBy(desc(apps.publishedAt), asc(apps.id)).limit(homepageApplicationLimit)
      : database.select(cardFields).from(apps).where(and(
        eq(apps.status, "published"), isNull(apps.deletedAt), inArray(apps.slug, HOMEPAGE_APPLICATION_SLUGS),
      )).limit(homepageApplicationLimit),
    view === "trending" ? getTrendingApplicationVisits() : Promise.resolve([]),
  ]);

  let records = fallbackRecords;
  if (analyticsVisits.length) {
    const rankedSlugs = analyticsVisits.map(({ slug }) => slug);
    const bySlug = new Map(fallbackRecords.map((record) => [record.slug, record]));
    const ranked = rankedSlugs.map((slug) => bySlug.get(slug)).filter((record): record is (typeof fallbackRecords)[number] => Boolean(record));
    const rankedIds = new Set(ranked.map(({ id }) => id));
    const curatedRemainder = [...fallbackRecords]
      .filter(({ id }) => !rankedIds.has(id))
      .sort((left, right) => homepageApplicationPosition(left.slug) - homepageApplicationPosition(right.slug));
    records = [...ranked, ...curatedRemainder].slice(0, homepageApplicationLimit);
  }

  const page = filters?.page ?? 1;
  const pageSize = 24;
  const conditions = searchConditions(filters);
  const [searchRecords, countRows] = filters ? await Promise.all([
    database
      .select({ ...cardFields, sourceType: apps.sourceType })
      .from(apps)
      .where(and(...conditions))
      .orderBy(asc(apps.name))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    database
      .select({ total: count() })
      .from(apps)
      .where(and(...conditions)),
  ]) : [[], [{ total: 0 }]];

  const orderedRecords = view !== "latest" && !analyticsVisits.length
    ? [...records].sort((left, right) => homepageApplicationPosition(left.slug) - homepageApplicationPosition(right.slug))
    : records;
  const promotedRecords = view === "hot"
    ? fallbackRecords.filter(({ isFeatured, isEditorsPick }) => isFeatured || isEditorsPick)
    : view === "trending"
      ? fallbackRecords
        .filter(({ isFeatured }) => isFeatured)
        .sort((left, right) => homepageApplicationPosition(left.slug) - homepageApplicationPosition(right.slug))
      : [];
  const promotedIds = new Set(promotedRecords.map(({ id }) => id));
  let directoryRecords = [
    ...promotedRecords,
    ...orderedRecords.filter(({ id }) => !promotedIds.has(id)),
  ].slice(0, homepageApplicationLimit);
  if (view === "hot") {
    directoryRecords = directoryRecords.sort((left, right) => {
      if (left.slug === "swish") return right.slug === "swish" ? 0 : -1;
      if (right.slug === "swish") return 1;
      const leftGroup = left.isFeatured ? 0 : left.isEditorsPick ? 1 : 2;
      const rightGroup = right.isFeatured ? 0 : right.isEditorsPick ? 1 : 2;
      return leftGroup - rightGroup
        || homepageApplicationPosition(left.slug) - homepageApplicationPosition(right.slug);
    });
  }
  const appIds = [...new Set([...directoryRecords, ...searchRecords].map(({ id }) => id))];
  const { icons, previews } = await getCardMedia(appIds);
  return {
    applications: directoryRecords.map((record) => ({
      ...record,
      icon: icons.get(record.id) ?? null,
      preview: previews.get(record.id) ?? null,
    })),
    search: {
      active: Boolean(filters),
      applications: searchRecords.map((record) => ({
        ...record,
        icon: icons.get(record.id) ?? null,
      })),
      page,
      pageSize,
      total: Number(countRows[0]?.total ?? 0),
    },
  };
}

export async function getHomepageDirectoryData(filters?: DirectorySearchFilters, view: HomepageView = "hot") {
  // Search is user-specific and stays live. Ranked homepage views remain
  // cached until a catalogue mutation explicitly invalidates them.
  if (filters) return queryHomepageDirectoryData(filters, view);
  return unstable_cache(
    () => queryHomepageDirectoryData(undefined, view),
    ["homepage-directory", view],
    {
      revalidate: view === "trending" ? 15 * 60 : false,
      tags: [PUBLIC_CATALOGUE_CACHE_TAG],
    },
  )();
}

// Keep hero artwork independent of optional ranking analytics.
async function queryHomepageHeroData() {
  const database = await getDatabase();
  const records = await database.select(cardFields).from(apps).where(and(
    eq(apps.status, "published"),
    isNull(apps.deletedAt),
    inArray(apps.slug, ["dayflow", "cleanshot-x", "swish", "droppy"]),
  )).limit(4);
  const { icons, previews } = await getCardMedia(records.map(({ id }) => id));
  return records.map((record) => ({
    ...record,
    icon: icons.get(record.id) ?? null,
    preview: previews.get(record.id) ?? null,
  }));
}

export const getHomepageHeroData = unstable_cache(
  queryHomepageHeroData,
  ["homepage-hero"],
  { revalidate: false, tags: [PUBLIC_CATALOGUE_CACHE_TAG] },
);

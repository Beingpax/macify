import { and, asc, count, desc, eq, isNull, lte, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDatabase } from "@/db/client";
import { appCategories, apps, categories } from "@/db/schema";
import { cardFields, getAppIcons, getCardMedia } from "@/lib/directory/directory-shared";
import { PUBLIC_CATALOGUE_CACHE_TAG } from "@/lib/shared/public-cache";

async function queryPublishedCategoryBySlug(slug: string) {
  const database = await getDatabase();
  const categoryRows = await database
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  const category = categoryRows[0];
  if (!category) return null;

  const records = await database
    .select(cardFields)
    .from(appCategories)
    .innerJoin(apps, eq(apps.id, appCategories.appId))
    .where(and(eq(appCategories.categoryId, category.id), eq(apps.status, "published"), isNull(apps.deletedAt)))
    .orderBy(asc(apps.name));
  const { icons, previews } = await getCardMedia(records.map(({ id }) => id));

  return {
    ...category,
    applications: records.map((record) => ({
      ...record,
      icon: icons.get(record.id) ?? null,
      preview: previews.get(record.id) ?? null,
    })),
  };
}

export async function getPublishedCategoryBySlug(slug: string) {
  return unstable_cache(
    () => queryPublishedCategoryBySlug(slug),
    ["published-category", slug],
    { revalidate: false, tags: [PUBLIC_CATALOGUE_CACHE_TAG] },
  )();
}

async function queryPublishedCategorySlugs() {
  const database = await getDatabase();
  return database
    .select({ slug: categories.slug, updatedAt: sql`max(${apps.updatedAt})`.mapWith(apps.updatedAt) })
    .from(categories)
    .innerJoin(appCategories, eq(appCategories.categoryId, categories.id))
    .innerJoin(apps, eq(apps.id, appCategories.appId))
    .where(and(eq(apps.status, "published"), isNull(apps.deletedAt)))
    .groupBy(categories.id, categories.slug)
    .orderBy(asc(categories.slug));
}

export const getPublishedCategorySlugs = unstable_cache(
  queryPublishedCategorySlugs,
  ["published-category-slugs"],
  { revalidate: false, tags: [PUBLIC_CATALOGUE_CACHE_TAG] },
);

async function queryPublishedCategories() {
  const database = await getDatabase();
  const rankedApplications = database.select({
    categoryId: appCategories.categoryId,
    ...cardFields,
    categoryRank: sql<number>`row_number() over (
      partition by ${appCategories.categoryId}
      order by ${apps.publishedAt} desc, ${apps.name} asc, ${apps.id} asc
    )`.as("category_rank"),
  }).from(appCategories)
    .innerJoin(apps, eq(apps.id, appCategories.appId))
    .where(and(eq(apps.status, "published"), isNull(apps.deletedAt)))
    .as("ranked_applications");
  const [categoryRows, applicationRows] = await Promise.all([
    database.select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      applicationCount: count(appCategories.appId),
    }).from(categories)
      .innerJoin(appCategories, eq(appCategories.categoryId, categories.id))
      .innerJoin(apps, eq(apps.id, appCategories.appId))
      .where(and(eq(apps.status, "published"), isNull(apps.deletedAt)))
      .groupBy(categories.id)
      .orderBy(desc(count(appCategories.appId)), asc(categories.name)),
    database.select().from(rankedApplications)
      .where(lte(rankedApplications.categoryRank, 4))
      .orderBy(asc(rankedApplications.categoryId), asc(rankedApplications.categoryRank)),
  ]);
  const icons = await getAppIcons([...new Set(applicationRows.map(({ id }) => id))]);
  const applicationsByCategory = new Map<string, Array<(typeof applicationRows)[number] & {
    icon: NonNullable<ReturnType<typeof icons.get>> | null;
  }>>();

  for (const application of applicationRows) {
    const categoryApplications = applicationsByCategory.get(application.categoryId) ?? [];
    if (categoryApplications.length >= 4) continue;
    categoryApplications.push({ ...application, icon: icons.get(application.id) ?? null });
    applicationsByCategory.set(application.categoryId, categoryApplications);
  }

  return categoryRows.map((category) => ({
    ...category,
    applications: applicationsByCategory.get(category.id) ?? [],
  }));
}

export const getPublishedCategories = unstable_cache(
  queryPublishedCategories,
  ["published-categories"],
  { revalidate: false, tags: [PUBLIC_CATALOGUE_CACHE_TAG] },
);

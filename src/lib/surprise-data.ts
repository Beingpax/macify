import { and, asc, eq, isNull } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDatabase } from "@/db/client";
import { appCategories, apps, categories } from "@/db/schema";
import { getAppIcons } from "@/lib/directory-shared";
import { PUBLIC_CATALOGUE_CACHE_TAG } from "@/lib/public-cache";

export type SurpriseApplication = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  categories: Array<{ name: string; slug: string }>;
  icon: { storageKey: string; altText: string | null } | null;
};

async function querySurpriseApplications(): Promise<SurpriseApplication[]> {
  const database = await getDatabase();
  const applicationRows = await database
    .select({
      id: apps.id,
      slug: apps.slug,
      name: apps.name,
      tagline: apps.tagline,
    })
    .from(apps)
    .where(and(eq(apps.status, "published"), isNull(apps.deletedAt)))
    .orderBy(asc(apps.name));

  const applicationIds = applicationRows.map(({ id }) => id);
  const [categoryRows, icons] = await Promise.all([
    database
      .select({
        appId: appCategories.appId,
        name: categories.name,
        slug: categories.slug,
      })
      .from(appCategories)
      .innerJoin(categories, eq(categories.id, appCategories.categoryId))
      .innerJoin(apps, eq(apps.id, appCategories.appId))
      .where(and(eq(apps.status, "published"), isNull(apps.deletedAt)))
      .orderBy(asc(categories.name)),
    getAppIcons(applicationIds),
  ]);

  const categoriesByApplication = new Map<string, Array<{ name: string; slug: string }>>();
  for (const category of categoryRows) {
    const applicationCategories = categoriesByApplication.get(category.appId) ?? [];
    applicationCategories.push({ name: category.name, slug: category.slug });
    categoriesByApplication.set(category.appId, applicationCategories);
  }

  return applicationRows.map((application) => ({
    ...application,
    categories: categoriesByApplication.get(application.id) ?? [],
    icon: icons.get(application.id) ?? null,
  }));
}

export const getSurpriseApplications = unstable_cache(
  querySurpriseApplications,
  ["surprise-applications"],
  { revalidate: false, tags: [PUBLIC_CATALOGUE_CACHE_TAG] },
);

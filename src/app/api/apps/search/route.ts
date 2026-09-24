import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { appCategories, apps, categories } from "@/db/schema";
import { getAppIcons } from "@/lib/directory/directory-shared";

export const dynamic = "force-dynamic";

function escapeLikePattern(value: string) {
  return value.replace(/[!%_]/g, (character) => `!${character}`);
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (query.length < 2) return Response.json({ results: [] });

  const database = await getDatabase();
  const term = query.toLowerCase();
  const escapedTerm = escapeLikePattern(term);
  const pattern = `%${escapedTerm}%`;
  const prefix = `${escapedTerm}%`;
  const applicationRows = await database
    .select({
      id: apps.id,
      slug: apps.slug,
      name: apps.name,
      tagline: apps.tagline,
    })
    .from(apps)
    .where(and(
      eq(apps.status, "published"),
      isNull(apps.deletedAt),
      sql`(
        lower(${apps.name}) like ${pattern} escape '!'
        or lower(${apps.tagline}) like ${pattern} escape '!'
        or lower(${apps.description}) like ${pattern} escape '!'
        or exists (
          select 1 from ${appCategories}
          inner join ${categories} on ${categories.id} = ${appCategories.categoryId}
          where ${appCategories.appId} = ${apps.id} and lower(${categories.name}) like ${pattern} escape '!'
        )
      )`,
    ))
    .orderBy(
      sql`case when lower(${apps.name}) = ${term} then 0 when lower(${apps.name}) like ${prefix} escape '!' then 1 else 2 end`,
      asc(apps.name),
    )
    .limit(8);

  const icons = await getAppIcons(applicationRows.map(({ id }) => id));
  const results = applicationRows.map((application) => {
    const icon = icons.get(application.id);
    return {
      ...application,
      iconStorageKey: icon?.storageKey ?? null,
      iconAltText: icon?.altText ?? null,
    };
  });

  return Response.json(
    { results },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } },
  );
}

import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { apps, deals } from "@/db/schema";
import { cardFields, getAppIcons } from "@/lib/directory/directory-shared";

// Change this list when the editorial order of public deals should change.
const editorialDealSlugs = ["voiceink", "cleanshot-x", "bettertouchtool", "daisydisk"];
const editorialDealPositions = new Map(editorialDealSlugs.map((slug, index) => [slug, index]));

export async function getActiveDeals() {
  const database = await getDatabase();
  const now = new Date();
  const rows = await database
    .select({
      ...cardFields,
      discountPercent: deals.discountPercent,
      code: deals.code,
      url: deals.url,
      endsAt: deals.endsAt,
    })
    .from(deals)
    .innerJoin(apps, eq(apps.id, deals.appId))
    .where(and(
      eq(apps.status, "published"),
      isNull(apps.deletedAt),
      lte(deals.startsAt, now),
      gte(deals.endsAt, now),
    ))
    .orderBy(asc(apps.name));
  const icons = await getAppIcons(rows.map(({ id }) => id));
  return rows
    .sort((left, right) =>
      (editorialDealPositions.get(left.slug) ?? editorialDealSlugs.length) - (editorialDealPositions.get(right.slug) ?? editorialDealSlugs.length)
      || left.name.localeCompare(right.name),
    )
    .map((row) => ({ ...row, icon: icons.get(row.id) ?? null }));
}

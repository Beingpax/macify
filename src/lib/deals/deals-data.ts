import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { apps, deals } from "@/db/schema";
import { cardFields, getAppIcons } from "@/lib/directory/directory-shared";

export async function getActiveDeals(limit = 12) {
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
    .orderBy(asc(deals.endsAt))
    .limit(limit);
  const icons = await getAppIcons(rows.map(({ id }) => id));
  return rows.map((row) => ({ ...row, icon: icons.get(row.id) ?? null }));
}

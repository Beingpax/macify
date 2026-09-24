import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import {
  apps,
  mediaAssets,
} from "@/db/schema";

export async function getMediaManagementData() {
  const database = await getDatabase();
  const [records, totals] = await Promise.all([
    database
      .select({
        id: mediaAssets.id,
        appId: mediaAssets.appId,
        appName: apps.name,
        appStatus: apps.status,
        role: mediaAssets.role,
        storageKey: mediaAssets.storageKey,
        mimeType: mediaAssets.mimeType,
        byteSize: mediaAssets.byteSize,
        sourceUrl: mediaAssets.sourceUrl,
        altText: mediaAssets.altText,
        createdAt: mediaAssets.createdAt,
      })
      .from(mediaAssets)
      .leftJoin(apps, and(eq(apps.id, mediaAssets.appId), isNull(apps.deletedAt)))
      .where(sql`${mediaAssets.role} <> 'audio'`)
      .orderBy(desc(mediaAssets.createdAt)),
    database
      .select({ count: count(), bytes: sql<number>`coalesce(sum(${mediaAssets.byteSize}), 0)` })
      .from(mediaAssets)
      .where(sql`${mediaAssets.role} <> 'audio'`),
  ]);
  return { records, totals: totals[0] ?? { count: 0, bytes: 0 } };
}

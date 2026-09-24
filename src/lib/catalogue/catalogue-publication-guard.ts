import { sql } from "drizzle-orm";

// Used by the final statement of the atomic publication batch. A concurrent
// decision or newer sync must roll back *all* listing writes, not merely skip
// the revision update. NULL deliberately violates status's NOT NULL constraint.
export function publicationStatus(revisionId: string, sourcePath: string, createdAt: Date) {
  return sql`case when status = 'pending' and not exists (
    select 1 from catalogue_revisions as newer
    where newer.source_path = ${sourcePath}
      and newer.id <> ${revisionId}
      and newer.created_at >= ${createdAt.getTime()}
  ) then 'published' else null end`;
}

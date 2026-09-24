import { and, desc, eq, isNull, lte, ne } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { apps, catalogueRevisions, deals, mediaAssets } from "@/db/schema";
import type { CataloguePreparedMedia } from "@/db/schema";
import {
  catalogueManifestSchema,
  manifestMediaSources,
  type CatalogueManifest,
} from "@/lib/catalogue/catalogue-manifest";
import { dealManifestSchema } from "@/lib/deals/deal-manifest";
import { prepareMediaSource, putPreparedMedia } from "@/lib/media/media-upload";

type CatalogueSyncItem = {
  changeType: "upsert" | "delete";
  path: string;
  manifest?: unknown;
  sourceError?: string;
};

export async function ingestCatalogueItem(
  item: CatalogueSyncItem,
  source: { repository: string; commitSha: string },
  env: CloudflareEnv,
) {
  if (/^catalog\/deals\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(item.path)) {
    return ingestDealItem(item, source);
  }
  return ingestApplicationItem(item, source, env);
}

async function ingestApplicationItem(
  item: CatalogueSyncItem,
  source: { repository: string; commitSha: string },
  env: CloudflareEnv,
) {
  if (!/^catalog\/apps\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(item.path)) {
    return { ok: false, status: 400, error: "The catalogue path is invalid." } as const;
  }
  const pathSlug = item.path.slice("catalog/apps/".length, -".json".length);
  const database = await getDatabase();
  const duplicate = await database
    .select({ id: catalogueRevisions.id, status: catalogueRevisions.status, createdAt: catalogueRevisions.createdAt })
    .from(catalogueRevisions)
    .where(and(
      eq(catalogueRevisions.sourceCommitSha, source.commitSha),
      eq(catalogueRevisions.sourcePath, item.path),
    ))
    .limit(1);
  if (duplicate[0] && duplicate[0].status !== "failed") {
    await resolveOlderFailures(database, item.path, duplicate[0].createdAt);
    return { ok: true, duplicate: true, revisionId: duplicate[0].id } as const;
  }
  const retryRevisionId = duplicate[0]?.id;

  let current = await database
    .select({ id: apps.id })
    .from(apps)
    .where(and(eq(apps.slug, pathSlug), isNull(apps.deletedAt)))
    .limit(1);

  if (item.changeType === "delete") {
    if (!current[0]) {
      await resolveOlderFailures(database, item.path);
      return { ok: true, ignored: true, reason: "Application does not exist." } as const;
    }
    const id = crypto.randomUUID();
    const createdAt = new Date();
    await database.batch([
      database.insert(catalogueRevisions).values({
      id,
      appId: current[0].id,
      appSlug: pathSlug,
      changeType: "archive",
      sourceRepository: source.repository,
      sourcePath: item.path,
      sourceCommitSha: source.commitSha,
      manifestHash: await sha256Hex("deleted"),
      manifest: null,
      preparedMedia: [],
      errors: [],
      createdAt,
      }),
      resolveOlderFailuresQuery(database, item.path, createdAt),
      supersedeOlderPendingQuery(database, item.path, id, createdAt),
    ]);
    return { ok: true, revisionId: id } as const;
  }

  const parsed = catalogueManifestSchema.safeParse(item.manifest);
  if (!parsed.success || parsed.data.slug !== pathSlug) {
    const details = item.sourceError ? [item.sourceError] : parsed.success
      ? ["Manifest slug must match its filename."]
      : parsed.error.issues.map((issue) => `${issue.path.join(".") || "manifest"}: ${issue.message}`);
    const revisionId = retryRevisionId ?? crypto.randomUUID();
    const createdAt = duplicate[0]?.createdAt ?? new Date();
    const failedValues = {
      appId: current[0]?.id ?? null,
      appSlug: pathSlug,
      changeType: current[0] ? "update" as const : "create" as const,
      status: "failed" as const,
      sourceRepository: source.repository,
      sourcePath: item.path,
      sourceCommitSha: source.commitSha,
      manifestHash: await sha256Hex(JSON.stringify(item.manifest ?? null)),
      manifest: manifestRecord(item.manifest),
      preparedMedia: [],
      errors: details,
    };
    const writeFailure = retryRevisionId
      ? database.update(catalogueRevisions).set(failedValues).where(eq(catalogueRevisions.id, retryRevisionId))
      : database.insert(catalogueRevisions).values({ id: revisionId, ...failedValues, createdAt });
    await database.batch([writeFailure, supersedeOlderPendingQuery(database, item.path, revisionId, createdAt)]);
    return { ok: false, status: 422, error: "Manifest validation failed.", details, revisionId } as const;
  }

  if (!current[0]) {
    current = await database.select({ id: apps.id }).from(apps)
      .where(and(eq(apps.websiteUrl, parsed.data.websiteUrl), isNull(apps.deletedAt))).limit(1);
  }

  const canonicalManifest = JSON.stringify(parsed.data);
  const manifestHash = await sha256Hex(canonicalManifest);
  const unchanged = await database
    .select({ id: catalogueRevisions.id, createdAt: catalogueRevisions.createdAt, manifestHash: catalogueRevisions.manifestHash, status: catalogueRevisions.status })
    .from(catalogueRevisions)
    .where(and(
      eq(catalogueRevisions.sourcePath, item.path),
    ))
    .orderBy(desc(catalogueRevisions.createdAt))
    .limit(1);
  if (unchanged[0]?.manifestHash === manifestHash && ["pending", "published", "rejected", "dismissed"].includes(unchanged[0].status)) {
    await resolveOlderFailures(database, item.path, unchanged[0].createdAt);
    return { ok: true, ignored: true, reason: "Manifest content is unchanged." } as const;
  }

  const revisionId = retryRevisionId ?? crypto.randomUUID();
  const prepared = await prepareRevisionMedia(parsed.data, current[0]?.id, revisionId, env);
  if (!prepared.ok) {
    const createdAt = duplicate[0]?.createdAt ?? new Date();
    const failedValues = {
      appId: current[0]?.id ?? null,
      appSlug: pathSlug,
      changeType: current[0] ? "update" as const : "create" as const,
      status: "failed" as const,
      sourceRepository: source.repository,
      sourcePath: item.path,
      sourceCommitSha: source.commitSha,
      manifestHash,
      manifest: parsed.data,
      preparedMedia: [],
      errors: [prepared.error],
    };
    const writeFailure = retryRevisionId
      ? database.update(catalogueRevisions).set(failedValues).where(eq(catalogueRevisions.id, retryRevisionId))
      : database.insert(catalogueRevisions).values({ id: revisionId, ...failedValues, createdAt });
    await database.batch([writeFailure, supersedeOlderPendingQuery(database, item.path, revisionId, createdAt)]);
    return { ok: false, status: 422, error: prepared.error, revisionId } as const;
  }

  const readyValues = {
    appId: current[0]?.id ?? null,
    appSlug: pathSlug,
    changeType: current[0] ? "update" as const : "create" as const,
    sourceRepository: source.repository,
    sourcePath: item.path,
    sourceCommitSha: source.commitSha,
    manifestHash,
    manifest: parsed.data,
    preparedMedia: prepared.media,
    errors: [],
    status: "pending" as const,
  };
  const createdAt = duplicate[0]?.createdAt ?? new Date();
  const writeRevision = retryRevisionId
    ? database.update(catalogueRevisions).set(readyValues).where(eq(catalogueRevisions.id, retryRevisionId))
    : database.insert(catalogueRevisions).values({ id: revisionId, ...readyValues, createdAt });
  try {
    await database.batch([
      writeRevision,
      resolveOlderFailuresQuery(database, item.path, createdAt),
      supersedeOlderPendingQuery(database, item.path, revisionId, createdAt),
    ]);
  } catch (error) {
    if (prepared.storedKeys.length) {
      try {
        await env.MEDIA.delete(prepared.storedKeys);
      } catch (cleanupError) {
        console.error("Catalogue revision write failed and its prepared media could not be removed.", cleanupError);
      }
    }
    throw error;
  }
  return { ok: true, revisionId } as const;
}

async function ingestDealItem(
  item: CatalogueSyncItem,
  source: { repository: string; commitSha: string },
) {
  const pathSlug = item.path.slice("catalog/deals/".length, -".json".length);
  const database = await getDatabase();
  const duplicate = await database.select({ id: catalogueRevisions.id, status: catalogueRevisions.status, createdAt: catalogueRevisions.createdAt })
    .from(catalogueRevisions).where(and(
      eq(catalogueRevisions.sourceCommitSha, source.commitSha),
      eq(catalogueRevisions.sourcePath, item.path),
    )).limit(1);
  if (duplicate[0] && duplicate[0].status !== "failed") {
    await resolveOlderFailures(database, item.path, duplicate[0].createdAt);
    return { ok: true, duplicate: true, revisionId: duplicate[0].id } as const;
  }
  const retryRevisionId = duplicate[0]?.id;
  const applicationRows = await database.select({ id: apps.id }).from(apps)
    .where(and(eq(apps.slug, pathSlug), isNull(apps.deletedAt))).limit(1);
  const appId = applicationRows[0]?.id ?? null;
  const dealRows = appId
    ? await database.select({ id: deals.id }).from(deals).where(eq(deals.appId, appId)).limit(1)
    : [];
  const currentDeal = dealRows[0] ?? null;

  if (item.changeType === "delete") {
    if (!currentDeal) {
      await resolveOlderFailures(database, item.path);
      return { ok: true, ignored: true, reason: "Deal does not exist." } as const;
    }
    const revisionId = crypto.randomUUID();
    const createdAt = new Date();
    await database.batch([
      database.insert(catalogueRevisions).values({
      id: revisionId,
      appId,
      appSlug: pathSlug,
      changeType: "archive",
      sourceRepository: source.repository,
      sourcePath: item.path,
      sourceCommitSha: source.commitSha,
      manifestHash: await sha256Hex("deleted-deal"),
      manifest: null,
      preparedMedia: [],
      errors: [],
      createdAt,
      }),
      resolveOlderFailuresQuery(database, item.path, createdAt),
      supersedeOlderPendingQuery(database, item.path, revisionId, createdAt),
    ]);
    return { ok: true, revisionId } as const;
  }

  const parsed = dealManifestSchema.safeParse(item.manifest);
  if (!parsed.success || parsed.data.appSlug !== pathSlug) {
    const details = item.sourceError ? [item.sourceError] : parsed.success
      ? ["Deal appSlug must match its filename."]
      : parsed.error.issues.map((issue) => `${issue.path.join(".") || "manifest"}: ${issue.message}`);
    const revisionId = retryRevisionId ?? crypto.randomUUID();
    const createdAt = duplicate[0]?.createdAt ?? new Date();
    const failedValues = {
      appId,
      appSlug: pathSlug,
      changeType: currentDeal ? "update" as const : "create" as const,
      status: "failed" as const,
      sourceRepository: source.repository,
      sourcePath: item.path,
      sourceCommitSha: source.commitSha,
      manifestHash: await sha256Hex(JSON.stringify(item.manifest ?? null)),
      manifest: manifestRecord(item.manifest),
      preparedMedia: [],
      errors: details,
    };
    const writeFailure = retryRevisionId
      ? database.update(catalogueRevisions).set(failedValues).where(eq(catalogueRevisions.id, retryRevisionId))
      : database.insert(catalogueRevisions).values({ id: revisionId, ...failedValues, createdAt });
    await database.batch([writeFailure, supersedeOlderPendingQuery(database, item.path, revisionId, createdAt)]);
    return { ok: false, status: 422, error: "Deal manifest validation failed.", details, revisionId } as const;
  }

  const canonicalManifest = JSON.stringify(parsed.data);
  const manifestHash = await sha256Hex(canonicalManifest);
  const unchanged = await database.select({ id: catalogueRevisions.id, createdAt: catalogueRevisions.createdAt, manifestHash: catalogueRevisions.manifestHash, status: catalogueRevisions.status }).from(catalogueRevisions)
    .where(and(
      eq(catalogueRevisions.sourcePath, item.path),
    )).orderBy(desc(catalogueRevisions.createdAt)).limit(1);
  if (unchanged[0]?.manifestHash === manifestHash && ["pending", "published", "rejected", "dismissed"].includes(unchanged[0].status)) {
    await resolveOlderFailures(database, item.path, unchanged[0].createdAt);
    return { ok: true, ignored: true, reason: "Deal manifest content is unchanged." } as const;
  }

  const revisionId = retryRevisionId ?? crypto.randomUUID();
  const values = {
    appId,
    appSlug: pathSlug,
    changeType: currentDeal ? "update" as const : "create" as const,
    sourceRepository: source.repository,
    sourcePath: item.path,
    sourceCommitSha: source.commitSha,
    manifestHash,
    manifest: parsed.data,
    preparedMedia: [],
    errors: [],
    status: "pending" as const,
  };
  const createdAt = duplicate[0]?.createdAt ?? new Date();
  const writeRevision = retryRevisionId
    ? database.update(catalogueRevisions).set(values).where(eq(catalogueRevisions.id, retryRevisionId))
    : database.insert(catalogueRevisions).values({ id: revisionId, ...values, createdAt });
  await database.batch([
    writeRevision,
    resolveOlderFailuresQuery(database, item.path, createdAt),
    supersedeOlderPendingQuery(database, item.path, revisionId, createdAt),
  ]);
  return { ok: true, revisionId } as const;
}

async function resolveOlderFailures(
  database: Awaited<ReturnType<typeof getDatabase>>,
  sourcePath: string,
  through: Date = new Date(),
) {
  await resolveOlderFailuresQuery(database, sourcePath, through);
}

function resolveOlderFailuresQuery(
  database: Awaited<ReturnType<typeof getDatabase>>,
  sourcePath: string,
  through: Date,
) {
  return database.update(catalogueRevisions).set({ status: "resolved", reviewedAt: new Date() }).where(and(
    eq(catalogueRevisions.sourcePath, sourcePath),
    eq(catalogueRevisions.status, "failed"),
    lte(catalogueRevisions.createdAt, through),
  ));
}

function supersedeOlderPendingQuery(
  database: Awaited<ReturnType<typeof getDatabase>>,
  sourcePath: string,
  currentRevisionId: string,
  through: Date,
) {
  return database.update(catalogueRevisions).set({ status: "superseded", reviewedAt: new Date() }).where(and(
    eq(catalogueRevisions.sourcePath, sourcePath),
    eq(catalogueRevisions.status, "pending"),
    ne(catalogueRevisions.id, currentRevisionId),
    lte(catalogueRevisions.createdAt, through),
  ));
}

function manifestRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

async function prepareRevisionMedia(
  manifest: CatalogueManifest,
  appId: string | undefined,
  revisionId: string,
  env: CloudflareEnv,
) {
  const database = await getDatabase();
  const existing = appId
    ? await database.select().from(mediaAssets).where(eq(mediaAssets.appId, appId))
    : [];
  const reusable = new Map(existing.map((asset) => [`${asset.role}:${asset.sourceUrl ?? ""}`, asset]));
  const prepared: CataloguePreparedMedia[] = [];
  const newlyStoredKeys: string[] = [];

  try {
    for (const source of manifestMediaSources(manifest)) {
      const prior = reusable.get(`${source.role}:${source.sourceUrl}`);
      if (prior) {
        prepared.push({
          id: crypto.randomUUID(),
          role: source.role,
          storageKey: prior.storageKey,
          mimeType: prior.mimeType,
          byteSize: prior.byteSize,
          width: prior.width,
          height: prior.height,
          checksum: prior.checksum,
          sourceUrl: source.sourceUrl,
          altText: source.altText,
        });
        continue;
      }

      const result = await prepareMediaSource(
        `revision-${revisionId}`,
        source.role,
        null,
        source.sourceUrl,
        source.altText,
        env.IMAGES,
      );
      if (!result.ok) throw new Error(`${source.role}: ${result.error}`);
      await putPreparedMedia(env.MEDIA, result.media);
      newlyStoredKeys.push(result.media.storageKey);
      prepared.push({
        id: result.media.id,
        role: result.media.role,
        storageKey: result.media.storageKey,
        mimeType: result.media.mimeType,
        byteSize: result.media.byteSize,
        width: result.media.width,
        height: result.media.height,
        checksum: result.media.checksum,
        sourceUrl: result.media.sourceUrl ?? source.sourceUrl,
        altText: result.media.altText ?? source.altText,
      });
      if (prepared.reduce((total, asset) => total + asset.byteSize, 0) > 40 * 1024 * 1024) {
        throw new Error("Combined optimized media exceeds the 40 MB application limit.");
      }
    }
  } catch (error) {
    if (newlyStoredKeys.length) {
      try {
        await env.MEDIA.delete(newlyStoredKeys);
      } catch (cleanupError) {
        console.error("Media preparation failed and cleanup also failed.", { revisionId, cleanupError });
      }
    }
    return { ok: false, error: error instanceof Error ? error.message : "Media preparation failed." } as const;
  }
  return { ok: true, media: prepared, storedKeys: newlyStoredKeys } as const;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

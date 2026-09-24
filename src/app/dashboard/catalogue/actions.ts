"use server";

import { and, desc, eq, inArray, isNull, like, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDatabase } from "@/db/client";
import {
  appCategories,
  appRelationships,
  apps,
  catalogueRevisions,
  categories,
  deals,
  mediaAssets,
} from "@/db/schema";
import { catalogueManifestSchema } from "@/lib/catalogue/catalogue-manifest";
import { ingestCatalogueItem } from "@/lib/catalogue/catalogue-ingestion";
import { dealManifestSchema } from "@/lib/deals/deal-manifest";
import { publicationStatus } from "@/lib/catalogue/catalogue-publication-guard";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { invalidatePublicCatalogueCache } from "@/lib/shared/public-cache";

const decisionSchema = z.object({
  revisionId: z.uuid(),
  intent: z.enum(["publish", "reject"]),
});

const bulkDecisionSchema = z.object({
  revisionIds: z.array(z.uuid()).min(1).max(100),
  intent: z.enum(["publish", "reject"]),
});
const bulkReviewQueryBatchSize = 75;

type DecisionIntent = z.infer<typeof decisionSchema>["intent"];

class CatalogueDecisionError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

const failureActionSchema = z.object({ revisionId: z.uuid() });

function reviewQueuePath(formData: FormData) {
  return formData.get("returnPath") === "/dashboard/deals" ? "/dashboard/deals" : "/dashboard/catalogue";
}

function reviewSourcePattern(queuePath: ReturnType<typeof reviewQueuePath>) {
  return queuePath === "/dashboard/deals" ? "catalog/deals/%" : "catalog/apps/%";
}

export async function retryCatalogueFailure(formData: FormData) {
  await requireAdmin();
  const queuePath = reviewQueuePath(formData);
  const parsed = failureActionSchema.safeParse({ revisionId: formData.get("revisionId") });
  if (!parsed.success) redirect(`${queuePath}?view=failed&error=invalid`);

  const database = await getDatabase();
  const rows = await database.select().from(catalogueRevisions).where(and(
    eq(catalogueRevisions.id, parsed.data.revisionId),
    eq(catalogueRevisions.status, "failed"),
    like(catalogueRevisions.sourcePath, reviewSourcePattern(queuePath)),
  )).limit(1);
  const revision = rows[0];
  if (!revision) redirect(`${queuePath}?view=failed&error=not-failed`);
  if (!revision.manifest) redirect(`${queuePath}?view=failed&error=missing-retry-manifest`);
  const newest = await database.select({ id: catalogueRevisions.id }).from(catalogueRevisions)
    .where(eq(catalogueRevisions.sourcePath, revision.sourcePath))
    .orderBy(desc(catalogueRevisions.createdAt)).limit(1);
  if (newest[0]?.id !== revision.id) redirect(`${queuePath}?view=failed&error=stale-revision`);

  const { env } = await getCloudflareContext({ async: true });
  const result = await ingestCatalogueItem({
    changeType: "upsert",
    path: revision.sourcePath,
    manifest: revision.manifest,
  }, {
    repository: revision.sourceRepository,
    commitSha: revision.sourceCommitSha,
  }, env);

  revalidatePath("/dashboard", "layout");
  revalidatePath(`/dashboard/catalogue/${revision.id}`);
  if (!result.ok) redirect(`${queuePath}?view=failed&error=retry-failed`);
  redirect(`${queuePath}?retried=1`);
}

export async function dismissCatalogueFailure(formData: FormData) {
  await requireAdmin();
  const queuePath = reviewQueuePath(formData);
  const parsed = failureActionSchema.safeParse({ revisionId: formData.get("revisionId") });
  if (!parsed.success) redirect(`${queuePath}?view=failed&error=invalid`);

  const database = await getDatabase();
  const result = await database.update(catalogueRevisions).set({
    status: "dismissed",
    reviewedAt: new Date(),
  }).where(and(
    eq(catalogueRevisions.id, parsed.data.revisionId),
    eq(catalogueRevisions.status, "failed"),
    like(catalogueRevisions.sourcePath, reviewSourcePattern(queuePath)),
  )).returning({ id: catalogueRevisions.id });
  if (result.length === 0) redirect(`${queuePath}?view=failed&error=not-failed`);

  revalidatePath("/dashboard", "layout");
  redirect(`${queuePath}?view=failed&dismissed=1`);
}

export async function decideCatalogueRevision(formData: FormData) {
  await requireAdmin();
  const queuePath = reviewQueuePath(formData);
  const parsed = decisionSchema.safeParse({
    revisionId: formData.get("revisionId"),
    intent: formData.get("intent"),
  });
  if (!parsed.success) redirect(`${queuePath}?error=invalid`);

  try {
    await applyCatalogueDecision(parsed.data.revisionId, parsed.data.intent, reviewSourcePattern(queuePath));
  } catch (error) {
    await recordDecisionFailure(parsed.data.revisionId, parsed.data.intent, error);
    revalidateCataloguePaths();
    redirect(`${queuePath}?error=${error instanceof CatalogueDecisionError ? error.code : "decision-failed"}`);
  }

  revalidateCataloguePaths();
  redirect(`${queuePath}?${parsed.data.intent === "publish" ? "published" : "rejected"}=1`);
}

export async function decideCatalogueRevisions(formData: FormData) {
  await requireAdmin();
  const queuePath = reviewQueuePath(formData);
  const parsed = bulkDecisionSchema.safeParse({
    revisionIds: [...new Set(formData.getAll("revisionId"))],
    intent: formData.get("intent"),
  });
  if (!parsed.success) redirect(`${queuePath}?error=invalid-selection`);

  const database = await getDatabase();
  const sourcePattern = reviewSourcePattern(queuePath);
  const selected: Array<Pick<typeof catalogueRevisions.$inferSelect, "id" | "sourcePath" | "createdAt">> = [];
  for (let offset = 0; offset < parsed.data.revisionIds.length; offset += bulkReviewQueryBatchSize) {
    const revisionIds = parsed.data.revisionIds.slice(offset, offset + bulkReviewQueryBatchSize);
    const batch = await database.select({
      id: catalogueRevisions.id,
      sourcePath: catalogueRevisions.sourcePath,
      createdAt: catalogueRevisions.createdAt,
    }).from(catalogueRevisions).where(and(
      inArray(catalogueRevisions.id, revisionIds),
      eq(catalogueRevisions.status, "pending"),
      like(catalogueRevisions.sourcePath, sourcePattern),
    ));
    selected.push(...batch);
  }

  const selectedIds = new Set(selected.map(({ id }) => id));
  let failed = parsed.data.revisionIds.length - selectedIds.size;
  let completed = 0;
  const ordered = selected.sort((left, right) => {
    const leftIsDeal = left.sourcePath.startsWith("catalog/deals/");
    const rightIsDeal = right.sourcePath.startsWith("catalog/deals/");
    return Number(leftIsDeal) - Number(rightIsDeal) || left.createdAt.getTime() - right.createdAt.getTime();
  });
  let remaining = ordered.map(({ id }) => id);

  // Each productive pass resolves another dependency level; stop when no progress is possible.
  for (let pass = 0; pass < ordered.length && remaining.length > 0; pass += 1) {
    const retry: string[] = [];
    for (const revisionId of remaining) {
      try {
        await applyCatalogueDecision(revisionId, parsed.data.intent, sourcePattern);
        completed += 1;
      } catch (error) {
        await recordDecisionFailure(revisionId, parsed.data.intent, error);
        if (error instanceof CatalogueDecisionError && error.code === "missing-related-app") {
          retry.push(revisionId);
        } else {
          failed += 1;
        }
      }
    }
    if (retry.length === remaining.length) {
      remaining = retry;
      break;
    }
    remaining = retry;
  }
  failed += remaining.length;

  revalidateCataloguePaths();
  const params = new URLSearchParams({
    bulkIntent: parsed.data.intent,
    bulkCompleted: String(completed),
    bulkFailed: String(failed),
  });
  redirect(`${queuePath}?${params}`);
}

async function applyCatalogueDecision(revisionId: string, intent: DecisionIntent, sourcePattern: string) {

  const database = await getDatabase();
  const row = await database
    .select()
    .from(catalogueRevisions)
    .where(and(
      eq(catalogueRevisions.id, revisionId),
      eq(catalogueRevisions.status, "pending"),
      like(catalogueRevisions.sourcePath, sourcePattern),
    ))
    .limit(1);
  const revision = row[0];
  if (!revision) throw new CatalogueDecisionError("not-pending");
  const isApplicationRevision = revision.sourcePath.startsWith("catalog/apps/");
  const isDealRevision = revision.sourcePath.startsWith("catalog/deals/");
  if (!isApplicationRevision && !isDealRevision) throw new CatalogueDecisionError("invalid");

  const newestRevision = await database.select({ id: catalogueRevisions.id }).from(catalogueRevisions)
    .where(eq(catalogueRevisions.sourcePath, revision.sourcePath))
    .orderBy(desc(catalogueRevisions.createdAt)).limit(1);
  if (newestRevision[0]?.id !== revision.id) throw new CatalogueDecisionError("stale-revision");

  if (intent === "reject") {
    const rejected = await database.update(catalogueRevisions).set({ status: "rejected", reviewedAt: new Date() })
      .where(and(eq(catalogueRevisions.id, revision.id), eq(catalogueRevisions.status, "pending")))
      .returning({ id: catalogueRevisions.id });
    if (rejected.length === 0) throw new CatalogueDecisionError("not-pending");
    return;
  }

  if (isDealRevision) {
    const applicationRows = await database.select({ id: apps.id, status: apps.status }).from(apps)
      .where(and(eq(apps.slug, revision.appSlug), isNull(apps.deletedAt))).limit(1);
    const application = applicationRows[0];
    if (!application || (revision.changeType !== "archive" && application.status !== "published")) {
      throw new CatalogueDecisionError("missing-deal-app");
    }

    const reviewedAt = new Date();
    if (revision.changeType === "archive") {
      await database.batch([
        database.delete(deals).where(eq(deals.appId, application.id)),
        database.update(catalogueRevisions).set({ appId: application.id, status: publicationStatus(revision.id, revision.sourcePath, revision.createdAt), errors: [], reviewedAt })
          .where(eq(catalogueRevisions.id, revision.id)),
      ]);
    } else {
      const manifestResult = dealManifestSchema.safeParse(revision.manifest);
      if (!manifestResult.success) throw new CatalogueDecisionError("invalid-deal-manifest");
      const manifest = manifestResult.data;
      const values = {
        discountPercent: manifest.discountPercent,
        code: manifest.code,
        url: manifest.url,
        startsAt: new Date(manifest.startsAt),
        endsAt: new Date(manifest.endsAt),
        updatedAt: reviewedAt,
      };
      await database.batch([
        database.insert(deals).values({
          id: crypto.randomUUID(),
          appId: application.id,
          ...values,
          createdAt: reviewedAt,
        }).onConflictDoUpdate({ target: deals.appId, set: values }),
        database.update(catalogueRevisions).set({ appId: application.id, status: publicationStatus(revision.id, revision.sourcePath, revision.createdAt), errors: [], reviewedAt })
          .where(eq(catalogueRevisions.id, revision.id)),
      ]);
    }

    return;
  }

  if (revision.changeType === "archive") {
    if (!revision.appId) throw new CatalogueDecisionError("missing-app");
    await database.batch([
      database.update(apps).set({ status: "archived", isFeatured: false, isEditorsPick: false, featuredAt: null, updatedAt: new Date() }).where(eq(apps.id, revision.appId)),
      database.update(catalogueRevisions).set({ status: publicationStatus(revision.id, revision.sourcePath, revision.createdAt), errors: [], reviewedAt: new Date() })
        .where(eq(catalogueRevisions.id, revision.id)),
    ]);
    return;
  }

  const manifestResult = catalogueManifestSchema.safeParse(revision.manifest);
  if (!manifestResult.success) throw new CatalogueDecisionError("invalid-manifest");
  const manifest = manifestResult.data;
  const appId = revision.appId ?? crypto.randomUUID();
  const relatedSlugs = [...new Set(manifest.relatedAppSlugs)].filter((slug) => slug !== manifest.slug);
  const related = relatedSlugs.length
    ? await database.select({ id: apps.id, slug: apps.slug }).from(apps)
      .where(and(inArray(apps.slug, relatedSlugs), isNull(apps.deletedAt)))
    : [];
  if (related.length !== relatedSlugs.length) throw new CatalogueDecisionError("missing-related-app");
  if (!revision.preparedMedia.some((asset) => asset.role === "icon")
    || !revision.preparedMedia.some((asset) => asset.role === "preview_image")) {
    throw new CatalogueDecisionError("missing-media");
  }

  const now = new Date();
  const appValues = {
    name: manifest.name,
    slug: manifest.slug,
    websiteUrl: manifest.websiteUrl,
    tagline: manifest.tagline,
    description: manifest.description,
    pricingType: manifest.pricingType,
    billingType: manifest.billingType,
    pricingDetails: manifest.pricingDetails,
    sourceType: manifest.sourceType,
    youtubeUrl: manifest.youtubeUrl,
    status: "published" as const,
    isFeatured: manifest.isFeatured,
    isEditorsPick: manifest.isEditorsPick,
    featuredAt: manifest.isFeatured ? now : null,
    publishedAt: now,
    updatedAt: now,
  };
  const normalizedCategories = normalizeManifestCategories(manifest.categories);
  const appQuery = revision.changeType === "create"
    ? database.insert(apps).values({ id: appId, ...appValues, createdAt: now })
    : database.update(apps).set({ ...appValues, publishedAt: sql`coalesce(${apps.publishedAt}, ${now.getTime()})` }).where(and(eq(apps.id, appId), isNull(apps.deletedAt)));

  await database.batch([
    appQuery,
    database.delete(appCategories).where(eq(appCategories.appId, appId)),
    ...normalizedCategories.flatMap(({ name, slug }) => [
      database.insert(categories).values({ id: `category-${slug}`, name, slug, createdAt: now })
        .onConflictDoUpdate({ target: categories.slug, set: { name } }),
      database.insert(appCategories).values({
        appId,
        categoryId: sql`(select ${categories.id} from ${categories} where ${categories.slug} = ${slug})`,
      }),
    ]),
    database.delete(appRelationships).where(eq(appRelationships.sourceAppId, appId)),
    ...related.map(({ id: relatedId }) => {
      return database.insert(appRelationships).values({
        id: crypto.randomUUID(),
        sourceAppId: appId,
        targetAppId: relatedId,
        createdAt: now,
      }).onConflictDoNothing();
    }),
    database.delete(mediaAssets).where(eq(mediaAssets.appId, appId)),
    ...revision.preparedMedia.map((asset) => database.insert(mediaAssets).values({
      ...asset,
      appId,
      sourceUrl: asset.sourceUrl,
      altText: asset.altText,
      createdAt: now,
    })),
    database.update(catalogueRevisions).set({ appId, status: publicationStatus(revision.id, revision.sourcePath, revision.createdAt), errors: [], reviewedAt: now })
      .where(eq(catalogueRevisions.id, revision.id)),
  ]);

  // Retain stored media: other pending revisions and review history reference it.
  // Reclamation requires a separate reference-aware retention process.

}

function revalidateCataloguePaths() {
  invalidatePublicCatalogueCache();
  revalidatePath("/");
  revalidatePath("/deals");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/categories", "layout");
  revalidatePath("/sitemap.xml");
  revalidatePath("/apps/[slug]", "page");
}

function normalizeManifestCategories(values: string[]) {
  const seen = new Set<string>();
  return values.map((name) => ({
    name: name.trim().replace(/\s+/g, " "),
    slug: name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
  })).filter(({ slug }) => slug.length >= 2 && !seen.has(slug) && seen.add(slug));
}

async function recordDecisionFailure(revisionId: string, intent: DecisionIntent, error: unknown) {
  const message = error instanceof CatalogueDecisionError
    ? `Could not ${intent}: ${error.code}.`
    : `Could not ${intent} because of an internal error. Retry after checking the server logs.`;
  console.error("Catalogue decision failed.", { revisionId, intent, error });
  try {
    const database = await getDatabase();
    await database.update(catalogueRevisions).set({ errors: [message] })
      .where(and(eq(catalogueRevisions.id, revisionId), eq(catalogueRevisions.status, "pending")));
  } catch (loggingError) {
    console.error("Could not persist catalogue decision failure.", { revisionId, loggingError });
  }
}

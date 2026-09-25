import { PendingSubmitButton } from "@/components/forms/pending-submit-button";
import Image from "next/image";
import Link from "next/link";
import { and, desc, eq, inArray, like, sql } from "drizzle-orm";
import { AlertTriangle, CheckCircle2, GitBranch } from "lucide-react";
import { dismissCatalogueFailure, retryCatalogueFailure } from "@/app/dashboard/catalogue/actions";
import { CatalogueBulkReview } from "@/components/dashboard/catalogue-bulk-review";
import { getDatabase } from "@/db/client";
import { catalogueRevisions } from "@/db/schema";
import { catalogueManifestSchema } from "@/lib/catalogue/catalogue-manifest";
import type { CatalogueManifest } from "@/lib/catalogue/catalogue-manifest";
import { dealManifestSchema } from "@/lib/deals/deal-manifest";
import type { DealManifest } from "@/lib/deals/deal-manifest";
import { revisionChangeLabels, revisionStatusLabels } from "@/lib/catalogue/catalogue-revision-labels";
import { getCatalogueQueueApplications } from "@/lib/catalogue/catalogue-review-data";
import { cn } from "@/lib/shared/utils";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  invalid: "That review request was invalid.",
  "decision-failed": "The decision could not be completed. Open the revision for details and check its current state before retrying.",
  "not-pending": "That revision has already been reviewed.",
  "missing-app": "The application linked to this archive request no longer exists.",
  "invalid-manifest": "The stored manifest is invalid and cannot be published.",
  "missing-media": "The revision is missing its required icon or preview image.",
  "missing-deal-app": "Publish the application before publishing its deal.",
  "invalid-deal-manifest": "The stored deal manifest is invalid and cannot be published.",
  "stale-revision": "A newer revision exists for this application. Review the newest revision instead.",
  "not-failed": "That synchronization failure is no longer unresolved.",
  "missing-retry-manifest": "This failure has no retryable manifest. Correct the file in GitHub and synchronize it again.",
  "retry-failed": "Synchronization failed again. Open the revision to review the latest error.",
  "invalid-selection": "Select at least one pending revision to continue.",
};

type View = "pending" | "history" | "failed";

export default async function CatalogueReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ published?: string; rejected?: string; dismissed?: string; retried?: string; error?: string; view?: string; bulkIntent?: string; bulkCompleted?: string; bulkFailed?: string; page?: string }>;
}) {
  return <ReviewQueuePage kind="apps" searchParams={searchParams} />;
}

export async function ReviewQueuePage({
  kind,
  searchParams,
}: {
  kind: "apps" | "deals";
  searchParams: Promise<{ published?: string; rejected?: string; dismissed?: string; retried?: string; error?: string; view?: string; bulkIntent?: string; bulkCompleted?: string; bulkFailed?: string; page?: string }>;
}) {
  const query = await searchParams;
  const view: View = query.view === "history" || query.view === "failed" ? query.view : "pending";
  const database = await getDatabase();
  const sourcePattern = kind === "deals" ? "catalog/deals/%" : "catalog/apps/%";
  const queuePath = kind === "deals" ? "/dashboard/deals" : "/dashboard/catalogue";
  const queueLabel = kind === "deals" ? "Deal queue" : "App queue";
  const requestedPage = Number(query.page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 10000) : 1;
  const viewCondition = view === "history"
    ? inArray(catalogueRevisions.status, ["published", "rejected", "resolved", "dismissed", "superseded"])
    : eq(catalogueRevisions.status, view);
  const [recentRevisions, countRows] = await Promise.all([
    database.select().from(catalogueRevisions).where(and(like(catalogueRevisions.sourcePath, sourcePattern), viewCondition)).orderBy(desc(catalogueRevisions.createdAt), desc(catalogueRevisions.id)).limit(101).offset((page - 1) * 100),
    database.select({
      pending: sql<number>`coalesce(sum(case when ${catalogueRevisions.status} = 'pending' then 1 else 0 end), 0)`,
      reviewed: sql<number>`coalesce(sum(case when ${catalogueRevisions.status} not in ('pending', 'failed') then 1 else 0 end), 0)`,
      failed: sql<number>`coalesce(sum(case when ${catalogueRevisions.status} = 'failed' then 1 else 0 end), 0)`,
    }).from(catalogueRevisions).where(like(catalogueRevisions.sourcePath, sourcePattern)),
  ]);
  const hasNextPage = recentRevisions.length > 100;
  const revisions = recentRevisions.slice(0, 100);
  const applications = await getCatalogueQueueApplications(
    revisions.flatMap(({ appId }) => appId ? [appId] : []),
  );
  const counts = countRows[0] ?? { pending: 0, reviewed: 0, failed: 0 };

  return (
    <>
      <header className="editor-header editor-header-row">
        <div>
          <h1>{queueLabel}</h1>
          <span>{kind === "deals" ? "Review offer terms before publishing." : "Review listing changes before publishing."}</span>
        </div>
      </header>

      <section className="catalogue-queue-stats" aria-label="Review queue status">
        <div><GitBranch aria-hidden="true" size={18} /><span>Awaiting review</span><strong>{counts.pending}</strong></div>
        <div><AlertTriangle aria-hidden="true" size={18} /><span>Needs attention</span><strong>{counts.failed}</strong></div>
        <div><CheckCircle2 aria-hidden="true" size={18} /><span>In history</span><strong>{counts.reviewed}</strong></div>
      </section>

      {query.published === "1" && <div className="success-banner" role="status"><CheckCircle2 size={17} /> Revision published.</div>}
      {query.rejected === "1" && <div className="success-banner" role="status"><CheckCircle2 size={17} /> Revision rejected. The public listing was not changed.</div>}
      {query.dismissed === "1" && <div className="success-banner" role="status"><CheckCircle2 size={17} /> Failure dismissed and retained in history.</div>}
      {query.retried === "1" && <div className="success-banner" role="status"><CheckCircle2 size={17} /> Synchronization succeeded. Check the pending queue for changes awaiting review.</div>}
      {query.bulkCompleted && Number(query.bulkCompleted) > 0 && (
        <div className="success-banner" role="status"><CheckCircle2 size={17} />
          {query.bulkCompleted} {query.bulkIntent === "reject" ? "rejected" : "published"} successfully.
          {Number(query.bulkFailed) > 0 ? ` ${query.bulkFailed} could not be processed. Open their revisions to check the current state and any errors.` : ""}
        </div>
      )}
      {query.bulkCompleted === "0" && Number(query.bulkFailed) > 0 && <div className="form-error" role="alert">None of the selected revisions could be processed. Open the revisions to check their current state and any errors.</div>}
      {query.error && <div className="form-error" role="alert">{errorMessages[query.error] ?? "The revision could not be reviewed."}</div>}

      <section className="dashboard-panel catalogue-queue-panel" aria-labelledby="revisions-heading">
        <div className="catalogue-queue-toolbar">
          <div>
            <h2 id="revisions-heading">{viewLabel(view)}</h2>
            <p>{viewDescription(view)}</p>
          </div>
          <nav className="catalogue-view-tabs" aria-label={`${queueLabel} views`}>
            <Link prefetch={true} className={cn(view === "pending" && "active")} href={queuePath}>Pending <span>{counts.pending}</span></Link>
            <Link prefetch={true} className={cn(view === "history" && "active")} href={`${queuePath}?view=history`}>History</Link>
            <Link prefetch={true} className={cn(view === "failed" && "active")} href={`${queuePath}?view=failed`}>Failed <span>{counts.failed}</span></Link>
          </nav>
        </div>
        {revisions.length === 0 ? (
          <div className="catalogue-queue-empty">
            <CheckCircle2 aria-hidden="true" size={24} />
            <strong>{page > 1 ? "No revisions on this page" : view === "pending" ? "Everything is reviewed" : view === "failed" ? "No unresolved failures" : "No revisions in this view"}</strong>
            <span>{view === "pending"
              ? "New merged GitHub changes will appear here automatically."
              : view === "failed"
                ? "Resolved and dismissed failures remain available in history."
                : "Choose another queue view to continue."}</span>
          </div>
        ) : (
          <CatalogueBulkReview key={`${view}-${page}-${revisions.map(({ id }) => id).join(",")}`} enabled={view === "pending"} itemCount={revisions.length} returnPath={queuePath}>
          <div className="catalogue-revision-list">
            {revisions.map((revision) => {
              const isDeal = revision.sourcePath.startsWith("catalog/deals/");
              const applicationManifestResult = isDeal ? null : catalogueManifestSchema.safeParse(revision.manifest);
              const manifest = applicationManifestResult?.success ? applicationManifestResult.data : null;
              const dealManifestResult = isDeal ? dealManifestSchema.safeParse(revision.manifest) : null;
              const dealManifest = dealManifestResult?.success ? dealManifestResult.data : null;
              const current = revision.appId ? applications.get(revision.appId) : null;
              const icon = revision.preparedMedia.find(({ role }) => role === "icon")
                ?? current?.media.find(({ role }) => role === "icon");
              const changeLabel = isDeal ? dealChangeLabel(revision.changeType) : revisionChangeLabels[revision.changeType];
              const summary = revision.status === "pending"
                ? isDeal ? summarizeDealRevision(dealManifest, revision.changeType) : summarizeRevision(manifest, current ?? null, revision.preparedMedia)
                : revision.status === "failed"
                  ? revision.errors[0] ?? `${changeLabel} could not be synchronized.`
                  : `${changeLabel} revision ${revisionStatusLabels[revision.status].toLowerCase()}.`;
              return (
                <article className="catalogue-revision" data-selectable={revision.status === "pending" || undefined} key={revision.id}>
                  {revision.status === "pending" && (
                    <label className="catalogue-revision-select">
                      <input aria-label={`Select ${manifest?.name ?? current?.name ?? revision.appSlug}`} name="revisionId" type="checkbox" value={revision.id} />
                      <span aria-hidden="true" />
                    </label>
                  )}
                  <div className="catalogue-revision-identity">
                    <div className="catalogue-revision-icon">
                      {icon ? <Image alt={manifest?.name ? `${manifest.name} icon` : "Application icon"} height={48} src={mediaUrl(icon.storageKey)} unoptimized width={48} />
                        : <span aria-hidden="true">{(manifest?.name ?? revision.appSlug).slice(0, 1).toUpperCase()}</span>}
                    </div>
                    <div>
                      <div className="catalogue-revision-meta">
                        <span>{changeLabel}</span>
                        {view === "history" && <span data-status={revision.status}>{revisionStatusLabels[revision.status]}</span>}
                      </div>
                      <h3><Link href={`${queuePath}/${revision.id}`}>{manifest?.name ?? current?.name ?? revision.appSlug}</Link></h3>
                      <p>{summary}</p>
                      {revision.status === "pending" && revision.errors.length > 0 && <p role="alert">{revision.errors.join(" ")}</p>}
                      <small>{revision.createdAt.toLocaleString()} · commit {revision.sourceCommitSha.slice(0, 8)}</small>
                    </div>
                  </div>
                  <div className="catalogue-revision-actions">
                    {revision.appId && <Link className="catalogue-current-link" href={`/dashboard/apps/${revision.appId}`}>Current listing</Link>}
                    {revision.status === "failed" && (
                      <>
                        <form action={retryCatalogueFailure}>
                          <input name="revisionId" type="hidden" value={revision.id} />
                          <input name="returnPath" type="hidden" value={queuePath} />
                          <PendingSubmitButton className="button-primary" type="submit">Retry synchronization</PendingSubmitButton>
                        </form>
                        <form action={dismissCatalogueFailure}>
                          <input name="revisionId" type="hidden" value={revision.id} />
                          <input name="returnPath" type="hidden" value={queuePath} />
                          <PendingSubmitButton className="button-secondary" type="submit">Dismiss failure</PendingSubmitButton>
                        </form>
                      </>
                    )}
                    <Link className={revision.status === "pending" ? "button-primary" : "button-secondary"} href={`${queuePath}/${revision.id}`}>
                      {revision.status === "pending" ? "Review changes" : "View revision"}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
          </CatalogueBulkReview>
        )}
        {(page > 1 || hasNextPage) && <nav aria-label="Queue pages" className="catalogue-queue-toolbar">
          {page > 1 && <Link className="button-secondary" href={`${queuePath}?view=${view}&page=${page - 1}`}>Previous page</Link>}
          <span>Page {page}</span>
          {hasNextPage && <Link className="button-secondary" href={`${queuePath}?view=${view}&page=${page + 1}`}>Next page</Link>}
        </nav>}
      </section>
    </>
  );
}

function summarizeRevision(
  manifest: CatalogueManifest | null,
  current: {
    name: string;
    slug: string;
    websiteUrl: string;
    tagline: string;
    description: string;
    pricingType: string;
    billingType: string | null;
    pricingDetails: string | null;
    sourceType: string;
    youtubeUrl: string | null;
    media: Array<{ role: string; checksum: string }>;
  } | null,
  proposedMedia: Array<{ role: string; checksum: string }>,
) {
  if (!manifest) return "Application removal or a revision without a valid manifest.";
  if (!current) return `New application with ${proposedMedia.length} prepared media ${proposedMedia.length === 1 ? "asset" : "assets"}.`;
  const changed = [
    current.name !== manifest.name,
    current.slug !== manifest.slug,
    current.websiteUrl !== manifest.websiteUrl,
    current.tagline !== manifest.tagline,
    current.description !== manifest.description,
    current.pricingType !== manifest.pricingType || current.billingType !== manifest.billingType || current.pricingDetails !== manifest.pricingDetails,
    current.sourceType !== manifest.sourceType,
    current.youtubeUrl !== manifest.youtubeUrl,
  ].filter(Boolean).length;
  const currentMediaKeys = current.media.map((asset) => `${asset.role}:${asset.checksum}`).sort();
  const proposedMediaKeys = proposedMedia.map((asset) => `${asset.role}:${asset.checksum}`).sort();
  const mediaChanged = currentMediaKeys.length !== proposedMediaKeys.length
    || currentMediaKeys.some((key, index) => key !== proposedMediaKeys[index]);
  const parts = [changed ? `${changed} listing ${changed === 1 ? "field" : "fields"}` : null, mediaChanged ? "media" : null]
    .filter(Boolean);
  return parts.length ? `${parts.join(" and ")} changed.` : "Taxonomy or relationship changes ready for review.";
}

function summarizeDealRevision(
  manifest: DealManifest | null,
  changeType: "create" | "update" | "archive",
) {
  if (changeType === "archive") return "Remove this application's public deal.";
  if (!manifest) return "Deal removal or a revision without a valid deal manifest.";
  const code = manifest.code ? ` with code ${manifest.code}` : " without a code";
  return `${manifest.discountPercent}% off${code}, ending ${new Date(manifest.endsAt).toLocaleString()}.`;
}

function dealChangeLabel(changeType: "create" | "update" | "archive") {
  return changeType === "create" ? "New deal" : changeType === "update" ? "Deal update" : "Deal removal";
}

function viewLabel(view: View) {
  return view === "pending" ? "Awaiting a decision" : view === "history" ? "Reviewed revisions" : "Synchronization failures";
}

function viewDescription(view: View) {
  return view === "pending"
    ? "Newest changes first. Select updates to review together."
    : view === "history"
      ? "Past decisions and resolved failures."
      : "Retry a failed sync, or dismiss it to keep it in history.";
}

function mediaUrl(storageKey: string) {
  return `/dashboard/media/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}

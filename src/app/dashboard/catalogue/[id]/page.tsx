import { PendingSubmitButton } from "@/components/forms/pending-submit-button";
import Link from "next/link";
import { and, desc, eq, isNull, like, lt } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  ExternalLink,
  FileText,
  GitBranch,
  Image as ImageIcon,
  ListChecks,
  TicketPercent,
} from "lucide-react";
import { decideCatalogueRevision, dismissCatalogueFailure, retryCatalogueFailure } from "@/app/dashboard/catalogue/actions";
import { CatalogueChangeReview } from "@/components/dashboard/catalogue-change-review";
import { getDatabase } from "@/db/client";
import { apps, catalogueRevisions, deals } from "@/db/schema";
import { getChangedManifestFields } from "@/lib/catalogue/catalogue-diff";
import { catalogueManifestSchema } from "@/lib/catalogue/catalogue-manifest";
import { dealManifestSchema } from "@/lib/deals/deal-manifest";
import { publishActionLabels, revisionChangeLabels, revisionStatusLabels } from "@/lib/catalogue/catalogue-revision-labels";
import { getCatalogueReviewSnapshot } from "@/lib/catalogue/catalogue-review-data";

export const dynamic = "force-dynamic";

export default async function CatalogueRevisionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const database = await getDatabase();
  const rows = await database.select().from(catalogueRevisions).where(eq(catalogueRevisions.id, id)).limit(1);
  const revision = rows[0];
  if (!revision) notFound();
  if (revision.sourcePath.startsWith("catalog/deals/")) {
    return <DealRevisionPage database={database} revision={revision} />;
  }
  if (!revision.sourcePath.startsWith("catalog/apps/")) notFound();
  const current = await getCatalogueReviewSnapshot(revision.appId);
  const comparison = revision.status === "pending" || revision.status === "failed"
    ? current
    : await getHistoricalBaseline(database, revision.appSlug, revision.createdAt, current);
  const sourceUrl = `https://github.com/${revision.sourceRepository}/blob/${revision.sourceCommitSha}/${revision.sourcePath}`;
  const editUrl = `https://github.com/${revision.sourceRepository}/edit/main/${revision.sourcePath}`;
  const manifestResult = catalogueManifestSchema.safeParse(revision.manifest);
  const manifest = manifestResult.success ? manifestResult.data : null;
  const changedFields = manifest ? getChangedManifestFields(comparison, manifest) : new Set();
  const changedMedia = manifest
    ? countMediaChanges(comparison?.media ?? [], revision.preparedMedia)
    : revision.preparedMedia.length;

  return (
    <>
      <nav className="dashboard-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/dashboard/catalogue">Review queue</Link><ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">{revision.appSlug}</span>
      </nav>
      <header className="editor-header editor-header-row">
        <div>
          <p>{revisionChangeLabels[revision.changeType]} · {revisionStatusLabels[revision.status]}</p>
          <h1>{manifest?.name ?? revision.appSlug}</h1>
          <span>Review every proposed change, then publish or reject this exact GitHub revision.</span>
        </div>
        <div className="editor-header-actions">
          {manifest && <a className="button-secondary" href={editUrl} rel="noreferrer" target="_blank">Edit manifest <GitBranch size={15} /></a>}
          <a className="button-secondary" href={sourceUrl} rel="noreferrer" target="_blank">Source commit <ExternalLink size={15} /></a>
        </div>
      </header>

      {revision.errors.length > 0 && <div className="form-error" role="alert">{revision.errors.join(" ")}</div>}

      <div className="catalogue-review-layout">
        <div className="catalogue-review-main">
          <section className="dashboard-panel catalogue-review-panel">
            <div className="catalogue-review-summary">
              <div><span>Listing fields</span><strong>{manifest ? changedFields.size : "—"}</strong><small>{manifest ? "changed in this revision" : "manifest unavailable"}</small></div>
              <div><span>Media</span><strong>{changedMedia}</strong><small>asset changes detected</small></div>
              <div><span>Public state</span><strong>{current ? publicStateLabel(current.status) : "Not created"}</strong><small>{current?.isFeatured ? "Featured on the homepage" : "Not featured"}</small></div>
            </div>

            {manifest ? (
              <>
                <nav className="catalogue-review-jump" aria-label="Revision sections">
                  <a href="#listing-changes"><ListChecks size={15} /> Listing</a>
                  <a href="#description-changes"><FileText size={15} /> Description</a>
                  <a href="#media-changes"><ImageIcon size={15} /> Media</a>
                </nav>
                <CatalogueChangeReview current={comparison} manifest={manifest} preparedMedia={revision.preparedMedia} />
                <details className="catalogue-json-review">
                  <summary>View merged JSON</summary>
                  <pre>{JSON.stringify(revision.manifest, null, 2)}</pre>
                </details>
              </>
            ) : revision.changeType === "archive" ? (
              <div className="catalogue-archive-request"><h2>Remove this application from the directory</h2><p>Publishing this revision archives the application. Its record remains in the dashboard and can be republished later.</p></div>
            ) : (
              <div className="catalogue-archive-request"><h2>App information unavailable</h2><p>This revision does not contain a valid app manifest. Correct the JSON in GitHub and synchronize a new revision.</p></div>
            )}
          </section>
        </div>

        <aside className="catalogue-review-sidebar" aria-label="Review decision">
          <section className="dashboard-panel catalogue-decision-panel">
            <p className="section-kicker">Decision</p>
            <h2>{revision.status === "pending" ? "Ready for review" : revision.status === "failed" ? "Synchronization failed" : `Revision ${revisionStatusLabels[revision.status].toLowerCase()}`}</h2>
            <p>{revision.status === "pending"
              ? "Publishing replaces the current public listing with the proposed values and prepared media. Rejecting keeps the current listing unchanged."
              : revision.status === "failed"
                ? "A later successful sync for this file will resolve this failure automatically. Dismiss it if no retry is needed."
                : `This revision was closed${revision.reviewedAt ? ` on ${revision.reviewedAt.toLocaleString()}` : ""}.`}</p>
            {revision.status === "pending" && (
              <form action={decideCatalogueRevision} className="catalogue-review-decision">
                <input name="revisionId" type="hidden" value={revision.id} />
                <input name="returnPath" type="hidden" value="/dashboard/catalogue" />
                <PendingSubmitButton className="button-primary" name="intent" type="submit" value="publish">{publishActionLabels[revision.changeType]}</PendingSubmitButton>
                <PendingSubmitButton className="button-secondary button-danger" name="intent" type="submit" value="reject">Reject revision</PendingSubmitButton>
              </form>
            )}
            {revision.status === "failed" && (
              <div className="catalogue-review-decision">
                <form action={retryCatalogueFailure}>
                  <input name="revisionId" type="hidden" value={revision.id} />
                  <input name="returnPath" type="hidden" value="/dashboard/catalogue" />
                  <PendingSubmitButton className="button-primary" type="submit">Retry synchronization</PendingSubmitButton>
                </form>
                <form action={dismissCatalogueFailure}>
                  <input name="revisionId" type="hidden" value={revision.id} />
                  <input name="returnPath" type="hidden" value="/dashboard/catalogue" />
                  <PendingSubmitButton className="button-secondary" type="submit">Dismiss failure</PendingSubmitButton>
                </form>
              </div>
            )}
          </section>
          <section className="dashboard-panel catalogue-revision-context">
            <h2>Revision context</h2>
            <dl>
              <div><dt>Commit</dt><dd>{revision.sourceCommitSha.slice(0, 12)}</dd></div>
              <div><dt>Received</dt><dd>{revision.createdAt.toLocaleString()}</dd></div>
              <div><dt>Source</dt><dd>{revision.sourcePath}</dd></div>
            </dl>
          </section>
          <aside className="catalogue-source-notice">
            <GitBranch aria-hidden="true" size={18} />
            <div><strong>Listing copy stays in GitHub.</strong><span>Publish and reject here. Edit content in the manifest, then merge a new revision.</span></div>
          </aside>
        </aside>
      </div>
    </>
  );
}

async function DealRevisionPage({
  database,
  revision,
}: {
  database: Awaited<ReturnType<typeof getDatabase>>;
  revision: typeof catalogueRevisions.$inferSelect;
}) {
  const applicationRows = await database.select({ id: apps.id, name: apps.name, status: apps.status })
    .from(apps).where(and(eq(apps.slug, revision.appSlug), isNull(apps.deletedAt))).limit(1);
  const application = applicationRows[0] ?? null;
  const currentRows = application
    ? await database.select().from(deals).where(eq(deals.appId, application.id)).limit(1)
    : [];
  const current = currentRows[0] ?? null;
  const manifestResult = dealManifestSchema.safeParse(revision.manifest);
  const manifest = manifestResult.success ? manifestResult.data : null;
  const sourceUrl = `https://github.com/${revision.sourceRepository}/blob/${revision.sourceCommitSha}/${revision.sourcePath}`;
  const editUrl = `https://github.com/${revision.sourceRepository}/edit/main/${revision.sourcePath}`;
  const changeLabel = revision.changeType === "create" ? "New deal" : revision.changeType === "update" ? "Deal update" : "Deal removal";
  const publishLabel = revision.changeType === "archive" ? "Remove deal" : current ? "Publish deal update" : "Publish new deal";
  const fields = [
    ["Discount", current ? `${current.discountPercent}%` : null, manifest ? `${manifest.discountPercent}%` : null],
    ["Code", current?.code ?? null, manifest?.code ?? null],
    ["Destination", current?.url ?? null, manifest?.url ?? null],
    ["Starts", current ? current.startsAt.toLocaleString() : null, manifest ? new Date(manifest.startsAt).toLocaleString() : null],
    ["Ends", current ? current.endsAt.toLocaleString() : null, manifest ? new Date(manifest.endsAt).toLocaleString() : null],
  ] as const;

  return (
    <>
      <nav className="dashboard-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/dashboard/deals">Deal queue</Link><ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">{revision.appSlug} deal</span>
      </nav>
      <header className="editor-header editor-header-row">
        <div>
          <p>{changeLabel} · {revisionStatusLabels[revision.status]}</p>
          <h1>{application?.name ?? revision.appSlug}</h1>
          <span>Review the offer terms before making this deal public.</span>
        </div>
        <div className="editor-header-actions">
          {manifest && <a className="button-secondary" href={editUrl} rel="noreferrer" target="_blank">Edit manifest <GitBranch size={15} /></a>}
          <a className="button-secondary" href={sourceUrl} rel="noreferrer" target="_blank">Source commit <ExternalLink size={15} /></a>
        </div>
      </header>

      {revision.errors.length > 0 && <div className="form-error" role="alert">{revision.errors.join(" ")}</div>}

      <div className="catalogue-review-layout">
        <div className="catalogue-review-main">
          <section className="dashboard-panel catalogue-review-panel">
            <div className="catalogue-review-summary">
              <div><span>Application</span><strong>{application?.name ?? revision.appSlug}</strong><small>{application?.status ?? "Not published"}</small></div>
              <div><span>Discount</span><strong>{manifest ? `${manifest.discountPercent}%` : "—"}</strong><small>{manifest?.code ? `Code ${manifest.code}` : "No code"}</small></div>
              <div><span>Public state</span><strong>{current ? "Published" : "Not published"}</strong><small>{current ? `Ends ${current.endsAt.toLocaleDateString()}` : "No current deal"}</small></div>
            </div>

            {manifest ? (
              <section className="catalogue-review-section" id="deal-changes">
                <div className="catalogue-review-heading">
                  <div><p className="section-kicker">Offer terms</p><h2>{current ? "What changed" : "New deal information"}</h2><p>Previous public values are shown beside the proposed GitHub values.</p></div>
                  <strong className="catalogue-review-count"><TicketPercent size={16} /> {manifest.discountPercent}% off</strong>
                </div>
                <div className="catalogue-field-diff" role="table" aria-label="Deal field changes">
                  <div className="catalogue-field-diff-head" role="row"><span role="columnheader">Field</span><span role="columnheader">Previous</span><span role="columnheader">Proposed</span></div>
                  {fields.map(([label, before, after]) => (
                    <div className="catalogue-field-diff-row" data-changed={before !== after} key={label} role="row">
                      <div className="catalogue-field-name" role="rowheader"><strong>{label}</strong><span>{before !== after ? current ? "Changed" : "New" : "Unchanged"}</span></div>
                      <div className="catalogue-field-value" data-state={before !== after ? "removed" : "unchanged"} role="cell"><span>{before ?? "Not set"}</span></div>
                      <div className="catalogue-field-value" data-state={before !== after ? "added" : "unchanged"} role="cell"><span>{after ?? "Not set"}</span></div>
                    </div>
                  ))}
                </div>
                <details className="catalogue-json-review"><summary>View deal JSON</summary><pre>{JSON.stringify(revision.manifest, null, 2)}</pre></details>
              </section>
            ) : revision.changeType === "archive" ? (
              <div className="catalogue-archive-request"><h2>Remove this deal</h2><p>Publishing this revision removes the offer without unpublishing the application.</p></div>
            ) : (
              <div className="catalogue-archive-request"><h2>Deal information unavailable</h2><p>Correct the JSON in GitHub and synchronize a new revision.</p></div>
            )}
          </section>
        </div>

        <aside className="catalogue-review-sidebar" aria-label="Review decision">
          <section className="dashboard-panel catalogue-decision-panel">
            <p className="section-kicker">Decision</p>
            <h2>{revision.status === "pending" ? "Ready for review" : revision.status === "failed" ? "Synchronization failed" : `Revision ${revisionStatusLabels[revision.status].toLowerCase()}`}</h2>
            <p>{revision.status === "pending"
              ? "Publishing updates the public deal. The application must be published first."
              : revision.status === "failed"
                ? "A later successful sync for this file will resolve this failure automatically. Dismiss it if no retry is needed."
                : `This revision was closed${revision.reviewedAt ? ` on ${revision.reviewedAt.toLocaleString()}` : ""}.`}</p>
            {revision.status === "pending" && (
              <form action={decideCatalogueRevision} className="catalogue-review-decision">
                <input name="revisionId" type="hidden" value={revision.id} />
                <input name="returnPath" type="hidden" value="/dashboard/deals" />
                <PendingSubmitButton className="button-primary" name="intent" type="submit" value="publish">{publishLabel}</PendingSubmitButton>
                <PendingSubmitButton className="button-secondary button-danger" name="intent" type="submit" value="reject">Reject revision</PendingSubmitButton>
              </form>
            )}
            {revision.status === "failed" && (
              <div className="catalogue-review-decision">
                <form action={retryCatalogueFailure}>
                  <input name="revisionId" type="hidden" value={revision.id} />
                  <input name="returnPath" type="hidden" value="/dashboard/deals" />
                  <PendingSubmitButton className="button-primary" type="submit">Retry synchronization</PendingSubmitButton>
                </form>
                <form action={dismissCatalogueFailure}>
                  <input name="revisionId" type="hidden" value={revision.id} />
                  <input name="returnPath" type="hidden" value="/dashboard/deals" />
                  <PendingSubmitButton className="button-secondary" type="submit">Dismiss failure</PendingSubmitButton>
                </form>
              </div>
            )}
          </section>
          <section className="dashboard-panel catalogue-revision-context">
            <h2>Revision context</h2>
            <dl><div><dt>Commit</dt><dd>{revision.sourceCommitSha.slice(0, 12)}</dd></div><div><dt>Received</dt><dd>{revision.createdAt.toLocaleString()}</dd></div><div><dt>Source</dt><dd>{revision.sourcePath}</dd></div></dl>
          </section>
        </aside>
      </div>
    </>
  );
}

function countMediaChanges(
  current: Array<{ role: string; checksum: string; sourceUrl: string | null; altText: string | null }>,
  proposed: Array<{ role: string; checksum: string; sourceUrl: string; altText: string }>,
) {
  const roles = ["icon", "preview_image", "screenshot"];
  return roles.reduce((count, role) => {
    const before = current.filter((asset) => asset.role === role);
    const after = proposed.filter((asset) => asset.role === role);
    const changed = Array.from({ length: Math.max(before.length, after.length) }, (_, index) => {
      const oldAsset = before[index];
      const newAsset = after[index];
      return !oldAsset || !newAsset || oldAsset.checksum !== newAsset.checksum
        || oldAsset.sourceUrl !== newAsset.sourceUrl || oldAsset.altText !== newAsset.altText;
    }).filter(Boolean).length;
    return count + changed;
  }, 0);
}

function publicStateLabel(status: "draft" | "published" | "archived") {
  return status === "published" ? "Published" : status === "archived" ? "Unpublished" : "Draft";
}

async function getHistoricalBaseline(
  database: Awaited<ReturnType<typeof getDatabase>>,
  appSlug: string,
  createdAt: Date,
  current: Awaited<ReturnType<typeof getCatalogueReviewSnapshot>>,
) {
  const candidates = await database.select().from(catalogueRevisions).where(and(
    eq(catalogueRevisions.appSlug, appSlug),
    eq(catalogueRevisions.status, "published"),
    like(catalogueRevisions.sourcePath, "catalog/apps/%"),
    lt(catalogueRevisions.createdAt, createdAt),
  )).orderBy(desc(catalogueRevisions.createdAt)).limit(10);
  for (const candidate of candidates) {
    const result = catalogueManifestSchema.safeParse(candidate.manifest);
    if (!result.success) continue;
    return {
      id: candidate.appId ?? current?.id ?? "historical",
      ...result.data,
      categories: result.data.categories,
      relatedAppSlugs: result.data.relatedAppSlugs,
      status: current?.status ?? "archived" as const,
      isFeatured: current?.isFeatured ?? false,
      isEditorsPick: current?.isEditorsPick ?? false,
      media: candidate.preparedMedia,
    };
  }
  return null;
}

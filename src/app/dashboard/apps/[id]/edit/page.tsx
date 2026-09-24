import { PendingSubmitButton } from "@/components/forms/pending-submit-button";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ChevronRight, ExternalLink, GitBranch, Star } from "lucide-react";
import { setApplicationPublication, setEditorsPickApplication, setFeaturedApplication } from "@/app/dashboard/editorial-actions";
import { getApplicationEditorData } from "@/lib/dashboard/app-editor-data";

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  icon: "Application icon",
  preview_image: "Main preview image",
  screenshot: "Screenshot",
};

function mediaUrl(storageKey: string) {
  return `/dashboard/media/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function EditApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ featured?: string; featureError?: string; editorsPick?: string; editorsPickError?: string; publication?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { application, media } = await getApplicationEditorData(id);
  if (!application) notFound();
  const isPublished = application.status === "published";

  return (
    <>
      <nav className="dashboard-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/dashboard">Applications</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <Link href={`/dashboard/apps/${application.id}`}>{application.name}</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">Controls</span>
      </nav>

      <header className="editor-header editor-header-row">
        <div>
          <p>{isPublished ? "Published application" : application.status === "archived" ? "Unpublished application" : "Draft application"}</p>
          <h1>{application.name}</h1>
          <span>Manage publication and homepage placement.</span>
        </div>
        <div className="editor-header-actions">
          <a className="button-secondary" href={application.websiteUrl} rel="noreferrer" target="_blank">
            Visit site <ExternalLink size={15} />
          </a>
          <a className="button-secondary" href={`https://github.com/Beingpax/macify/edit/main/catalog/apps/${application.slug}.json`} rel="noreferrer" target="_blank">
            Edit in GitHub <GitBranch size={15} />
          </a>
        </div>
      </header>

      {query.featured === "1" && <div className="success-banner" role="status">Featured placement updated.</div>}
      {query.editorsPick === "1" && <div className="success-banner" role="status">Editor’s Pick status updated.</div>}
      {query.publication === "publish" && <div className="success-banner" role="status">Application published to the directory.</div>}
      {query.publication === "unpublish" && <div className="success-banner" role="status">Application removed from the public directory, homepage placement, and editorial recognition.</div>}
      {query.featureError === "not-published" && <div className="form-error" role="alert">Publish the application before featuring it on the homepage.</div>}
      {query.editorsPickError === "not-published" && <div className="form-error" role="alert">Publish the application before marking it as an Editor’s Pick.</div>}

      <section className="dashboard-panel editorial-controls" aria-labelledby="editorial-controls-heading">
        <div className="media-editor-heading">
          <div><h2 id="editorial-controls-heading">Publication and placement</h2></div>
          <span className="application-control-state" data-state={application.status}>{isPublished ? "Live" : application.status === "archived" ? "Unpublished" : "Draft"}</span>
        </div>
        <div className="editorial-control-grid">
          <section className="editorial-control-card editorial-control-primary">
            <div className="editorial-control-icon" data-tone={isPublished ? "success" : "muted"}><ExternalLink size={18} /></div>
            <div><p className="section-kicker">Publication</p><h3>{isPublished ? "Visible in the public directory" : "Not visible to visitors"}</h3></div>
            <p>{isPublished
              ? "Unpublishing hides the application page and removes it from public lists. The approved record and media remain stored."
              : "Publishing makes the latest approved record visible again. This does not publish a pending GitHub revision."}</p>
            <form action={setApplicationPublication}>
              <input name="appId" type="hidden" value={application.id} />
              <PendingSubmitButton className={isPublished ? "button-secondary button-danger" : "button-primary"} name="intent" type="submit" value={isPublished ? "unpublish" : "publish"}>
                {isPublished ? "Unpublish application" : "Publish application"}
              </PendingSubmitButton>
            </form>
          </section>

          <section className="editorial-control-card">
            <div className="editorial-control-icon" data-tone={application.isFeatured ? "featured" : "muted"}><Star size={18} /></div>
            <div><p className="section-kicker">Homepage placement</p><h3>{application.isFeatured ? "Featured" : "Standard placement"}</h3></div>
            <p>{application.isFeatured
              ? "This application receives the featured treatment in the public directory."
              : "Feature this application when it should receive priority placement on the homepage."}</p>
            <form action={setFeaturedApplication}>
              <input name="appId" type="hidden" value={application.id} />
              <PendingSubmitButton className={application.isFeatured ? "button-secondary" : "button-primary"} disabled={!isPublished} name="featured" type="submit" value={application.isFeatured ? "false" : "true"}>
                {application.isFeatured ? "Remove featured status" : isPublished ? "Feature application" : "Publish before featuring"}
              </PendingSubmitButton>
            </form>
          </section>

          <section className="editorial-control-card">
            <div className="editorial-control-icon" data-tone={application.isEditorsPick ? "editors-pick" : "muted"}><BadgeCheck size={18} /></div>
            <div><p className="section-kicker">Editorial recognition</p><h3>{application.isEditorsPick ? "Editor’s Pick" : "Standard listing"}</h3></div>
            <p>{application.isEditorsPick
              ? "This application carries the Editor’s Pick badge in the public directory."
              : "Choose this application as an Editor’s Pick when it reflects Macify’s strongest recommendations."}</p>
            <form action={setEditorsPickApplication}>
              <input name="appId" type="hidden" value={application.id} />
              <PendingSubmitButton className={application.isEditorsPick ? "button-secondary" : "button-primary"} disabled={!isPublished} name="editorsPick" type="submit" value={application.isEditorsPick ? "false" : "true"}>
                {application.isEditorsPick ? "Remove Editor’s Pick" : isPublished ? "Mark as Editor’s Pick" : "Publish before selecting"}
              </PendingSubmitButton>
            </form>
          </section>
        </div>
      </section>

      <section className="media-editor" aria-labelledby="media-heading">
        <div className="media-editor-heading">
          <div>
            <h2 id="media-heading">Media library</h2>
            <span>Artwork included in this listing.</span>
          </div>
          <strong>{media.length} stored</strong>
        </div>

        {media.length > 0 && (
          <div className="media-library">
            {media.map((asset) => (
              <article className="media-asset" key={asset.id}>
                <div className={asset.role === "icon" ? "media-preview media-preview-icon" : "media-preview"}>
                  <Image
                    alt={asset.altText || `${application.name} ${roleLabels[asset.role] ?? "media"}`}
                    height={asset.role === "icon" ? 160 : 360}
                    src={mediaUrl(asset.storageKey)}
                    unoptimized
                    width={asset.role === "icon" ? 160 : 640}
                  />
                </div>
                <div className="media-asset-meta">
                  <strong>{roleLabels[asset.role] ?? asset.role}</strong>
                  <span>{asset.mimeType} · {formatBytes(asset.byteSize)}</span>
                  {asset.altText && <p>{asset.altText}</p>}
                  {asset.sourceUrl && <a className="media-origin-link" href={asset.sourceUrl} rel="noreferrer" target="_blank">View original source <ExternalLink size={12} /></a>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

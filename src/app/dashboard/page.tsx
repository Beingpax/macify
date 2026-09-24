import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Download, GitPullRequest, Star, SlidersHorizontal } from "lucide-react";
import { getApplicationsDashboardData } from "@/lib/dashboard/app-editor-data";
import { mediaUrl } from "@/components/site/public-app-card";
import { cn } from "@/lib/shared/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { applications, stats, pendingRevisions } = await getApplicationsDashboardData();

  return (
    <>
      <header className="dashboard-header">
        <div><h1>Applications</h1><p>Review your listings and manage where they appear.</p></div>
        <div className="dashboard-actions">
          <a className="button-secondary" download href="/dashboard/export"><Download aria-hidden="true" size={16} /> Export CSV</a>
          <Link className="button-primary" href="/dashboard/catalogue"><GitPullRequest aria-hidden="true" size={16} /> Review app updates</Link>
        </div>
      </header>

      <section className="status-strip" aria-label="Directory status">
        <div><span>Published</span><strong>{stats.published}</strong></div>
        <div><span>Awaiting review</span><strong>{pendingRevisions}</strong></div>
        <div><span>Unpublished</span><strong>{stats.total - stats.published}</strong></div>
      </section>

      <section className="dashboard-panel" aria-labelledby="recent-apps">
        <div className="panel-toolbar">
          <div><h2 id="recent-apps">Latest additions</h2><p>{applications.length} of {stats.total} listings, newest additions first.</p></div>
        </div>
        {applications.length === 0 ? (
          <div className="dashboard-empty">
            <h3>No applications yet</h3>
            <p>Add a listing in GitHub, then review and publish it from the app queue.</p>
          </div>
        ) : (
          <ul className="dashboard-app-grid">
            {applications.map((app) => (
              <li className="dashboard-app-card" key={app.id}>
                <Link className="dashboard-app-card-link" href={`/dashboard/apps/${app.id}`}>
                  <span className="dashboard-app-card-media">
                    {app.previewStorageKey ? <Image alt={app.previewAltText ?? `${app.name} preview`} width={app.previewWidth ?? 1200} height={app.previewHeight ?? 630} sizes="(max-width: 608px) 100vw, (max-width: 1000px) 50vw, 33vw" src={mediaUrl(app.previewStorageKey, "dashboard")} unoptimized /> : <span>Preview unavailable</span>}
                  </span>
                  <span className="dashboard-app-card-identity">
                    {app.iconStorageKey ? <Image alt="" className="app-icon-table" height={48} src={mediaUrl(app.iconStorageKey, "dashboard")} unoptimized width={48} /> : <span className="app-icon-table dashboard-app-icon-fallback" aria-hidden="true">{app.name.slice(0, 2).toUpperCase()}</span>}
                    <span><h3>{app.name}</h3><p>{app.tagline}</p></span>
                  </span>
                </Link>
                <div className="dashboard-app-card-footer">
                  <span className={cn(app.status === "published" ? "published-badge" : "draft-badge")}>{app.status === "published" ? "Published" : app.status === "archived" ? "Unpublished" : "Draft"}</span>
                  {app.isFeatured && <span className="featured-badge"><Star aria-hidden="true" size={12} /> Featured</span>}
                  {app.isEditorsPick && <span className="editors-pick-badge"><BadgeCheck aria-hidden="true" size={12} /> Editor’s Pick</span>}
                  <Link className="dashboard-card-manage" href={`/dashboard/apps/${app.id}/edit`} aria-label={`Manage ${app.name}`}><SlidersHorizontal aria-hidden="true" size={15} /> Manage</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

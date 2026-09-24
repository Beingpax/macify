import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, SlidersHorizontal } from "lucide-react";
import { ApplicationHero } from "@/components/application-detail/application-hero";
import { ApplicationOverview } from "@/components/application-detail/application-overview";
import { RelatedApplications } from "@/components/application-detail/related-applications";
import { getDashboardApplicationDetail } from "@/lib/dashboard/app-editor-data";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { application, media, related, deal } = await getDashboardApplicationDetail(id);
  if (!application) notFound();
  const icon = media.find((asset) => asset.role === "icon");
  const preview = media.find((asset) => asset.role === "preview_image");
  const screenshots = media.filter((asset) => asset.role === "screenshot");
  const now = new Date();
  const dealStatus = deal ? deal.startsAt > now ? "Scheduled offer" : deal.endsAt < now ? "Expired offer" : "Current offer" : null;

  return (
    <>
      <div className="dashboard-listing-toolbar">
        <nav className="dashboard-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/dashboard"><ArrowLeft aria-hidden="true" size={14} /> Applications</Link>
          <span aria-current="page">{application.name}</span>
        </nav>
        <div className="dashboard-actions">
          {application.status === "published" && <Link className="button-secondary" href={`/apps/${application.slug}`}>View public page <ExternalLink aria-hidden="true" size={15} /></Link>}
          <Link className="button-primary" href={`/dashboard/apps/${application.id}/edit`}><SlidersHorizontal aria-hidden="true" size={15} /> Manage listing</Link>
        </div>
      </div>

      <div className="dashboard-listing-state" role="status">
        <span className={application.status === "published" ? "published-badge" : "draft-badge"}>{application.status === "published" ? "Published" : application.status === "archived" ? "Unpublished" : "Draft"}</span>
        <span>{application.isFeatured ? "Featured on the homepage" : "Not featured on the homepage"}</span>
        {application.isEditorsPick && <span>Editor’s Pick</span>}
      </div>

      <article className="application-page application-presentation dashboard-listing-preview" aria-label="Application listing preview">
        <ApplicationHero application={application} icon={icon} mediaScope="dashboard" />
        <ApplicationOverview application={application} preview={preview} screenshots={screenshots} mediaScope="dashboard" />
        <RelatedApplications applications={related} mediaScope="dashboard" />
      </article>

      <section className="dashboard-listing-record" aria-labelledby="listing-record-title">
        <div><h2 id="listing-record-title">Listing details</h2><p>Publication information and stored offer terms.</p></div>
        <dl>
          <div><dt>Application URL</dt><dd>/apps/{application.slug}</dd></div>
          <div><dt>Source</dt><dd>{application.sourceType === "open_source" ? "Open source" : "Closed source"}</dd></div>
          {application.billingType && <div><dt>Billing</dt><dd>{application.billingType === "subscription" ? "Subscription" : "One-time purchase"}</dd></div>}
          <div><dt>First published</dt><dd>{application.publishedAt ? application.publishedAt.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" }) : "Not yet published"}</dd></div>
          <div><dt>Last updated</dt><dd>{application.updatedAt.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}</dd></div>
          {deal && <div><dt>{dealStatus}</dt><dd><a href={deal.url} rel="noreferrer" target="_blank">{deal.discountPercent}% off <ExternalLink aria-hidden="true" size={13} /></a>{deal.code && <span>Code: <code>{deal.code}</code></span>}<span>{deal.startsAt.toLocaleDateString("en-US", { timeZone: "UTC" })} to {deal.endsAt.toLocaleDateString("en-US", { timeZone: "UTC" })}</span></dd></div>}
        </dl>
      </section>
    </>
  );
}

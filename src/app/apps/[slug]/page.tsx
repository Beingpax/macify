import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { ApplicationHero } from "@/components/application-detail/application-hero";
import { ApplicationOverview } from "@/components/application-detail/application-overview";
import { RelatedApplications } from "@/components/application-detail/related-applications";
import { PublicShell } from "@/components/site/public-site";
import { mediaUrl } from "@/components/site/public-app-card";
import { getPublishedApplicationBySlug } from "@/lib/directory/published-app-data";
import { ApplicationVisitors } from "@/components/application-detail/application-visitors";

export const dynamic = "force-dynamic";
const getApplication = cache(getPublishedApplicationBySlug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const application = await getApplication((await params).slug);
  if (!application) return {};
  const canonical = `/apps/${application.slug}`;
  const title = application.name;
  const description = application.tagline;
  const images = [{ url: `${canonical}/opengraph-image`, alt: `${application.name} — ${application.tagline} | Macify` }];
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "website", siteName: "Macify", title, description, url: canonical, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function ApplicationPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const application = await getApplication(slug);
  if (!application) notFound();
  const icon = application.media.find(({ role }) => role === "icon");
  const preview = application.media.find(({ role }) => role === "preview_image");
  const screenshots = application.media.filter(({ role }) => role === "screenshot");
  const free = application.pricingType !== "paid";
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: application.name,
    description: application.tagline,
    url: `https://macify.app/apps/${application.slug}`,
    operatingSystem: "macOS",
    image: preview ? `https://macify.app${mediaUrl(preview.storageKey)}` : undefined,
    downloadUrl: application.websiteUrl,
    isAccessibleForFree: free,
    offers: free ? { "@type": "Offer", price: "0", priceCurrency: "USD" } : undefined,
  };
  return (
    <PublicShell>
      <main className="application-page" id="main-content">
        <ApplicationHero
          application={application}
          icon={icon}
          visitorContent={
            <Suspense fallback={<span className="application-visitors-slot" aria-hidden="true" />}>
              <ApplicationVisitors slug={slug} />
            </Suspense>
          }
        />
        <ApplicationOverview application={application} preview={preview} screenshots={screenshots} />
        <RelatedApplications applications={application.related} />
      </main>
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} type="application/ld+json" />
    </PublicShell>
  );
}

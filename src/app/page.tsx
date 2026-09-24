import { ApplicationDirectorySwitcher } from "@/components/home/application-directory-switcher";
import { HomeHero } from "@/components/home/home-hero";
import { PublicShell } from "@/components/site/public-site";
import { Suspense } from "react";
import { getHomepageDirectoryData, getHomepageHeroData } from "@/lib/directory/directory-search-data";

export const dynamic = "force-dynamic";

const homepageStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://macify.app/#website",
      url: "https://macify.app/",
      name: "Macify",
      alternateName: "macify.app",
      description: "A curated directory of useful macOS applications.",
      publisher: { "@id": "https://macify.app/#organization" },
    },
    {
      "@type": "Organization",
      "@id": "https://macify.app/#organization",
      url: "https://macify.app/",
      name: "Macify",
      logo: "https://macify.app/icon.svg",
      description: "An independent editorial directory of useful macOS applications.",
      sameAs: ["https://github.com/Beingpax/macify"],
    },
  ],
};

export default async function Home({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const requestedView = (await searchParams).view;
  const view = requestedView === "trending" || requestedView === "latest" ? requestedView : "hot";
  const heroApplications = await getHomepageHeroData();
  return (
    <PublicShell>
      <main id="main-content">
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageStructuredData).replace(/</g, "\\u003c") }}
          type="application/ld+json"
        />
        <HomeHero applications={heroApplications} />
        <Suspense fallback={<ApplicationDirectorySwitcher initialView={view} applications={[]} loading />}>
          <HomepageDirectory view={view} />
        </Suspense>
      </main>
    </PublicShell>
  );
}

async function HomepageDirectory({ view }: {
  view: "hot" | "trending" | "latest";
}) {
  const directory = await getHomepageDirectoryData(undefined, view);
  return <ApplicationDirectorySwitcher initialView={view} applications={directory.applications} />;
}

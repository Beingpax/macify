import type { Metadata } from "next";
import { DealsSection } from "@/components/deals/deals-section";
import { PublicShell } from "@/components/site/public-site";
import { getActiveDeals } from "@/lib/deals/deals-data";

export const dynamic = "force-dynamic";

const description = "Explore current, handpicked deals on useful Mac apps. Compare discounts and buy directly from the developers.";

export const metadata: Metadata = {
  title: "Mac app deals and discounts",
  description,
  alternates: { canonical: "/deals" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "Macify",
    title: "Mac app deals and discounts",
    description,
    url: "/deals",
    images: [{ url: "/opengraph-image.png", width: 1730, height: 909, alt: "Mac apps worth making room for. — Macify" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mac app deals and discounts",
    description,
    images: ["/opengraph-image.png"],
  },
};

export default async function DealsPage() {
  const deals = await getActiveDeals();
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://macify.app/deals#page",
    name: "Mac app deals and discounts",
    description,
    url: "https://macify.app/deals",
    isPartOf: { "@id": "https://macify.app/#website" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: deals.length,
      itemListElement: deals.map((deal, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: deal.name,
        url: `https://macify.app/apps/${deal.slug}`,
      })),
    },
  };

  return (
    <PublicShell>
      <main className="deals-page" id="main-content">
        <DealsSection deals={deals} />
      </main>
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} type="application/ld+json" />
    </PublicShell>
  );
}

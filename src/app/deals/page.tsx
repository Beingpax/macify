import { DealSignupCard } from "@/components/deals/deal-signup-card";
import { DealsHeading } from "@/components/deals/deals-heading";
import { DealCards } from "@/components/deals/deal-cards";
import { getHandpickedDeals } from "@/lib/deals/deals-data";
import { SignupForm } from "@/components/black-friday/signup-form";
import type { Metadata } from "next";
import { DealsHeroTickets } from "@/components/deals/deals-hero-tickets";
import { PublicShell } from "@/components/site/public-site";

export const dynamic = "force-dynamic";

const description = "Get a handpicked roundup of Black Friday offers on useful Mac apps, delivered to your inbox.";
const heroDealSlugs = ["voiceink", "chronoid", "compressx"];

export const metadata: Metadata = {
  title: "Mac app deals and Black Friday offers",
  description,
  alternates: { canonical: "/deals" },
  openGraph: { title: "Mac app deals and Black Friday offers | Macify", description, url: "/deals" },
};

export default async function DealsPage() {
  const deals = await getHandpickedDeals();
  const activeDeals = deals.filter((deal) => !deal.isUpcoming);
  const upcomingDeals = deals.filter((deal) => deal.isUpcoming);
  const heroDeals = heroDealSlugs
    .map((slug) => activeDeals.find((deal) => deal.slug === slug))
    .filter((deal) => deal !== undefined);
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
      <main className="deals-page black-friday-deals-page" id="main-content">
        <section className="deals-hero" aria-labelledby="black-friday-title">
          <div className="deals-hero-stage">
            <div className="deals-hero-copy">
              <p className="black-friday-season">Black Friday <span>2026</span></p>
              <h1 id="black-friday-title"><span>Great Mac apps.</span><span>Now for less.</span></h1>
              <p className="black-friday-intro">{description}</p>
              <SignupForm />
            </div>
            <DealsHeroTickets deals={heroDeals} />
          </div>
        </section>
        <section className="black-friday-current-deals" aria-labelledby="handpicked-deals-title">
          <DealsHeading />
          {activeDeals.length === 0 && (
            <p className="black-friday-current-deals-empty">No active deals right now. Check back soon.</p>
          )}
          <div className="deals-grid">
            <DealCards deals={activeDeals} />
            <DealSignupCard />
          </div>
        </section>
        {upcomingDeals.length > 0 && <section className="black-friday-upcoming-deals" aria-labelledby="upcoming-deals-title">
          <div className="deals-heading"><h2 id="upcoming-deals-title"><span>Upcoming deals.</span></h2></div>
          <div className="deals-grid"><DealCards deals={upcomingDeals} /></div>
        </section>}
      </main>
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} type="application/ld+json" />
    </PublicShell>
  );
}

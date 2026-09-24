import { ArrowRight, ArrowUpRight, Mail, TicketPercent } from "lucide-react";
import Link from "next/link";
import { DealCodeButton } from "@/components/deals/deal-code-button";
import { PublicAppIcon } from "@/components/site/public-app-card";
import type { getActiveDeals } from "@/lib/deals/deals-data";

type ActiveDeal = Awaited<ReturnType<typeof getActiveDeals>>[number];
const heroTicketSlugs = ["cleanshot-x", "bettertouchtool", "daisydisk"];

export function DealsSection({ deals }: { deals: ActiveDeal[] }) {
  if (!deals.length) {
    return (
      <section aria-labelledby="deals-title" className="deals-section deals-section-empty">
        <div className="deals-empty-state">
          <div className="deals-empty-copy">
            <h1 id="deals-title">No deals right now.</h1>
            <p>Macify only lists offers that are current and verified. The shelf is empty today, but the app collection is always open.</p>
            <div className="deals-empty-actions">
              <Link className="deals-hero-action site-action site-action--primary" href="/#all-apps">
                Browse Mac apps <ArrowRight aria-hidden="true" size={19} />
              </Link>
              <a className="deals-empty-surprise site-action site-action--secondary" href="/surprise">Surprise me</a>
            </div>
            <Link className="deals-empty-explainer" href="/deals/how-it-works">How Macify deals work <ArrowUpRight aria-hidden="true" size={16} /></Link>
          </div>
          <div aria-hidden="true" className="deals-empty-art">
            <span className="deals-empty-ticket deals-empty-ticket-1"><i /></span>
            <span className="deals-empty-ticket deals-empty-ticket-2"><i /></span>
            <span className="deals-empty-ticket deals-empty-ticket-3"><i /></span>
            <span className="deals-empty-star deals-empty-star-1">✦</span>
            <span className="deals-empty-star deals-empty-star-2">✦</span>
            <span className="deals-empty-loop">↝</span>
          </div>
        </div>
      </section>
    );
  }
  const heroDeals = deals.slice(0, 3);
  const preferredTicketDeals = heroTicketSlugs
    .map((slug) => deals.find((deal) => deal.slug === slug))
    .filter((deal): deal is ActiveDeal => Boolean(deal));
  const ticketDeals = preferredTicketDeals.length === 3 ? preferredTicketDeals : heroDeals;

  return (
    <section aria-labelledby="deals-title" className="deals-section">
      <header className="deals-hero">
        <div className="deals-hero-stage">
          <div className="deals-hero-copy">
            <h1 id="deals-title">
              <span>Great Mac apps.</span>
              <span>Now for less.</span>
            </h1>
            <p>Current discounts on worthwhile macOS apps. Compare the offers here, then buy directly from the developers.</p>
            <a className="deals-hero-action site-action site-action--primary" href="#handpicked-deals">
              Browse deals <ArrowRight aria-hidden="true" size={19} />
            </a>
            <p className="deals-hero-disclaimer">
              <span aria-hidden="true">✳</span>
              Discounts and terms should be confirmed on the developer website.
            </p>
          </div>
          <div className="deals-ticket-stage" aria-label="Highlighted deals">
            {ticketDeals.map((deal, index) => (
              <Link className={`deals-ticket deals-ticket-${index + 1}`} href={`/apps/${deal.slug}`} key={deal.id} prefetch={false}>
                <PublicAppIcon app={deal} decorative size={96} />
                <span className="deals-ticket-copy">
                  <b>{deal.name}</b>
                  <small>{deal.tagline}</small>
                </span>
                <span aria-hidden="true" className="deals-ticket-perforation" />
                <strong className="deals-ticket-discount">
                  <span>{deal.discountPercent}% <small>off</small></span>
                </strong>
              </Link>
            ))}
            <span aria-hidden="true" className="deals-ticket-arrow">
              <svg viewBox="0 0 88 72">
                <path d="M76 8 C82 31 68 46 45 47 C30 48 17 54 10 65" />
                <path d="M12 49 L9 66 L26 61" />
              </svg>
            </span>
          </div>
        </div>
        <div className="deals-featured" aria-label="Featured deals">
          {heroDeals.map((deal) => (
            <Link className="deals-featured-app" href={`/apps/${deal.slug}`} key={deal.id} prefetch={false}>
              <span className="deals-featured-identity">
                <PublicAppIcon app={deal} decorative size={60} />
                <span><b>{deal.name}</b><small>{deal.tagline}</small></span>
              </span>
              <strong><span>{deal.discountPercent}% off</span></strong>
            </Link>
          ))}
        </div>
      </header>
      <div className="deals-heading" id="handpicked-deals">
        <h2>
          <span>Handpicked deals.</span>
          <em>
            At a friendlier price.
            <svg aria-hidden="true" className="deals-heading-squiggle" focusable="false" preserveAspectRatio="none" viewBox="0 0 242 20">
              <path d="M1 10c8-8 16-8 24 0s16 6 24 0 16-7 24 0 16 8 24 0 16-6 24 0 16 7 24 0 16-8 24 0 16 6 24 0 16-7 24 0 16 8 24 0" vectorEffect="non-scaling-stroke" />
            </svg>
          </em>
        </h2>
      </div>
      <div className="deals-grid">
        {deals.map((deal) => (
          <article className="deal-card" key={deal.id}>
            <div className="deal-card-app">
              <PublicAppIcon app={deal} decorative size={60} />
              <div>
                <Link href={`/apps/${deal.slug}`} prefetch={false}>{deal.name}</Link>
                <span className="deal-card-pricing">{deal.pricingDetails}</span>
              </div>
            </div>
            <p className="deal-card-description">{deal.tagline}</p>
            <div className="deal-card-offer">
              <strong><span>{deal.discountPercent}% off</span></strong>
            </div>
            <div className="deal-card-actions">
              {deal.code && <DealCodeButton appSlug={deal.slug} code={deal.code} />}
              <a aria-label={`Visit ${deal.name} site (opens in a new tab)`} className="deal-card-action site-action site-action--primary" href={deal.url} rel="noopener noreferrer" target="_blank">
                Visit site <ArrowUpRight aria-hidden="true" size={17} strokeWidth={1.8} />
              </a>
            </div>
          </article>
        ))}
        <article className="deal-card deal-card--coming">
          <div className="deal-card-app">
            <span aria-hidden="true" className="deal-card-coming-icon"><TicketPercent size={30} /></span>
            <div>
              <h3>More deals are coming soon.</h3>
              <span>New offers will appear here soon</span>
            </div>
          </div>
          <p className="deal-card-description">We’re working with Mac app developers on more discounts for Macify readers.</p>
          <div className="deal-card-actions">
            <a
              aria-label="Subscribe to Macify on Substack (opens in a new tab)"
              className="deal-card-action site-action site-action--secondary"
              href="https://macify.substack.com"
              rel="noopener noreferrer"
              target="_blank"
            >
              Get deals <Mail aria-hidden="true" size={17} />
            </a>
            <Link className="deal-card-action site-action site-action--primary" href="/deals/how-it-works">
              How it works <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}

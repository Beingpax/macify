import Link from "next/link";
import { PublicAppIcon } from "@/components/site/public-app-card";
import type { getActiveDeals } from "@/lib/deals/deals-data";

type ActiveDeal = Awaited<ReturnType<typeof getActiveDeals>>[number];

export function DealsHeroTickets({ deals }: { deals: ActiveDeal[] }) {
  if (!deals.length) return <p className="deals-hero-no-offers">Featured offers will appear here as they become available.</p>;
  return (
          <div className="deals-ticket-stage" aria-label="Highlighted deals">
            {deals.map((deal, index) => (
              <Link className={`deals-ticket deals-ticket-${(index % 3) + 1}`} href={`/apps/${deal.slug}`} key={deal.id} prefetch={false}>
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
          </div>
  );
}

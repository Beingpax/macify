"use client";

import Link from "next/link";
import { House, Plus, Shuffle, TicketPercent } from "lucide-react";
import { usePathname } from "next/navigation";
import { GitHubStarCount } from "@/components/site/github-star-count";
import { LiveVisitorCount } from "@/components/site/live-visitor-count";

export function PublicHeaderNavigation() {
  const pathname = usePathname();

  return (
    <div className="public-menu">
      <div className="public-menu-content">
        <div className="public-community-links">
          <div className="public-brand-pill">
            <LiveVisitorCount />
          </div>
          <GitHubStarCount />
        </div>
        <nav className="public-navigation" aria-label="Primary navigation">
          <Link className="public-home-link" href="/" aria-current={pathname === "/" ? "page" : undefined} title="Home">
            <span className="public-navigation-icon" aria-hidden="true"><House /></span>
            <span className="public-navigation-label">Home</span>
          </Link>
          <Link className="public-deals-link" href="/deals" aria-current={pathname === "/deals" ? "page" : undefined} title="Deals">
            <span className="public-navigation-icon" aria-hidden="true"><TicketPercent /></span>
            <span className="public-navigation-label">Deals</span>
          </Link>
          <a className="public-surprise-link" href="/surprise" aria-current={pathname === "/surprise" ? "page" : undefined} title="Surprise me">
            <span className="public-navigation-icon" aria-hidden="true"><Shuffle /></span>
            <span className="public-navigation-label">Surprise me</span>
          </a>
          <Link
            className="public-submit-link"
            href="/submit"
            aria-current={pathname === "/submit" ? "page" : undefined}
            title="Submit an app"
          >
            <span className="public-navigation-icon" aria-hidden="true"><Plus /></span>
            <span className="public-navigation-label">Submit app</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}

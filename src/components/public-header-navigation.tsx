"use client";

import Link from "next/link";
import { Menu, Plus, Shuffle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GitHubStarCount } from "@/components/github-star-count";
import { LiveVisitorCount } from "@/components/live-visitor-count";
import { MacifyLogo } from "@/components/macify-logo";

export function PublicHeaderNavigation({ contributionGuideUrl }: { contributionGuideUrl: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className="public-menu" ref={rootRef}>
      <button
        aria-controls="public-mobile-menu"
        aria-expanded={open}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        className="public-menu-trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {open ? <X aria-hidden="true" size={19} /> : <Menu aria-hidden="true" size={19} />}
      </button>

      <div className="public-menu-content" data-open={open ? "true" : undefined} id="public-mobile-menu">
        <div className="public-community-links">
          <MacifyLogo />
          <div className="public-brand-pill">
            <LiveVisitorCount />
          </div>
          <GitHubStarCount />
        </div>
        <nav className="public-navigation" aria-label="Primary navigation">
          <Link className="public-home-link" href="/" onClick={() => setOpen(false)}>Home</Link>
          <Link className="public-deals-link" href="/deals" onClick={() => setOpen(false)}>Deals</Link>
          <a className="public-surprise-link" href="/surprise" onClick={() => setOpen(false)} aria-label="Surprise me with an app">
            <span className="public-navigation-icon" aria-hidden="true"><Shuffle size={15} /></span>
            <span className="public-navigation-label">Surprise me</span>
          </a>
          <a
            className="public-submit-link"
            href={contributionGuideUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            aria-label="Submit app on GitHub (opens in a new tab)"
          >
            <span className="public-navigation-icon" aria-hidden="true"><Plus size={15} /></span>
            <span className="public-navigation-label">Submit app</span>
          </a>
        </nav>
      </div>
    </div>
  );
}

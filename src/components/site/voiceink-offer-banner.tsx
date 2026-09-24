"use client";

import Image from "next/image";
import Link from "next/link";
import { TicketPercent, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

const dismissedKey = "macify:voiceink-offer:dismissed";

function subscribeToDismissal(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getDismissedSnapshot() {
  try {
    return window.localStorage.getItem(dismissedKey) === "1";
  } catch {
    return false;
  }
}

function getServerSnapshot() {
  return true;
}

export function VoiceInkOfferBanner() {
  const dismissedInStorage = useSyncExternalStore(subscribeToDismissal, getDismissedSnapshot, getServerSnapshot);
  const [dismissedThisPage, setDismissedThisPage] = useState(false);

  function dismissBanner() {
    setDismissedThisPage(true);
    try {
      window.localStorage.setItem(dismissedKey, "1");
    } catch {
      // Dismissal still works for this page when browser storage is unavailable.
    }
  }

  if (dismissedInStorage || dismissedThisPage) return null;

  return (
    <aside aria-label="VoiceInk offer from Macify’s maker" className="voiceink-offer-banner">
      <div className="voiceink-offer-inner">
        <div className="voiceink-offer-brand">
          <Image alt="" className="voiceink-offer-icon" height={46} src="/app-icons/voiceink-banner.png" unoptimized width={46} />
          <div><strong>VoiceInk</strong><small>From Macify’s maker</small></div>
        </div>
        <div className="voiceink-offer-copy">
          <span>VoiceInk offer</span>
          <p>The best Wispr Flow and Superwhisper alternative for Mac.</p>
        </div>
        <strong className="voiceink-offer-discount"><span>20% off</span></strong>
        <Link className="voiceink-offer-action site-action site-action--primary" href="/deals" onClick={dismissBanner}>
          <TicketPercent aria-hidden="true" size={17} /> Get the deal
        </Link>
        <button aria-label="Dismiss VoiceInk offer" className="voiceink-offer-dismiss" onClick={dismissBanner} type="button">
          <X aria-hidden="true" size={18} />
        </button>
      </div>
    </aside>
  );
}

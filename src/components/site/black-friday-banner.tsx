"use client";

import { useBlackFridaySubscription } from "@/components/black-friday/subscription-state";
import { SignupForm } from "@/components/black-friday/signup-form";
import { Check, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

const dismissedKey = "macify:black-friday-2026:dismissed:v2";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getDismissed() {
  try { return window.localStorage.getItem(dismissedKey) === "1"; } catch { return false; }
}

function getServerSnapshot() { return true; }

export function BlackFridayBanner() {
  const [justSignedUp, setJustSignedUp] = useState(false);
  useEffect(() => {
    const showSuccess = () => setJustSignedUp(true);
    window.addEventListener("macify:black-friday-subscription", showSuccess);
    return () => window.removeEventListener("macify:black-friday-subscription", showSuccess);
  }, []);
  useEffect(() => {
    if (!justSignedUp) return;
    const timer = window.setTimeout(() => setJustSignedUp(false), 4000);
    return () => window.clearTimeout(timer);
  }, [justSignedUp]);
  const subscribed = useBlackFridaySubscription();
  const dismissed = useSyncExternalStore(subscribe, getDismissed, getServerSnapshot);
  const [dismissedHere, setDismissedHere] = useState(false);

  function dismiss() {
    setDismissedHere(true);
    try { window.localStorage.setItem(dismissedKey, "1"); } catch { /* Dismiss for this visit. */ }
  }

  if (subscribed && justSignedUp) return (
    <div className="black-friday-signup-notice" role="status">
      <Check size={20} aria-hidden="true" />
      <p><strong>You’re on the list!</strong> We’ll email you when our Black Friday deal roundup is ready.</p>
      <button type="button" aria-label="Dismiss signup confirmation" onClick={() => setJustSignedUp(false)}><X size={18} aria-hidden="true" /></button>
    </div>
  );
  if (subscribed || dismissed || dismissedHere) return null;

  return (
    <aside className="black-friday-banner" aria-label="Black Friday deals">
      <div className="black-friday-banner-inner">
        <div className="black-friday-banner-copy"><strong>Black Friday deals <span>2026</span></strong><span>Get the handpicked deals in your inbox.</span></div>
        <SignupForm compact />
        <button type="button" onClick={dismiss} aria-label="Dismiss Black Friday banner"><X size={19} aria-hidden="true" /></button>
      </div>
    </aside>
  );
}

"use client";

import { useEffect, useState } from "react";

const realtimeVisitorsUrl = "/api/realtime-visitors";
const refreshIntervalMs = 60_000;

type RealtimeVisitorsResponse = {
  count: number;
};

export function LiveVisitorCount() {
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  useEffect(() => {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return;

    let active = true;
    let pending = false;
    let interval: number | undefined;
    let started = false;
    const controller = new AbortController();

    async function refreshVisitorCount() {
      if (document.hidden || pending) return;
      pending = true;
      try {
        const response = await fetch(realtimeVisitorsUrl, { credentials: "same-origin", signal: controller.signal });
        if (!response.ok) return;

        const data = await response.json() as RealtimeVisitorsResponse;
        if (active && Number.isFinite(data.count) && data.count >= 0) {
          setVisitorCount(data.count);
        }
      } catch {
        // Keep the previous value when DataFast is temporarily unavailable.
      } finally {
        pending = false;
      }
    }

    function start() {
      if (started) return;
      started = true;
      void refreshVisitorCount();
      interval = window.setInterval(refreshVisitorCount, refreshIntervalMs);
    }

    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });

    return () => {
      active = false;
      window.removeEventListener("load", start);
      controller.abort();
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, []);

  return (
    <span className="live-visitor-count" aria-label={visitorCount === null ? "Loading people online now" : `${visitorCount.toLocaleString()} people online now`} aria-live="polite">
      <span className="live-visitor-status" aria-hidden="true" />
      <strong>{visitorCount === null ? "–" : visitorCount.toLocaleString()}</strong>
      <span>online</span>
    </span>
  );
}

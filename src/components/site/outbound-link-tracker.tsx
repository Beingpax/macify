"use client";

import { useEffect } from "react";
import { trackDataFastGoal } from "@/lib/analytics/datafast-client";

export function OutboundLinkTracker() {
  useEffect(() => {
    function trackOutboundClick(event: MouseEvent) {
      if (event.defaultPrevented || (event.type === "auxclick" && event.button !== 1)) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link) return;

      let destination: URL;
      try {
        destination = new URL(link.href);
      } catch {
        return;
      }
      if (!["http:", "https:"].includes(destination.protocol) || destination.origin === window.location.origin) return;

      trackDataFastGoal("outbound_click", {
        destination_host: destination.hostname,
        source_path: window.location.pathname.slice(0, 255),
        link_kind: link.dataset.outboundKind ?? "other",
        ...(link.dataset.outboundApp ? { app_slug: link.dataset.outboundApp.slice(0, 255) } : {}),
        ...(link.dataset.outboundPlacement ? { placement: link.dataset.outboundPlacement.slice(0, 255) } : {}),
      });
    }

    document.addEventListener("click", trackOutboundClick);
    document.addEventListener("auxclick", trackOutboundClick);
    return () => {
      document.removeEventListener("click", trackOutboundClick);
      document.removeEventListener("auxclick", trackOutboundClick);
    };
  }, []);

  return null;
}

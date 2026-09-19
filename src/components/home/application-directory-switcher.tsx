"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useTransition } from "react";
import type { MouseEvent } from "react";
import { DirectoryAppGrid, type DirectoryApp } from "@/components/home/application-directory";

type DirectoryView = "hot" | "trending" | "latest";

const directoryViews: Array<{ label: string; view: DirectoryView }> = [
  { label: "Hot", view: "hot" },
  { label: "Trending", view: "trending" },
  { label: "Latest", view: "latest" },
];

function DirectoryViewIcon({ view }: { view: DirectoryView }) {
  if (view === "hot") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path className="directory-flame-outer" d="M12.75 1.65c.42 2.65-.83 4.24-2.1 5.85C9.4 9.08 8.12 10.7 8.12 13c0 .68.13 1.33.38 1.92.35-1.42 1.18-2.52 2.38-3.34.3-.2.71-.04.8.3.35 1.28 1.02 2.25 2.02 2.93.72-1.07 1.06-2.36.95-3.85 1.84 1.45 3.1 3.65 3.1 6.04A5.75 5.75 0 0 1 12 22.75 7.75 7.75 0 0 1 4.25 15c0-4.76 2.82-8.8 7.72-13.7.27-.27.72-.03.78.35Z" />
        <path className="directory-flame-inner" d="M12.05 14.02c.2.94.69 1.7 1.48 2.27.55-.49.97-1.13 1.22-1.91.52.7.82 1.57.82 2.5A3.56 3.56 0 0 1 12 20.44a3.56 3.56 0 0 1-3.57-3.56c0-1.5.79-2.78 2.47-4.16.34-.28.85-.06.91.38.04.31.12.62.24.92Z" />
      </svg>
    );
  }

  if (view === "trending") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path className="directory-trend-arrow" d="M19.25 3.5H14v2.75h2.07l-4.92 4.92-3.6-3.6-4.92 4.92 1.94 1.94 2.98-2.98 3.6 3.6 6.1-6.1V11h2.75V4.25a.75.75 0 0 0-.75-.75Z" />
        <path className="directory-trend-bar directory-trend-bar-low" d="M3 17h3v4H3z" />
        <path className="directory-trend-bar directory-trend-bar-mid" d="M8 16h3v5H8z" />
        <path className="directory-trend-bar directory-trend-bar-high" d="M13 14h3v7h-3z" />
        <path className="directory-trend-bar directory-trend-bar-peak" d="M18 13h3v8h-3z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M12 2.25a9.75 9.75 0 1 0 0 19.5 9.75 9.75 0 0 0 0-19.5Zm1.15 4.25h-2.3v6.18l4.47 2.58 1.15-1.99-3.32-1.91V6.5Z" clipRule="evenodd" />
    </svg>
  );
}

export function ApplicationDirectorySwitcher({
  initialView,
  applications,
  loading = false,
}: {
  initialView: DirectoryView;
  applications: DirectoryApp[];
  loading?: boolean;
}) {
  const router = useRouter();
  const [selectedView, setSelectedView] = useOptimistic(initialView);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (loading) return;
    const timeout = window.setTimeout(() => {
      for (const { view } of directoryViews) {
        if (view !== initialView) router.prefetch(view === "hot" ? "/" : `/?view=${view}`);
      }
    }, 1_000);
    return () => window.clearTimeout(timeout);
  }, [initialView, loading, router]);

  function selectView(event: MouseEvent<HTMLAnchorElement>, view: DirectoryView) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (view === selectedView && !isPending) return;
    startTransition(() => {
      setSelectedView(view);
      router.replace(view === "hot" ? "/" : `/?view=${view}`, { scroll: false });
    });
  }

  return (
    <section className="home-section application-directory" id="all-apps" aria-labelledby="all-apps-title">
      <div className="directory-heading">
        <h2 id="all-apps-title">Apps worth trying.</h2>
        <nav aria-label="Application ranking" className="directory-view-tabs">
          {directoryViews.map(({ label, view }) => {
            const isActive = selectedView === view;

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                aria-label={`${label} applications${isActive ? ", selected" : ""}`}
                data-view={view}
                href={view === "hot" ? "/" : `/?view=${view}`}
                key={view}
                onClick={(event) => selectView(event, view)}
                prefetch
              >
                <span aria-hidden="true" className="directory-view-icon">
                  <DirectoryViewIcon view={view} />
                </span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div aria-busy={loading || isPending} aria-live="polite" aria-atomic="false" data-pending={isPending ? "true" : undefined}>
        {isPending && <p className="sr-only" role="status">Updating applications…</p>}
        {loading ? (
          <div aria-busy="true">
            <p className="sr-only" role="status">Loading applications…</p>
            <div className="directory-app-grid" aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index}>
                  <span className="directory-app-preview directory-loading-preview" />
                  <span className="directory-loading-identity" />
                </div>
              ))}
            </div>
          </div>
        ) : <DirectoryAppGrid applications={applications} />}
      </div>
    </section>
  );
}

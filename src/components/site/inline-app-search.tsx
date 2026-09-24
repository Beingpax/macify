"use client";

import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { LoaderCircle, Search, X } from "lucide-react";
import { PublicAppIcon } from "@/components/site/public-app-card";

type SearchResult = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  iconStorageKey: string | null;
  iconAltText: string | null;
};

export function InlineAppSearch() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const handleOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, []);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const response = await fetch(`/api/apps/search?q=${encodeURIComponent(value)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search unavailable");
        const data = await response.json() as { results: SearchResult[] };
        setResults(data.results);
        setActiveIndex(data.results.length > 0 ? 0 : -1);
        setOpen(true);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailed(true);
        setResults([]);
        setActiveIndex(-1);
        setOpen(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  function openResult(index: number) {
    const result = results[index];
    if (!result) return;
    setOpen(false);
    router.push(`/apps/${result.slug}`);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openResult(activeIndex >= 0 ? activeIndex : 0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (!open) return;
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!results.length || (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End")) return;
    event.preventDefault();
    setOpen(true);
    setActiveIndex((current) => {
      if (event.key === "Home") return 0;
      if (event.key === "End") return results.length - 1;
      if (event.key === "ArrowDown") return current < results.length - 1 ? current + 1 : 0;
      return current > 0 ? current - 1 : results.length - 1;
    });
  }

  function clear() {
    setQuery("");
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function updateQuery(value: string) {
    setQuery(value);
    setOpen(true);
    setResults([]);
    setActiveIndex(-1);
    setFailed(false);
    if (value.trim().length < 2) {
      setLoading(false);
    }
  }

  const showPanel = open && query.trim().length >= 2;

  return (
    <div className="inline-app-search" ref={rootRef}>
      <form className="header-search-field" onSubmit={submit} role="search">
        <button
          aria-label="Open search"
          className="search-trigger"
          onClick={() => inputRef.current?.focus()}
          type="button"
        >
          <Search aria-hidden="true" size={15} />
        </button>
        <label className="sr-only" htmlFor="header-search-input">Search Mac applications</label>
        <input
          aria-activedescendant={showPanel && activeIndex >= 0 && results[activeIndex] ? `header-search-option-${results[activeIndex].id}` : undefined}
          aria-autocomplete="list"
          aria-controls={showPanel && results.length > 0 ? "header-search-results" : undefined}
          aria-expanded={showPanel}
          autoComplete="off"
          id="header-search-input"
          onChange={(event) => updateQuery(event.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search Mac apps"
          ref={inputRef}
          role="combobox"
          type="search"
          value={query}
        />
        {loading ? <LoaderCircle aria-label="Searching" className="search-spinner" size={15} /> : query ? (
          <button aria-label="Clear search" className="search-clear" onClick={clear} type="button"><X size={14} /></button>
        ) : null}
        <button className="sr-only" type="submit">Open first result</button>
      </form>

      {showPanel && (
        <div aria-busy={loading} aria-label="Search results" aria-live="polite" className="inline-search-panel" role="region">
          {failed ? <p className="inline-search-message">Search is temporarily unavailable. Please try again.</p> : loading && results.length === 0 ? (
            <p className="inline-search-message">Looking through the directory…</p>
          ) : results.length === 0 ? (
            <p className="inline-search-message">No applications found for “{query.trim()}”.</p>
          ) : (
            <>
              <div className="inline-search-summary"><span>Best matches</span><small>{results.length} found</small></div>
              <div className="inline-search-results" id="header-search-results" role="listbox">
                {results.map((app, index) => (
                  <button
                    aria-selected={activeIndex === index}
                    data-active={activeIndex === index ? "true" : undefined}
                    id={`header-search-option-${app.id}`}
                    key={app.id}
                    onClick={() => openResult(index)}
                    onPointerMove={() => setActiveIndex(index)}
                    role="option"
                    tabIndex={-1}
                    type="button"
                  >
                    <PublicAppIcon
                      app={{
                        name: app.name,
                        icon: app.iconStorageKey ? { storageKey: app.iconStorageKey, altText: app.iconAltText } : null,
                      }}
                      decorative
                      size={44}
                    />
                    <span className="inline-search-copy"><strong>{app.name}</strong><span>{app.tagline}</span></span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

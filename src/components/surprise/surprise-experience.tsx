"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SurpriseApplication } from "@/lib/surprise-data";
import {
  SurpriseIconFloor,
  type SurpriseFloorApi,
} from "@/components/surprise/surprise-icon-floor";

function iconUrl(storageKey: string) {
  return `/media/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}

export function SurpriseExperience({ applications }: { applications: SurpriseApplication[] }) {
  const floor = useRef<SurpriseFloorApi | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [floorReady, setFloorReady] = useState(false);
  const selected = selectedIndex === null ? null : applications[selectedIndex];
  const floorItems = useMemo(() => applications.map((application) => ({
    id: application.id,
    name: application.name,
    src: application.icon ? iconUrl(application.icon.storageKey) : null,
  })), [applications]);

  const anchor = useCallback(() => {
    const stageBox = stage.current?.getBoundingClientRect();
    return {
      x: (stageBox?.width ?? window.innerWidth) / 2,
      y: (stageBox?.height ?? window.innerHeight) * 0.38,
    };
  }, []);

  useEffect(() => {
    if (!floorReady) return;
    if (selectedIndex === null) {
      floor.current?.release();
      return;
    }
    floor.current?.select(selectedIndex, anchor);
  }, [anchor, floorReady, selectedIndex]);

  const pick = useCallback((index: number) => setSelectedIndex(index), []);
  const ready = useCallback(() => setFloorReady(true), []);

  return (
    <div className="surprise-experience" ref={stage}>
      <SurpriseIconFloor apiRef={floor} items={floorItems} onPick={pick} onReady={ready} />

      <div aria-live="polite" className="surprise-selection">
        <h1 className={selected ? "surprise-app-name" : "sr-only"}>
          {selected?.name ?? "Explore Mac apps"}
        </h1>
      </div>

      {selected && (
        <Link
          aria-label={`View details for ${selected.name}`}
          className="surprise-details"
          href={`/apps/${selected.slug}`}
          prefetch={false}
        >
          View details
          <ArrowUpRight aria-hidden="true" size={17} />
        </Link>
      )}

      <p className="surprise-hint">
        {applications.length
          ? "Click an icon to choose an app. Drag to throw it into the pile."
          : "No apps available right now."}
      </p>
    </div>
  );
}

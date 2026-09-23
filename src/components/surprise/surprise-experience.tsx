"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Shuffle } from "lucide-react";
import { useCallback, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import type { SurpriseApplication } from "@/lib/surprise-data";
import type { SurpriseFloorApi } from "@/components/surprise/surprise-icon-floor";
import { SurprisePreview } from "@/components/surprise/surprise-preview";

const LARGE_SCREEN_QUERY = "(min-width: 44rem) and (min-height: 36rem)";
const SurpriseIconFloor = dynamic(
  () => import("@/components/surprise/surprise-icon-floor").then((module) => module.SurpriseIconFloor),
  { ssr: false },
);

function subscribeToScreenSize(onChange: () => void) {
  const query = window.matchMedia(LARGE_SCREEN_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function hasRoomForPile() {
  return window.matchMedia(LARGE_SCREEN_QUERY).matches;
}

function iconUrl(storageKey: string) {
  return `/media/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}

function SurprisePlayground({
  applications,
  stage,
}: {
  applications: SurpriseApplication[];
  stage: RefObject<HTMLDivElement | null>;
}) {
  const floor = useRef<SurpriseFloorApi | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const currentSelection = useRef<number | null>(selectedIndex);
  const [arrivedIndex, setArrivedIndex] = useState<number | null>(null);
  const [pileSettled, setPileSettled] = useState(false);
  const selected = selectedIndex === null ? null : applications[selectedIndex];
  const selectionStable = selected !== null && arrivedIndex === selectedIndex;
  const floorItems = useMemo(() => applications.map((application) => ({
    id: application.id,
    name: application.name,
    src: application.icon ? iconUrl(application.icon.storageKey) : null,
  })), [applications]);

  const anchor = useCallback(() => {
    const stageBox = stage.current?.getBoundingClientRect();
    const width = stageBox?.width ?? window.innerWidth;
    return {
      x: width < 1120 ? width * 0.35 : width / 2,
      y: (stageBox?.height ?? window.innerHeight) * 0.38,
    };
  }, [stage]);

  const pick = useCallback((index: number) => {
    if (currentSelection.current === index) {
      floor.current?.select(index, anchor);
      return;
    }
    currentSelection.current = index;
    setArrivedIndex(null);
    setSelectedIndex(index);
    floor.current?.select(index, anchor);
  }, [anchor]);
  const surprise = useCallback(() => {
    if (!applications.length) return;
    pick(Math.floor(Math.random() * applications.length));
  }, [applications.length, pick]);
  const ready = useCallback(() => {
    setPileSettled(false);
    setArrivedIndex(null);
    const index = currentSelection.current;
    if (index !== null) floor.current?.select(index, anchor);
  }, [anchor]);
  const settled = useCallback(() => setPileSettled(true), []);
  const arrived = useCallback((index: number) => {
    if (currentSelection.current === index) setArrivedIndex(index);
  }, []);
  const departed = useCallback((index: number) => {
    if (currentSelection.current === index) setArrivedIndex(null);
  }, []);

  return (
    <>
      <SurpriseIconFloor
        apiRef={floor}
        items={floorItems}
        onPick={pick}
        onReady={ready}
        onSettled={settled}
        onArrived={arrived}
        onDeparted={departed}
      />

      <h1 className="sr-only surprise-desktop-title">Explore Mac apps</h1>
      <p aria-live="polite" className="sr-only">{selected ? `${selected.name} selected` : ""}</p>

      {selectionStable ? (
        <div className="surprise-center surprise-center-selected">
          <h2 className="surprise-selected-name">{selected.name}</h2>
        </div>
      ) : !selected && pileSettled ? (
        <div className="surprise-center">
          <button className="surprise-trigger" onClick={surprise} type="button">
            <Shuffle aria-hidden="true" size={19} /> Surprise me
          </button>
        </div>
      ) : null}

      {selectionStable && (
        <SurprisePreview application={selected} />
      )}
    </>
  );
}

export function SurpriseExperience({ applications }: { applications: SurpriseApplication[] }) {
  const canPlay = useSyncExternalStore(subscribeToScreenSize, hasRoomForPile, () => false);
  const stage = useRef<HTMLDivElement>(null);

  return (
    <div className="surprise-experience" ref={stage}>
      {canPlay && <SurprisePlayground applications={applications} stage={stage} />}
      <div className="surprise-small-screen">
        <div className="surprise-small-screen-copy">
          <h1>This pile needs<br /><span>more room.</span></h1>
          <p>Open this on a bigger screen, like your Mac or iPad, to play with the app pile.</p>
          <Link href="/">Explore the apps instead <ArrowRight aria-hidden="true" size={18} /></Link>
        </div>
      </div>
    </div>
  );
}

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

function subscribeToInteractiveFloorAvailability(onAvailabilityChange: () => void) {
  const screenSizeQuery = window.matchMedia(LARGE_SCREEN_QUERY);
  screenSizeQuery.addEventListener("change", onAvailabilityChange);
  return () => screenSizeQuery.removeEventListener("change", onAvailabilityChange);
}

function hasSpaceForInteractiveFloor() {
  return window.matchMedia(LARGE_SCREEN_QUERY).matches;
}

function createFloorIconUrl(storageKey: string) {
  const encodedStoragePath = storageKey.split("/").map(encodeURIComponent).join("/");
  return `/media/${encodedStoragePath}?width=192&quality=78`;
}

function SurprisePlayground({
  applications,
  experienceContainerRef,
}: {
  applications: SurpriseApplication[];
  experienceContainerRef: RefObject<HTMLDivElement | null>;
}) {
  const floorApiRef = useRef<SurpriseFloorApi | null>(null);
  const [selectedApplicationIndex, setSelectedApplicationIndex] = useState<number | null>(null);
  const currentSelectionIndexRef = useRef<number | null>(selectedApplicationIndex);
  const [arrivedApplicationIndex, setArrivedApplicationIndex] = useState<number | null>(null);
  const [isPileSettled, setIsPileSettled] = useState(false);
  const selectedApplication = selectedApplicationIndex === null
    ? null
    : applications[selectedApplicationIndex];
  const isSelectionStable = selectedApplication !== null
    && arrivedApplicationIndex === selectedApplicationIndex;
  const floorIcons = useMemo(() => applications.map((application) => ({
    id: application.id,
    name: application.name,
    src: application.icon ? createFloorIconUrl(application.icon.storageKey) : null,
  })), [applications]);

  const getSelectionAnchor = useCallback(() => {
    const experienceBounds = experienceContainerRef.current?.getBoundingClientRect();
    const experienceWidth = experienceBounds?.width ?? window.innerWidth;
    return {
      x: experienceWidth < 1120 ? experienceWidth * 0.35 : experienceWidth / 2,
      y: (experienceBounds?.height ?? window.innerHeight) * 0.38,
    };
  }, [experienceContainerRef]);

  const selectApplication = useCallback((applicationIndex: number) => {
    if (currentSelectionIndexRef.current === applicationIndex) {
      floorApiRef.current?.select(applicationIndex, getSelectionAnchor);
      return;
    }
    currentSelectionIndexRef.current = applicationIndex;
    setArrivedApplicationIndex(null);
    setSelectedApplicationIndex(applicationIndex);
    floorApiRef.current?.select(applicationIndex, getSelectionAnchor);
  }, [getSelectionAnchor]);

  const selectRandomApplication = useCallback(() => {
    if (!applications.length) return;
    selectApplication(Math.floor(Math.random() * applications.length));
  }, [applications.length, selectApplication]);

  const handleFloorReady = useCallback(() => {
    setIsPileSettled(false);
    setArrivedApplicationIndex(null);
    const selectedIndex = currentSelectionIndexRef.current;
    if (selectedIndex !== null) floorApiRef.current?.select(selectedIndex, getSelectionAnchor);
  }, [getSelectionAnchor]);
  const handleFloorSettled = useCallback(() => setIsPileSettled(true), []);
  const handleApplicationArrived = useCallback((applicationIndex: number) => {
    if (currentSelectionIndexRef.current === applicationIndex) {
      setArrivedApplicationIndex(applicationIndex);
    }
  }, []);
  const handleApplicationDeparted = useCallback((applicationIndex: number) => {
    if (currentSelectionIndexRef.current === applicationIndex) {
      setArrivedApplicationIndex(null);
    }
  }, []);

  return (
    <>
      <SurpriseIconFloor
        apiRef={floorApiRef}
        items={floorIcons}
        onPick={selectApplication}
        onReady={handleFloorReady}
        onSettled={handleFloorSettled}
        onArrived={handleApplicationArrived}
        onDeparted={handleApplicationDeparted}
      />

      <h1 className="sr-only surprise-desktop-title">Explore Mac apps</h1>
      <p aria-live="polite" className="sr-only">
        {selectedApplication ? `${selectedApplication.name} selected` : ""}
      </p>

      {isSelectionStable ? (
        <div className="surprise-center surprise-center-selected">
          <h2 className="surprise-selected-name">{selectedApplication.name}</h2>
        </div>
      ) : !selectedApplication && isPileSettled ? (
        <div className="surprise-center">
          <button className="surprise-trigger" onClick={selectRandomApplication} type="button">
            <Shuffle aria-hidden="true" size={19} /> Surprise me
          </button>
        </div>
      ) : null}

      {isSelectionStable && (
        <SurprisePreview
          application={selectedApplication}
          iconUrl={selectedApplication.icon ? createFloorIconUrl(selectedApplication.icon.storageKey) : null}
        />
      )}
    </>
  );
}

export function SurpriseExperience({ applications }: { applications: SurpriseApplication[] }) {
  const hasInteractiveFloorSpace = useSyncExternalStore(
    subscribeToInteractiveFloorAvailability,
    hasSpaceForInteractiveFloor,
    () => false,
  );
  const experienceContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="surprise-experience" ref={experienceContainerRef}>
      {applications.length === 0 ? (
        <div className="surprise-empty-state">
          <div className="surprise-empty-state-copy">
            <h1>The surprise room is empty.</h1>
            <p>There are no published apps to choose from right now.</p>
            <Link href="/">Back to Macify <ArrowRight aria-hidden="true" size={18} /></Link>
          </div>
        </div>
      ) : (
        <>
          {hasInteractiveFloorSpace && (
            <SurprisePlayground
              applications={applications}
              experienceContainerRef={experienceContainerRef}
            />
          )}
          <div className="surprise-small-screen">
            <div className="surprise-small-screen-copy">
              <h1>The surprise room needs<br /><span>more space.</span></h1>
              <p>Open this on a bigger screen, like your Mac or iPad, to play in the surprise room.</p>
              <Link href="/">Explore the apps instead <ArrowRight aria-hidden="true" size={18} /></Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Shuffle } from "lucide-react";
import { useCallback, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import type { SurpriseApplication } from "@/lib/surprise/surprise-data";
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
  const [hasLoadedIcon, setHasLoadedIcon] = useState(false);
  const [iconLoadProblem, setIconLoadProblem] = useState<"failed" | "missing" | null>(null);
  const [floorAttempt, setFloorAttempt] = useState(0);
  const selectedApplication = selectedApplicationIndex === null
    ? null
    : applications[selectedApplicationIndex];
  const isSelectionStable = selectedApplication !== null
    && arrivedApplicationIndex === selectedApplicationIndex;
  const floorIcons = useMemo(() => applications.map((application) => ({
    src: application.icon ? createFloorIconUrl(application.icon.storageKey) : null,
  })), [applications]);

  const getSelectionAnchor = useCallback(() => {
    const experienceBounds = experienceContainerRef.current?.getBoundingClientRect();
    const experienceWidth = experienceBounds?.width ?? window.innerWidth;
    return {
      x: experienceWidth / 2,
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
    const loadedIndexes = floorApiRef.current?.getLoadedIndexes() ?? [];
    if (!loadedIndexes.length) return;
    selectApplication(loadedIndexes[Math.floor(Math.random() * loadedIndexes.length)]);
  }, [selectApplication]);

  const handleFloorReady = useCallback(() => {
    setHasLoadedIcon(true);
    setIconLoadProblem(null);
    setIsPileSettled(false);
    setArrivedApplicationIndex(null);
    const selectedIndex = currentSelectionIndexRef.current;
    if (selectedIndex !== null) floorApiRef.current?.select(selectedIndex, getSelectionAnchor);
  }, [getSelectionAnchor]);
  const handleIconLoadError = useCallback((canRetry: boolean) => {
    setIconLoadProblem(canRetry ? "failed" : "missing");
  }, []);
  const retryIconLoading = useCallback(() => {
    currentSelectionIndexRef.current = null;
    setSelectedApplicationIndex(null);
    setArrivedApplicationIndex(null);
    setIsPileSettled(false);
    setHasLoadedIcon(false);
    setIconLoadProblem(null);
    setFloorAttempt((attempt) => attempt + 1);
  }, []);
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
        key={floorAttempt}
        apiRef={floorApiRef}
        items={floorIcons}
        onPick={selectApplication}
        onReady={handleFloorReady}
        onIconLoadError={handleIconLoadError}
        onSettled={handleFloorSettled}
        onArrived={handleApplicationArrived}
        onDeparted={handleApplicationDeparted}
      />

      {!hasLoadedIcon && (
        <div className="surprise-icon-loading">
          <div className="surprise-icon-loading-copy">
            {iconLoadProblem === "failed" ? (
              <>
                <h2>App icons didn’t load.</h2>
                <p>Try again to open the surprise room.</p>
                <button className="site-action site-action--primary" onClick={retryIconLoading} type="button">Retry loading icons</button>
              </>
            ) : iconLoadProblem === "missing" ? (
              <>
                <h2>No app icons are available.</h2>
                <p>The surprise room needs app icons to work.</p>
                <Link href="/">Explore the directory instead</Link>
              </>
            ) : (
              <div className="surprise-icon-loader" role="status">
                <span aria-hidden="true" className="surprise-icon-loader-mark surprise-icon-loader-mark-blue" />
                <span aria-hidden="true" className="surprise-icon-loader-mark surprise-icon-loader-mark-orange" />
                <span aria-hidden="true" className="surprise-icon-loader-mark surprise-icon-loader-mark-plum" />
                <span className="sr-only">Loading app icons</span>
              </div>
            )}
          </div>
        </div>
      )}

      {hasLoadedIcon && iconLoadProblem && (
        <div className="surprise-icon-retry" role="status">
          <span>{iconLoadProblem === "failed" ? "Some icons couldn’t load." : "Some apps have no icon."}</span>
          {iconLoadProblem === "failed" && <button className="site-action" onClick={retryIconLoading} type="button">Try again</button>}
        </div>
      )}

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
          <button className="surprise-trigger site-action site-action--primary" onClick={selectRandomApplication} type="button">
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
            <Link className="site-action site-action--primary" href="/">Back to Macify <ArrowRight aria-hidden="true" size={18} /></Link>
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
              <Link className="site-action site-action--primary" href="/">Explore the apps instead <ArrowRight aria-hidden="true" size={18} /></Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

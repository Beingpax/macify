"use client";

import { useSyncExternalStore } from "react";

const key = "macify:black-friday-2026:subscribed:v2";
const event = "macify:black-friday-subscription";
let subscribedThisVisit = false;

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(event, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(event, onChange);
  };
}

function getSnapshot() {
  try { return subscribedThisVisit || window.localStorage.getItem(key) === "1"; }
  catch { return subscribedThisVisit; }
}

function getServerSnapshot() { return false; }

export function markSubscribed() {
  subscribedThisVisit = true;
  try { window.localStorage.setItem(key, "1"); } catch { /* Remember for this visit if storage is blocked. */ }
  window.dispatchEvent(new Event(event));
}

export function useBlackFridaySubscription() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

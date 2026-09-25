import type { CSSProperties } from "react";

// Values used by both CSS and server-rendered graphics have one source here.
export const themeColors = {
  white: "#fff",
  black: "#000",
  canvas: "#fbfaf6",
  surface: "#fff",
  ink: "#101217",
  inkSoft: "#343a43",
  textMuted: "#59616b",
  action: "#1457ff",
  offerSurface: "#ffd34f",
  offerInk: "#211b0a",
} as const;

export const themeCssVariables = {
  "--theme-white": themeColors.white,
  "--theme-black": themeColors.black,
  "--theme-canvas": themeColors.canvas,
  "--theme-ink": themeColors.ink,
  "--theme-ink-soft": themeColors.inkSoft,
  "--theme-text-muted": themeColors.textMuted,
  "--theme-action": themeColors.action,
  "--theme-offer-surface": themeColors.offerSurface,
  "--theme-offer-ink": themeColors.offerInk,
} as CSSProperties;

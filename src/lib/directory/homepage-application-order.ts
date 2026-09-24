/**
 * Applications eligible to appear in the homepage directory, in editorial
 * order. Featured and Editor's Pick groupings are applied separately; this
 * order is preserved within each group.
 */
export const HOMEPAGE_APPLICATION_SLUGS = [
  "voiceink",
  "cleanshot-x",
  "openusage",
  "daisydisk",
  "dayflow",
  "cold-turkey-blocker",
  "droppy",
  "iina",
  "klack",
  "lookaway",
  "mole",
  "monocle",
  "palmier",
  "paperman",
  "pieoneer",
  "portal",
  "sublime-text",
  "supercharge",
  "wallspace",
  "swish",
  "1password",
  "orion",
  "proxyman",
  "obsidian",
  "compressx",
  "clop",
  "chronoid",
  "bloom",
  "blip",
  "bear",
  "bauhaus-clock",
  "balance",
  "antinote",
  "anybox",
  "alcove",
  "glyph",
  "pixelmator-pro",
  "raycast",
  "superwhisper",
  "xmind",
  "mimestream",
  "lunar",
  "presentify",
  "stats",
  "dropover",
  "dato",
  "session",
  "bettertouchtool",
  "dia",
] as const;

const homepageApplicationOrder = new Map<string, number>(
  HOMEPAGE_APPLICATION_SLUGS.map((slug, index) => [slug, index]),
);

export function homepageApplicationPosition(slug: string) {
  return homepageApplicationOrder.get(slug) ?? HOMEPAGE_APPLICATION_SLUGS.length;
}

import { z } from "zod";

const httpsUrl = z.url().refine((value) => new URL(value).protocol === "https:", "Use an HTTPS URL.");
const mediaSource = z.object({
  sourceUrl: httpsUrl,
  altText: z.string().trim().min(3).max(300),
}).strict();

export const catalogueManifestSchema = z.object({
  $schema: z.string().optional(),
  schemaVersion: z.literal(1),
  isFeatured: z.boolean(),
  isEditorsPick: z.boolean(),
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(90).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  websiteUrl: httpsUrl,
  tagline: z.string().trim().min(10).max(140),
  description: z.string().trim().min(40).max(20_000),
  pricingType: z.enum(["free", "freemium", "paid"]),
  billingType: z.enum(["one_time", "subscription"]).nullable(),
  pricingDetails: z.string().trim().max(240).nullable(),
  sourceType: z.enum(["open_source", "closed_source"]),
  youtubeUrl: httpsUrl.max(2_000).nullable(),
  categories: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).min(1).max(12),
  relatedAppSlugs: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).max(12),
  media: z.object({
    icon: mediaSource,
    preview: mediaSource,
    screenshots: z.array(mediaSource).max(8),
  }).strict(),
}).strict().superRefine((manifest, context) => {
  if (manifest.pricingType === "free" && manifest.billingType !== null) {
    context.addIssue({ code: "custom", path: ["billingType"], message: "Free apps must use a null billing type." });
  }
  if (manifest.pricingType !== "free" && manifest.billingType === null) {
    context.addIssue({ code: "custom", path: ["billingType"], message: "Paid and freemium apps require a billing type." });
  }
  if (new Set(manifest.categories).size !== manifest.categories.length) {
    context.addIssue({ code: "custom", path: ["categories"], message: "Categories cannot contain duplicates." });
  }
  if (new Set(manifest.relatedAppSlugs).size !== manifest.relatedAppSlugs.length || manifest.relatedAppSlugs.includes(manifest.slug)) {
    context.addIssue({ code: "custom", path: ["relatedAppSlugs"], message: "Related applications must be unique and cannot include this app." });
  }
  const mediaUrls = manifestMediaSources(manifest).map(({ sourceUrl }) => sourceUrl);
  if (new Set(mediaUrls).size !== mediaUrls.length) {
    context.addIssue({ code: "custom", path: ["media"], message: "Each media source URL must be unique within an application." });
  }
});

export type CatalogueManifest = z.infer<typeof catalogueManifestSchema>;

export function manifestMediaSources(manifest: CatalogueManifest) {
  return [
    { role: "icon" as const, ...manifest.media.icon },
    { role: "preview_image" as const, ...manifest.media.preview },
    ...manifest.media.screenshots.map((screenshot) => ({ role: "screenshot" as const, ...screenshot })),
  ];
}

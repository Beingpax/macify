import { updateTag } from "next/cache";

export const PUBLIC_CATALOGUE_CACHE_TAG = "public-catalogue";

/**
 * Public catalogue data is intentionally long-lived. Editorial mutations call
 * this after the database transaction succeeds so the next visitor receives
 * fresh data without every request having to query D1.
 */
export function invalidatePublicCatalogueCache() {
  updateTag(PUBLIC_CATALOGUE_CACHE_TAG);
}

import { getCloudflareContext } from "@opennextjs/cloudflare";

const pagesAnalyticsUrl = "https://datafa.st/api/v1/analytics/pages";
const applicationLimit = 50;

type DataFastEnv = CloudflareEnv & {
  DATAFAST_API_KEY?: string;
};

type DataFastPageAnalyticsResponse = {
  status?: string;
  data?: Array<{
    path?: string;
    visitors?: number;
  }>;
  pagination?: {
    total?: number;
  };
};

type ApplicationVisit = {
  slug: string;
  visitors: number;
};

function utcDate(daysAgo: number) {
  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - daysAgo))
    .toISOString().slice(0, 10);
}

function applicationSlugFromPath(path: string) {
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(path);
  } catch {
    return null;
  }

  const match = /^\/apps\/([^/?#]+)\/?$/.exec(decodedPath);
  const slug = match?.[1]?.toLowerCase();
  return slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

async function getApplicationVisits(startAt?: string, endAt?: string): Promise<ApplicationVisit[] | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const apiKey = (env as DataFastEnv).DATAFAST_API_KEY;
    if (!apiKey) return null;

    const query = new URLSearchParams({
      fields: "path,visitors",
      filter_page: "contains:/apps/",
      limit: "1000",
      timezone: "UTC",
    });
    if (startAt && endAt) {
      query.set("startAt", startAt);
      query.set("endAt", endAt);
    }

    const response = await fetch(`${pagesAnalyticsUrl}?${query}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      next: { revalidate: 15 * 60 },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;

    const payload = await response.json() as DataFastPageAnalyticsResponse;
    if (payload.status !== "success" || !Array.isArray(payload.data)) return null;

    const visitsBySlug = new Map<string, number>();
    for (const row of payload.data) {
      if (typeof row.path !== "string" || !Number.isFinite(row.visitors) || row.visitors === undefined) continue;
      const slug = applicationSlugFromPath(row.path);
      if (!slug) continue;
      visitsBySlug.set(slug, (visitsBySlug.get(slug) ?? 0) + Math.max(0, row.visitors));
    }

    return [...visitsBySlug]
      .map(([slug, visitors]) => ({ slug, visitors }))
      .sort((left, right) => right.visitors - left.visitors || left.slug.localeCompare(right.slug))
      .slice(0, 1000);
  } catch {
    return null;
  }
}

export async function getHotApplicationVisits() {
  return (await getApplicationVisits(utcDate(6), utcDate(0)) ?? []).slice(0, applicationLimit);
}

export async function getTrendingApplicationVisits() {
  return (await getApplicationVisits(utcDate(29), utcDate(0)) ?? []).slice(0, applicationLimit);
}

export async function getAllTimeApplicationVisitors(slug: string) {
  const visits = await getApplicationVisits();
  if (!visits) return null;
  return visits.find((application) => application.slug === slug)?.visitors ?? 0;
}

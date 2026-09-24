import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { apps, mediaAssets } from "@/db/schema";

function parseRangeHeader(value: string | null): R2Range | undefined {
  if (!value?.startsWith("bytes=") || value.includes(",")) return undefined;
  const [startValue, endValue] = value.slice(6).split("-", 2);

  if (startValue === "") {
    const suffix = Number(endValue);
    return Number.isSafeInteger(suffix) && suffix > 0 ? { suffix } : undefined;
  }

  const offset = Number(startValue);
  if (!Number.isSafeInteger(offset) || offset < 0) return undefined;
  if (endValue === "") return { offset };

  const end = Number(endValue);
  if (!Number.isSafeInteger(end) || end < offset) return undefined;
  return { offset, length: end - offset + 1 };
}

export async function serveMedia(
  request: Request,
  segments: string[],
  visibility: "dashboard" | "published",
) {
  const key = segments.join("/");
  const searchParams = new URL(request.url).searchParams;
  const requestedWidthValue = searchParams.get("width");
  const requestedWidth = requestedWidthValue === null ? null : Number(requestedWidthValue);
  const transformWidth = requestedWidth !== null
    && Number.isSafeInteger(requestedWidth)
    && requestedWidth >= 32
    && requestedWidth <= 3840
      ? requestedWidth
      : null;
  const requestedQualityValue = searchParams.get("quality");
  const requestedQuality = requestedQualityValue === null ? null : Number(requestedQualityValue);
  const transformQuality = requestedQuality !== null
    && Number.isSafeInteger(requestedQuality)
    && requestedQuality >= 60
    && requestedQuality <= 95
      ? requestedQuality
      : 85;

  if (!key.startsWith("apps/") || key.length > 600) {
    return new Response("Not found", { status: 404 });
  }

  if (visibility === "published") {
    const database = await getDatabase();
    const publishedAsset = await database
      .select({ id: mediaAssets.id })
      .from(mediaAssets)
      .innerJoin(apps, eq(apps.id, mediaAssets.appId))
      .where(
        and(
          eq(mediaAssets.storageKey, key),
          eq(apps.status, "published"),
          isNull(apps.deletedAt),
          sql`${mediaAssets.role} <> 'audio'`,
        ),
      )
      .limit(1);

    if (!publishedAsset[0]) return new Response("Not found", { status: 404 });
  }

  const { env, ctx } = getCloudflareContext();
  // Publication is checked above even for a warm rendition. Dashboard media
  // and range requests must never reuse a public cache entry.
  const cache = visibility === "published" && request.method === "GET"
    && transformWidth !== null && !request.headers.has("range")
    && typeof caches !== "undefined"
      ? (caches as CacheStorage & { default?: Cache }).default
      : undefined;
  const cacheUrl = new URL(request.url);
  cacheUrl.search = new URLSearchParams({
    width: String(transformWidth),
    quality: String(transformQuality),
    rendition: "1",
  }).toString();
  const cacheKey = new Request(cacheUrl, { method: "GET" });
  if (cache) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    } catch {
      // Cache availability must not determine whether an image can be served.
    }
  }
  const requestedRange = transformWidth === null ? parseRangeHeader(request.headers.get("range")) : undefined;
  const object = requestedRange
    ? await env.MEDIA.get(key, { range: requestedRange })
    : await env.MEDIA.get(key);
  if (object === null) return new Response("Not found", { status: 404 });
  let responseBody = object.body;

  if (transformWidth !== null && object.httpMetadata?.contentType?.startsWith("image/") && env.IMAGES) {
    const [transformBody, fallbackBody] = object.body.tee();
    responseBody = fallbackBody;
    try {
      const transformed = await env.IMAGES
        .input(transformBody)
        .transform({ width: transformWidth, fit: "scale-down" })
        .output({ format: "image/webp", quality: transformQuality, anim: false });
      const response = transformed.response();
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", visibility === "published"
        ? "public, max-age=31536000, s-maxage=31536000, immutable"
        : "private, no-store");
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Content-Security-Policy", "default-src 'none'");
      headers.set("Vary", "Accept");
      ctx.waitUntil(fallbackBody.cancel().catch(() => {}));
      const result = new Response(response.body, { status: response.status, headers });
      if (cache && result.status === 200) {
        ctx.waitUntil(cache.put(cacheKey, result.clone()).catch(() => {}));
      }
      return result;
    } catch (error) {
      console.error(JSON.stringify({
        event: "media.resize.failed",
        key,
        width: transformWidth,
        message: error instanceof Error ? error.message : "Unknown image transformation error",
      }));
    }
  }

  const headers = new Headers();
  const metadata = object.httpMetadata;
  if (metadata?.contentType) headers.set("Content-Type", metadata.contentType);
  if (metadata?.contentLanguage) headers.set("Content-Language", metadata.contentLanguage);
  if (metadata?.contentDisposition) headers.set("Content-Disposition", metadata.contentDisposition);
  if (metadata?.contentEncoding) headers.set("Content-Encoding", metadata.contentEncoding);
  if (metadata?.cacheExpiry) headers.set("Expires", metadata.cacheExpiry.toUTCString());
  headers.set("Accept-Ranges", "bytes");
  headers.set("ETag", object.httpEtag);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Security-Policy", "default-src 'none'");
  headers.set(
    "Cache-Control",
    visibility === "published"
      ? "public, max-age=31536000, s-maxage=31536000, immutable"
      : "private, no-store",
  );

  let status = 200;
  if (requestedRange && object.range && "offset" in object.range) {
    const offset = object.range.offset ?? 0;
    const length = object.range.length ?? object.size - offset;
    headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set("Content-Length", String(length));
    status = 206;
  } else {
    headers.set("Content-Length", String(object.size));
  }

  return new Response(responseBody, { status, headers });
}

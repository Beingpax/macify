import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ingestCatalogueItem } from "@/lib/catalogue/catalogue-ingestion";
import { handleCatalogueSync } from "@/lib/catalogue/catalogue-sync-handler";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const syncEnv = env as CloudflareEnv & { CATALOG_SYNC_SECRET?: string; CATALOG_REPOSITORY?: string };
    return await handleCatalogueSync(request, {
      secret: syncEnv.CATALOG_SYNC_SECRET,
      repository: syncEnv.CATALOG_REPOSITORY,
      ingest: (item, source) => ingestCatalogueItem(item, source, env),
    });
  } catch (error) {
    const requestId = crypto.randomUUID();
    console.error("catalogue_sync_context_failed", { requestId, error });
    return Response.json({ ok: false, error: "Catalogue runtime is temporarily unavailable.", requestId }, {
      status: 503, headers: { "retry-after": "15" },
    });
  }
}

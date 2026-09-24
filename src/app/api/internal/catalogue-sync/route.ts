import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import { ingestCatalogueItem } from "@/lib/catalogue/catalogue-ingestion";

export const dynamic = "force-dynamic";

type CatalogueSyncEnv = CloudflareEnv & {
  CATALOG_SYNC_SECRET?: string;
  CATALOG_REPOSITORY?: string;
};

const requestSchema = z.object({
  repository: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/i),
  items: z.array(z.object({
    changeType: z.enum(["upsert", "delete"]),
    path: z.string(),
    manifest: z.unknown().optional(),
    sourceError: z.string().max(500).optional(),
  })).length(1),
});

const maxRequestBytes = 1_000_000;

async function readBoundedBody(request: Request): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return "";

  const bytes = new Uint8Array(maxRequestBytes);
  let bytesRead = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return new TextDecoder().decode(bytes.subarray(0, bytesRead));

      if (bytesRead + value.byteLength > maxRequestBytes) {
        await reader.cancel().catch(() => {});
        return null;
      }
      bytes.set(value, bytesRead);
      bytesRead += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  const { env: baseEnv } = await getCloudflareContext({ async: true });
  const env = baseEnv as CatalogueSyncEnv;
  if (!env.CATALOG_SYNC_SECRET) {
    return Response.json({ error: "Catalogue synchronization is not configured." }, { status: 503 });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maxRequestBytes) return Response.json({ error: "Payload is too large." }, { status: 413 });
  const body = await readBoundedBody(request);
  if (body === null) return Response.json({ error: "Payload is too large." }, { status: 413 });
  const supplied = request.headers.get("x-macify-signature") ?? "";
  if (!(await verifySignature(body, supplied, env.CATALOG_SYNC_SECRET))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return Response.json({ error: "The request body is not valid JSON." }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "The synchronization payload is invalid." }, { status: 400 });
  }
  if (env.CATALOG_REPOSITORY && parsed.data.repository !== env.CATALOG_REPOSITORY) {
    return Response.json({ error: "Repository is not allowed." }, { status: 403 });
  }

  const results = [];
  for (const item of parsed.data.items) {
    results.push({
      path: item.path,
      result: await ingestCatalogueItem(item, {
        repository: parsed.data.repository,
        commitSha: parsed.data.commitSha,
      }, baseEnv),
    });
  }
  const failed = results.some(({ result }) => !result.ok);
  return Response.json({ ok: !failed, results }, { status: failed ? 422 : 200 });
}

async function verifySignature(body: string, supplied: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signature = Uint8Array.from(supplied.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
  return crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(body));
}

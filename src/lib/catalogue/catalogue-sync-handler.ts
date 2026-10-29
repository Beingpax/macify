import { z } from "zod";

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

type SyncPayload = z.infer<typeof requestSchema>;
type SyncDependencies = {
  secret?: string;
  repository?: string;
  ingest: (item: SyncPayload["items"][number], source: { repository: string; commitSha: string }) => Promise<{ ok: boolean }>;
  reportError?: (requestId: string, error: unknown) => void;
};

export async function handleCatalogueSync(request: Request, dependencies: SyncDependencies) {
  try {
    return await processRequest(request, dependencies);
  } catch (error) {
    const requestId = crypto.randomUUID();
    if (dependencies.reportError) dependencies.reportError(requestId, error);
    else console.error("catalogue_sync_failed", { requestId, error });
    return Response.json({ ok: false, error: "Catalogue synchronization is temporarily unavailable.", requestId }, {
      status: 503, headers: { "retry-after": "15" },
    });
  }
}

async function processRequest(request: Request, dependencies: SyncDependencies) {
  if (!dependencies.secret) {
    return Response.json({ error: "Catalogue synchronization is not configured." }, { status: 503 });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maxRequestBytes) return Response.json({ error: "Payload is too large." }, { status: 413 });
  const body = await readBoundedBody(request);
  if (body === null) return Response.json({ error: "Payload is too large." }, { status: 413 });
  const supplied = request.headers.get("x-macify-signature") ?? "";
  if (!(await verifySignature(body, supplied, dependencies.secret))) {
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
  if (dependencies.repository && parsed.data.repository !== dependencies.repository) {
    return Response.json({ error: "Repository is not allowed." }, { status: 403 });
  }

  const results = [];
  for (const item of parsed.data.items) {
    results.push({
      path: item.path,
      result: await dependencies.ingest(item, {
        repository: parsed.data.repository,
        commitSha: parsed.data.commitSha,
      }),
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

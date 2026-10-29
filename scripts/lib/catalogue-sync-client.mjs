import { createHmac } from "node:crypto";

export class CatalogueSyncError extends Error {
  constructor(message, retryable = false) {
    super(message);
    this.retryable = retryable;
  }
}

async function readResponse(response) {
  if (!response.body) throw new Error("Empty response from catalogue endpoint.");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 64_000) {
        await reader.cancel();
        throw new Error("Catalogue response exceeded 64 KB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function sendSyncItem(item, { endpoint, secret, repository, commitSha }, {
  fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  maxAttempts = 12,
  timeoutMs = 45_000,
  log = console.log,
} = {}) {
  const body = JSON.stringify({ repository, commitSha, items: [item] });
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let failure;
    let delay = Math.min(30_000, 1_000 * 2 ** (attempt - 1));
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "content-type": "application/json", "x-macify-signature": signature },
        body,
      });
      const responseBody = await readResponse(response);
      const staleSchema = response.status === 422 && responseBody.includes("Manifest validation failed")
        && responseBody.includes("Unrecognized keys") && /isFeatured|isEditorsPick/.test(responseBody);
      if (!response.ok) {
        const retryable = [408, 425, 429].includes(response.status) || response.status >= 500 || staleSchema;
        let detail = "Non-JSON response from catalogue endpoint.";
        try { detail = JSON.stringify(JSON.parse(responseBody)).slice(0, 2_000); } catch {}
        failure = new CatalogueSyncError(`HTTP ${response.status}: ${detail}`, retryable);
        const retryAfter = response.headers.get("retry-after");
        if (retryAfter) {
          const seconds = Number(retryAfter);
          const ms = Number.isFinite(seconds) ? seconds * 1_000 : Date.parse(retryAfter) - Date.now();
          if (Number.isFinite(ms)) delay = Math.max(delay, Math.min(30_000, Math.max(0, ms)));
        }
      } else {
        const payload = JSON.parse(responseBody);
        if (payload?.ok !== true || payload.results?.length !== 1
          || payload.results[0]?.path !== item.path || payload.results[0]?.result?.ok !== true) {
          throw new Error("Catalogue endpoint did not acknowledge this manifest.");
        }
        return payload;
      }
    } catch (error) {
      failure = new CatalogueSyncError(error instanceof Error ? error.message : "Catalogue request failed.", true);
    }
    if (!failure.retryable || attempt === maxAttempts) throw failure;
    log(`Retrying ${item.path} in ${delay / 1_000}s (${attempt}/${maxAttempts}): ${failure.message}`);
    await sleep(delay);
  }
  throw new CatalogueSyncError("Catalogue retry budget exhausted.", true);
}

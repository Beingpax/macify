import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "macify_admin";
const SESSION_SECONDS = 60 * 60 * 12;
const encoder = new TextEncoder();

type AdminEnv = CloudflareEnv & {
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_SESSION_SECRET?: string;
};

const ACCESS_ISSUER = "https://prakashjoshipax.cloudflareaccess.com";
const accessKeys = createRemoteJWKSet(new URL(`${ACCESS_ISSUER}/cdn-cgi/access/certs`));

async function isAccessAdmin(requestHeaders: Headers) {
  const { env } = await getCloudflareContext({ async: true });
  const token = requestHeaders.get("cf-access-jwt-assertion");
  const audience = (env as CloudflareEnv & { ACCESS_AUD?: string }).ACCESS_AUD;
  if (!token || !audience) return false;
  try {
    const { payload } = await jwtVerify(token, accessKeys, {
      issuer: ACCESS_ISSUER,
      audience,
      algorithms: ["RS256"],
    });
    return typeof payload.email === "string"
      && payload.email.toLowerCase() === "prakashjoshipax@gmail.com";
  } catch {
    return false;
  }
}

export async function isLocalEditor() {
  const { env } = await getCloudflareContext({ async: true });
  return env.APP_ENV === "local";
}

type ConfiguredAdminEnv = CloudflareEnv & {
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  ADMIN_SESSION_SECRET: string;
};

function base64Url(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

async function signature(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function safeEqual(left: string, right: string) {
  const algorithm = { name: "HMAC", hash: "SHA-256" };
  const [signingKey, verificationKey] = await Promise.all([
    crypto.subtle.importKey("raw", encoder.encode(left), algorithm, false, ["sign"]),
    crypto.subtle.importKey("raw", encoder.encode(right), algorithm, false, ["verify"]),
  ]);
  const message = encoder.encode("macify-admin-credential-comparison");
  const candidate = await crypto.subtle.sign("HMAC", signingKey, message);
  return crypto.subtle.verify("HMAC", verificationKey, candidate, message);
}

async function authEnv(): Promise<ConfiguredAdminEnv | null> {
  const { env } = await getCloudflareContext({ async: true });
  const values = env as AdminEnv;
  if (values.APP_ENV !== "local" || !values.ADMIN_EMAIL || !values.ADMIN_PASSWORD || !values.ADMIN_SESSION_SECRET) return null;
  return values as ConfiguredAdminEnv;
}

export async function authenticateAdmin(email: string, password: string) {
  const env = await authEnv();
  if (!env) return false;
  return (await safeEqual(email.trim().toLowerCase(), env.ADMIN_EMAIL.trim().toLowerCase()))
    && (await safeEqual(password, env.ADMIN_PASSWORD));
}

export async function createAdminSession() {
  const env = await authEnv();
  if (!env) throw new Error("Admin authentication is not configured.");
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `v1.${expires}`;
  const value = `${payload}.${await signature(payload, env.ADMIN_SESSION_SECRET)}`;
  const jar = await cookies();
  jar.set(COOKIE_NAME, value, {
    httpOnly: true,
    maxAge: SESSION_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: env.APP_ENV !== "local",
  });
}

export async function isAdminAuthenticated(requestHeaders?: Headers) {
  const { env: runtime } = await getCloudflareContext({ async: true });
  if (runtime.APP_ENV !== "local") return isAccessAdmin(requestHeaders ?? await headers());
  const env = await authEnv();
  if (!env) return false;
  const cookieHeader = requestHeaders?.get("cookie");
  const value = requestHeaders === undefined
    ? (await cookies()).get(COOKIE_NAME)?.value
    : cookieHeader?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!value) return false;
  const [version, expiresText, suppliedSignature, ...extra] = value.split(".");
  if (version !== "v1" || extra.length || !suppliedSignature) return false;
  const expires = Number(expiresText);
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  const expected = await signature(`${version}.${expiresText}`, env.ADMIN_SESSION_SECRET);
  return safeEqual(suppliedSignature, expected);
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) redirect((await isLocalEditor()) ? "/editor-login" : "/cdn-cgi/access/logout");
}

export async function requireAdminRequest(request: Request) {
  return isAdminAuthenticated(request.headers);
}

export async function clearAdminSession() {
  const { env } = await getCloudflareContext({ async: true });
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", { httpOnly: true, maxAge: 0, path: "/", sameSite: "lax", secure: env.APP_ENV !== "local" });
}

export async function loginRateLimit(requestHeaders: Headers) {
  const { env } = await getCloudflareContext({ async: true });
  if (env.APP_ENV !== "local") throw new Error("Local editor sign-in is disabled in production.");
  const address = requestHeaders.get("cf-connecting-ip") ?? requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const digest = base64Url(await crypto.subtle.digest("SHA-256", encoder.encode(address)));
  const windowStart = Math.floor(Date.now() / 900_000) * 900_000;
  const key = `${digest}:${windowStart}`;
  const existing = await env.DB.prepare("SELECT attempts FROM admin_login_attempts WHERE id = ?").bind(key).first<{ attempts: number }>();
  return {
    blocked: Number(existing?.attempts ?? 0) >= 5,
    async recordFailure() {
      await env.DB.prepare("INSERT INTO admin_login_attempts (id, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(id) DO UPDATE SET attempts = attempts + 1")
        .bind(key, windowStart + 1_800_000).run();
    },
    async clear() {
      await env.DB.prepare("DELETE FROM admin_login_attempts WHERE id = ? OR expires_at < ?").bind(key, Date.now()).run();
    },
  };
}

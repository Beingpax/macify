import { type NextRequest, NextResponse } from "next/server";

const canonicalOrigin = "https://macify.app";

export function proxy(request: NextRequest) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const hostname = request.nextUrl.hostname.toLowerCase();
  const requiresHttps = forwardedProtocol === "http" || request.nextUrl.protocol === "http:";
  const requiresCanonicalHost = hostname === "www.macify.app";

  if (!requiresHttps && !requiresCanonicalHost) return NextResponse.next();

  return NextResponse.redirect(new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, canonicalOrigin), 308);
}

export const config = {
  matcher: "/:path*",
};

import { NextRequest, NextResponse } from "next/server";

import { configuredAuthProvider } from "@/lib/auth/contracts";
import { sessionCookieName, verifySessionToken } from "@/lib/auth/session";

const publicPaths = new Set(["/login", "/api/auth/login", "/api/health"]);

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const existing = requestHeaders.get("x-correlation-id")?.trim();
  const correlationId =
    existing && /^[a-zA-Z0-9._:-]{8,128}$/.test(existing)
      ? existing
      : crypto.randomUUID();
  requestHeaders.set("x-correlation-id", correlationId);
  let response: NextResponse;
  if (
    configuredAuthProvider() === "database" &&
    !publicPaths.has(request.nextUrl.pathname)
  ) {
    const user = await verifySessionToken(
      request.cookies.get(sessionCookieName)?.value,
      process.env.AUTH_SESSION_SECRET ?? "",
    );
    if (!user) {
      if (request.nextUrl.pathname.startsWith("/api/")) {
        response = NextResponse.json(
          { error: "Authentication is required." },
          { status: 401 },
        );
      } else {
        const login = new URL("/login", request.url);
        login.searchParams.set(
          "returnTo",
          `${request.nextUrl.pathname}${request.nextUrl.search}`,
        );
        response = NextResponse.redirect(login);
      }
    } else {
      requestHeaders.delete("x-dora-user-id");
      requestHeaders.delete("x-dora-user-role");
      requestHeaders.set("x-dora-user-id", user.id);
      requestHeaders.set("x-dora-user-role", user.role);
      response = NextResponse.next({ request: { headers: requestHeaders } });
    }
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }
  response.headers.set("x-correlation-id", correlationId);
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("x-frame-options", "SAMEORIGIN");
  response.headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  response.headers.set(
    "content-security-policy",
    [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.applicationinsights.azure.com https://*.in.applicationinsights.azure.com",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join("; "),
  );
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

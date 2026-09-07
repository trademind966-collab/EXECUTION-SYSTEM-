import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

// Middleware runs on the edge and can't hit Postgres directly, so it only
// checks for the *presence* of a session cookie for a fast redirect. Real
// authorization (is the session valid? what's the role?) is enforced again
// server-side in every API route via requireUser()/RBAC checks — this is
// UX-only, not a security boundary.
const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/goals", "/tasks", "/admin", "/manager"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const hasSession = req.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/goals/:path*", "/tasks/:path*", "/admin/:path*", "/manager/:path*"],
};

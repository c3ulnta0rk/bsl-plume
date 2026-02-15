import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const ADMIN_PATTERN = /^\/(?:fr|en)\/[^/]+\/admin/;
const AUTH_COOKIE_NAME = "better-auth.session_token";

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin routes: check for auth session cookie
  if (ADMIN_PATTERN.test(pathname)) {
    const sessionCookie = request.cookies.get(AUTH_COOKIE_NAME);
    if (!sessionCookie) {
      const locale = pathname.startsWith("/en") ? "en" : "fr";
      const loginUrl = new URL(`/${locale}/auth/connexion`, request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};

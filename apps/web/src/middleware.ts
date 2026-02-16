import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const ADMIN_PATTERN = /^\/(?:fr|en)\/[^/]+\/admin/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create a response first to pass cookies through
  let response = intlMiddleware(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          // Re-run intl middleware to get a fresh response with updated request cookies
          response = intlMiddleware(request);
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Refresh the session token (important for token rotation)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect admin routes
  if (ADMIN_PATTERN.test(pathname) && !user) {
    const locale = pathname.startsWith("/en") ? "en" : "fr";
    const loginUrl = new URL(`/${locale}/auth/connexion`, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};

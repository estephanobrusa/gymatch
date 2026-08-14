import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js Middleware — runs on every matched request in the Edge Runtime.
 *
 * Responsibilities:
 * 1. Refresh the Supabase session cookie (uses getUser() — NOT getSession())
 * 2. Redirect unauthenticated users away from protected routes → /login
 *
 * NOTE: Username/onboarding check is NOT done here because Prisma does not run
 * in the Edge Runtime. The onboarding redirect is enforced in the
 * /(protected)/layout.tsx Server Component, which has full Node.js access.
 *
 * This split is intentional:
 * - Middleware → fast auth gate (Edge-compatible, no DB)
 * - Layout    → onboarding gate (Node.js Server Component, can hit Prisma)
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Build a Supabase client that can read/write cookies on the response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: use getUser() — NOT getSession().
  // getUser() re-validates the JWT server-side; getSession() trusts the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No session — redirect to /login
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Session is valid — pass through (with refreshed cookies on response)
  return response;
}

/**
 * Matcher config:
 * - Protects all routes EXCEPT public pages and static assets
 * - /login, /auth/callback, /api/*, and static files bypass middleware
 *
 * Onboarding (/onboarding/*) is NOT protected here — the /(protected)/layout.tsx
 * handles the redirect from protected content to /onboarding/username when needed.
 * The onboarding page itself is accessible to authenticated users without username.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - /auth/callback     (OAuth callback — must be public)
     * - /login             (sign-in page — must be public)
     * - /banned            (ban notice — must be public so banned users see it)
     * - /waitlist          (waitlist notice — must be public for waitlisted users)
     * - /onboarding/*      (onboarding — accessible to auth users without username)
     * - /api/*             (API routes — handled separately if needed)
     * - /_next/static      (Next.js static assets)
     * - /_next/image       (Next.js image optimization)
     * - /favicon.ico, /manifest.json, /sw.js (PWA + browser files)
     * - Files with extensions (e.g. .png, .svg, .css)
     */
    "/((?!auth/callback|login|banned|waitlist|onboarding|api/|_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|.*\\.[\\w]+$).*)",
  ],
};

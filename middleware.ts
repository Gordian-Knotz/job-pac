import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie on every request.
 *
 * WHY THIS IS DEFENSIVE
 * This used to read the env vars with `!` and construct the client
 * unconditionally. When NEXT_PUBLIC_SUPABASE_URL was renamed in the Vercel
 * project, createServerClient threw here — and because middleware runs before
 * every route, the whole site returned
 * `500 MIDDLEWARE_INVOCATION_FAILED`, including the homepage and job listings,
 * which need no session at all.
 *
 * The only job of this file is to keep a session fresh. If it cannot, the
 * correct outcome is that sessions do not refresh — not that the site goes
 * down. Route protection does not live here: it lives in requireUser() and
 * requireProfile() in lib/auth.ts, which are server-side and unaffected. So
 * failing open here weakens nothing.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Loud in the logs, invisible to the visitor.
    console.error(
      "[middleware] Supabase env missing — session refresh skipped. " +
        `NEXT_PUBLIC_SUPABASE_URL: ${url ? "set" : "MISSING"}, ` +
        `NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anonKey ? "set" : "MISSING"}`
    );
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    await supabase.auth.getUser();
  } catch (error) {
    // A transient auth outage should not take the job board with it.
    console.error("[middleware] session refresh failed:", error);
    return NextResponse.next({ request });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

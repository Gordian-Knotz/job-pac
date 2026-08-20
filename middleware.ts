import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Two jobs: refresh the Supabase session cookie, and set the per-request
 * Content-Security-Policy.
 *
 * WHY THE CSP LIVES HERE
 * A CSP worth having pins scripts to a nonce, and a nonce has to be generated
 * per request — so it cannot be a static header in next.config.ts. Next reads
 * the nonce out of the CSP on the *request* headers and stamps it onto its own
 * inline bootstrap scripts, which is why it is set on both request and response.
 *
 * WHY REPORT-ONLY FOR NOW
 * If the nonce fails to propagate to even one inline script, `script-src` kills
 * the bootstrap and every page renders blank. That is a bad trade to make on the
 * day the site opens to outside traffic. Report-Only surfaces violations in the
 * browser console and to any configured report endpoint while changing nothing
 * about behaviour. Flip CSP_ENFORCE to true once the console is clean — the
 * policy itself is already the real one.
 *
 * WHY MIDDLEWARE FAILS OPEN
 * Renaming NEXT_PUBLIC_SUPABASE_URL in the Vercel project once produced
 * 500 MIDDLEWARE_INVOCATION_FAILED on every route, including pages that need no
 * session at all. Route protection is not here — it is in requireUser() and
 * requireProfile() — so failing open weakens nothing, and failing closed takes
 * the job board offline.
 */

/**
 * Enforcing. Held at Report-Only for one deploy first and confirmed on
 * production that Next stamps the nonce onto its bootstrap — 25 nonce
 * attributes across 24 script tags on jobs.pac.africa. Without that check,
 * enforcing script-src blanks every page.
 *
 * If a future dependency injects an un-nonced inline script, this is the switch
 * to flip back while it is sorted.
 */
const CSP_ENFORCE = true;

/**
 * Next's dev server compiles with eval (react-refresh) and injects unnoced
 * inline scripts, both of which this policy blocks — which meant `next dev`
 * served a page whose client JavaScript never ran at all: no theme toggle, no
 * globe, and every Reveal stuck at opacity 0. The production build does neither,
 * so the concession is confined to development.
 *
 * Keyed on NODE_ENV, which Next sets and a request cannot influence. It is
 * "development" only under `next dev`; `next build` hardcodes "production".
 */
const DEV = process.env.NODE_ENV === "development";

/**
 * Captcha provider origins. Both providers are listed rather than only the
 * configured one: the provider is a NEXT_PUBLIC_ env var read in the browser,
 * and a policy that silently stops matching when someone flips it is a worse
 * failure than a spare host here. None of them can execute anything on this
 * origin — they serve a sandboxed iframe containing their own challenge.
 *
 * frame-src is the one that matters. It was 'none', which blocks the widget
 * outright: the challenge renders in an iframe, so enabling captcha in Supabase
 * without this line takes sign-in down with no visible cause.
 *
 * Named exactly rather than as `*.hcaptcha.com`: a wildcard over someone
 * else's subdomain space is a standing bet on their DNS hygiene, and only these
 * two hosts are ever needed.
 */
const CAPTCHA_HOSTS =
  "https://challenges.cloudflare.com https://newassets.hcaptcha.com https://api.hcaptcha.com";

function buildCsp(nonce: string): string {
  return [
    `default-src 'self'`,
    // strict-dynamic lets Next's nonced bootstrap load its own chunks without
    // enumerating them, and in supporting browsers it makes host allowlists for
    // scripts redundant. The captcha hosts are named anyway, for the browsers
    // that ignore strict-dynamic and fall back to the list.
    DEV
      ? `script-src 'self' 'unsafe-eval' 'unsafe-inline' ${CAPTCHA_HOSTS}`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${CAPTCHA_HOSTS}`,
    // 'unsafe-inline' for styles is a deliberate, bounded concession: Framer
    // Motion and next-themes both write inline styles, and style injection is a
    // far weaker primitive than script injection.
    `style-src 'self' 'unsafe-inline'`,
    // blob:/data: cover next/image and any client-side preview.
    `img-src 'self' blob: data: https://*.supabase.co`,
    // next/font self-hosts at build time, so no external font origin.
    `font-src 'self'`,
    // Supabase REST, realtime and Storage. Vercel Analytics posts to
    // /_vercel/insights on this origin, so 'self' already covers it.
    // ws: is the dev server's HMR socket. R2 is presigned-GET only, and those
    // URLs are opened in a new tab rather than fetched, so no host is needed.
    DEV
      ? `connect-src 'self' ws: wss: https://*.supabase.co ${CAPTCHA_HOSTS}`
      : `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${CAPTCHA_HOSTS}`,
    // Still 'none' for framing US — clickjacking protection is unchanged.
    `frame-ancestors 'none'`,
    // The captcha challenge is an iframe, so this can no longer be 'none'.
    `frame-src ${CAPTCHA_HOSTS}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    // Every mutation is a server action posting back here.
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

export async function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildCsp(nonce);
  const cspHeader = CSP_ENFORCE
    ? "Content-Security-Policy"
    : "Content-Security-Policy-Report-Only";

  // Next reads the nonce from the request-side CSP to stamp its own scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const applyCsp = (response: NextResponse) => {
    response.headers.set(cspHeader, csp);
    return response;
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error(
      "[middleware] Supabase env missing — session refresh skipped. " +
        `NEXT_PUBLIC_SUPABASE_URL: ${url ? "set" : "MISSING"}, ` +
        `NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anonKey ? "set" : "MISSING"}`
    );
    return applyCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });

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
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    await supabase.auth.getUser();
  } catch (error) {
    console.error("[middleware] session refresh failed:", error);
    return applyCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  return applyCsp(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

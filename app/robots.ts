import type { MetadataRoute } from "next";
import { site } from "@/lib/content";

/**
 * There was no robots.txt at all, which the Vercel firewall log made visible:
 * Google alone accounted for 2.3k of 6.6k requests in a day on a site with two
 * live listings, and nothing told it which paths were pointless.
 *
 * Everything behind auth is disallowed. Not as a security control — these routes
 * are protected by requireUser/requireProfile and a crawler gets a redirect
 * either way — but because crawling them burns function invocations to be told
 * "sign in", and because a URL indexed today is a URL someone lands on
 * confused tomorrow.
 *
 * `/auth/*` is included for a subtler reason: a sign-up page in a search index
 * attracts credential-stuffing traffic that would otherwise never find it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/auth", "/api"],
      },
    ],
    sitemap: `https://${site.domain}/sitemap.xml`,
    host: `https://${site.domain}`,
  };
}

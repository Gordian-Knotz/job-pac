/**
 * Pure CV helpers — safe to import from client components.
 *
 * Signing lives in lib/cv-access.ts and lib/r2.ts, which are server-only: the
 * R2 secret must never reach the browser bundle, and this file is imported by
 * components/apply-form.tsx.
 *
 * THREE SHAPES OF applications.cv_url
 *
 *   https://jobs.pac.africa/wp-content/uploads/jobmonster/…
 *       Legacy. Dead since the domain moved to Vercel — those paths now hit the
 *       Next.js app and return 403. Recoverable from the local archive.
 *
 *   r2:<key>
 *       The recovered archive, in Cloudflare R2. Roughly 1.2 GB, which is why it
 *       is not in Supabase Storage: the free tier is 1 GB and would have been
 *       83% full before a single new applicant arrived.
 *
 *   <hash>/<filename>
 *       A new upload, in the Supabase `cvs` bucket. New CVs stay here because
 *       the browser-side upload path already works in production and averages
 *       ~250 KB, so 1 GB is years of intake.
 */

export const CV_BUCKET = "cvs";
export const CV_MAX_BYTES = 5 * 1024 * 1024;
export const CV_ACCEPT = "application/pdf";

/** Marks a cv_url as an R2 object key. */
export const R2_PREFIX = "r2:";

export type CvLink =
  | { kind: "supabase"; href: string }
  | { kind: "r2"; href: string }
  | { kind: "legacy"; href: string }
  | { kind: "none" };

export function isLegacyCvUrl(cvUrl: string | null | undefined): boolean {
  return !!cvUrl && /^https?:\/\//i.test(cvUrl);
}

export function isR2Key(cvUrl: string | null | undefined): boolean {
  return !!cvUrl && cvUrl.startsWith(R2_PREFIX);
}

export function r2KeyOf(cvUrl: string): string {
  return cvUrl.slice(R2_PREFIX.length);
}

/**
 * Object path for a new upload: <uuid>/<safe-filename>.pdf
 *
 * A random prefix rather than a user id, because guests upload too and there is
 * no id to key on. It needs to be unguessable rather than meaningful.
 */
export function cvObjectPath(originalName: string): string {
  const safe =
    originalName
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-80) || "cv.pdf";
  return `${crypto.randomUUID()}/${safe}`;
}

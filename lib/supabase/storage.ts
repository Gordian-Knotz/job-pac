import type { SupabaseClient } from "@supabase/supabase-js";

export const CV_BUCKET = "cvs";
export const CV_MAX_BYTES = 5 * 1024 * 1024; // mirrors the bucket's own limit
export const CV_ACCEPT = "application/pdf";

/**
 * The 4,355 migrated applications carry an absolute URL to the old WordPress
 * host, which no longer serves anything. New uploads store a storage object
 * path instead. The leading scheme is what tells the two apart.
 */
export function isLegacyCvUrl(cvUrl: string | null | undefined): boolean {
  return !!cvUrl && /^https?:\/\//i.test(cvUrl);
}

/**
 * Resolves a stored cv_url to something a browser can open.
 *
 * Returns null for legacy WordPress URLs — they would 404, and rendering a dead
 * link as if it worked is worse than showing nothing. Callers use
 * isLegacyCvUrl() to label those explicitly.
 *
 * The bucket is private, so this mints a short-lived signed URL. RLS on
 * storage.objects still applies: the caller only gets a URL for a file they are
 * allowed to read (migration 007).
 */
export async function signedCvUrl(
  // Structural rather than SupabaseClient<Database>, so both the browser and
  // server clients satisfy it without a cast.
  supabase: Pick<SupabaseClient, "storage">,
  cvUrl: string | null | undefined,
  expiresInSeconds = 300
): Promise<string | null> {
  if (!cvUrl || isLegacyCvUrl(cvUrl)) return null;

  const { data, error } = await supabase.storage
    .from(CV_BUCKET)
    .createSignedUrl(cvUrl, expiresInSeconds);

  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Object path for a new upload: <uuid>/<safe-filename>.pdf
 *
 * A random prefix rather than a user id, because guests upload too and there is
 * no id to key on. Migration 007's employer read policy matches on the path
 * recorded in applications.cv_url, so the prefix needs to be unguessable rather
 * than meaningful.
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

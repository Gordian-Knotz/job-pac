import "server-only";
import { headers } from "next/headers";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Rate limiting for the apply server action — see migrations/026_apply_rate_limit.sql
 * for the counter itself. This is the only call site; it is not a general
 * framework, so adding a second one should mean asking whether the same
 * bucket/window shape actually fits before reusing this.
 *
 * The IP is hashed before it ever reaches the database — this product already
 * treats tracking an anonymous applicant's address as something to avoid
 * where possible, and a hash is enough to rate-limit against without being
 * reversible back to an address.
 *
 * Fails OPEN: if the check itself errors (missing service role key, database
 * hiccup, or migration 026 not yet applied so the function does not exist
 * yet), a real applicant is not blocked over infrastructure trouble — the
 * guest path is still constrained server-side by `submit_guest_application()`
 * regardless of whether this check ran.
 *
 * Failing open silently would mean the limiter can be permanently inert —
 * e.g. if 026 was never run against the live project — with nothing to show
 * for it in the UI, since an allowed request looks identical to a correctly
 * rate-limited one. Logged here so that state is at least visible in
 * function logs rather than indistinguishable from "nobody hit the limit".
 */
export async function checkRateLimit(
  bucket: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  const hdrs = await headers();
  const forwardedFor = hdrs.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "unknown";
  const hash = createHash("sha256").update(ip).digest("hex").slice(0, 32);
  const key = `${bucket}:${hash}`;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("checkRateLimit: rate_limit_hit failed, failing open", error);
      return true;
    }
    return data === true;
  } catch (err) {
    console.error("checkRateLimit: unexpected error, failing open", err);
    return true;
  }
}

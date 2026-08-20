import { createClient } from "@/lib/supabase/server";
import { dashboardPathFor } from "@/lib/auth";
import { PublicNav } from "@/components/public-nav";
import type { UserRole } from "@/types/database";

/**
 * Resolves who is looking before anything renders, then hands the finished
 * destinations to the client shell.
 *
 * Brief §7 requires the auth gate to be settled server-side on first paint. So
 * "Post a Job" is a plain href computed from the role rather than a button that
 * discovers the answer after hydration — nothing flashes and it works with
 * JavaScript off.
 */
export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: UserRole | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = (data?.role as UserRole) ?? null;
  }

  // Signed out goes through signup carrying where they were headed. Seekers go
  // to the interstitial rather than being silently refused (brief §7).
  const postHref =
    role === "employer"
      ? "/dashboard/employer/post"
      : role === "admin"
        ? "/admin/jobs/new"
        : role === "seeker"
          ? "/post-a-job"
          : "/auth/signup?next=/post-a-job";

  return (
    <PublicNav
      postHref={postHref}
      dashboardHref={role ? dashboardPathFor(role) : null}
      signedIn={Boolean(role)}
    />
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";

/**
 * Where a given role belongs after signing in.
 */
export function dashboardPathFor(role: UserRole): string {
  if (role === "admin") return "/admin";
  if (role === "employer") return "/dashboard/employer";
  return "/dashboard/seeker";
}

/**
 * Requires a signed-in user with a profile row, and hands back the Supabase
 * client so callers do not construct a second one.
 *
 * Every auth user has a profile from migration 003's on_auth_user_created
 * trigger. A missing profile therefore means something is genuinely wrong
 * rather than "new user", so it is surfaced instead of silently patched.
 */
export async function requireUser(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  profile: Profile;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/auth/login?error=missing-profile");

  return { supabase, userId: user.id, profile: profile as Profile };
}

/**
 * As requireUser, but also pins the role. A user with the wrong role is sent to
 * their own dashboard rather than shown an error — being an employer on a
 * seeker page is a wrong turn, not a failure.
 */
export async function requireProfile(role: UserRole) {
  const ctx = await requireUser();
  if (ctx.profile.role !== role) redirect(dashboardPathFor(ctx.profile.role));
  return ctx;
}

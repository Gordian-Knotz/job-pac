"use server";

import { redirect } from "next/navigation";
import { requireUser, dashboardPathFor } from "@/lib/auth";
import { dash } from "@/lib/content";

/**
 * Password change from Settings.
 *
 * `updateUser` rather than the emailed recovery flow: the person is already
 * authenticated, so posting a link to their inbox adds a round trip and a token
 * to leak without proving anything the session has not already proved.
 *
 * 10 characters rather than the 8 the signup form asks for. Supabase's
 * leaked-password check (HaveIBeenPwned) is the other half of this and is a
 * project setting, not something this code can turn on.
 */
export async function changePassword(formData: FormData) {
  const { supabase, profile } = await requireUser();
  const base = `${dashboardPathFor(profile.role)}/settings`;
  const fail = (message: string) =>
    redirect(`${base}?error=${encodeURIComponent(message)}`);

  const password = formData.get("password");
  const confirm = formData.get("password_confirm");

  if (typeof password !== "string" || password.length < 10) {
    fail(dash.settings.passwordTooShort);
  }
  if (password !== confirm) fail(dash.settings.passwordMismatch);

  const { error } = await supabase.auth.updateUser({ password: password as string });
  if (error) fail(error.message);

  redirect(`${base}?updated=password`);
}

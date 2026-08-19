"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { CV_ACCEPT, CV_BUCKET, CV_MAX_BYTES, cvObjectPath } from "@/lib/cv";
import { normaliseLinkedIn } from "@/lib/profile";

/**
 * Attaches historical applications filed under this user's confirmed email.
 * All the safety lives in the RPC (migration 006): the address comes from
 * auth.users, and an unconfirmed address claims nothing.
 */
export async function claimApplications() {
  const { supabase } = await requireProfile("seeker");

  const { data, error } = await supabase.rpc("claim_historical_applications");
  if (error) {
    redirect(`/dashboard/seeker?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/seeker");
  redirect(`/dashboard/seeker?claimed=${(data as number) ?? 0}`);
}

export async function updateProfile(formData: FormData) {
  const { supabase, userId } = await requireProfile("seeker");

  const text = (key: string) => {
    const v = formData.get(key);
    if (typeof v !== "string") return null;
    const trimmed = v.trim();
    return trimmed === "" ? null : trimmed;
  };

  // Stored as text[]; the form takes a comma-separated list.
  const rawSkills = formData.get("skills");
  const skills =
    typeof rawSkills === "string" && rawSkills.trim() !== ""
      ? rawSkills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 40)
      : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: text("full_name"),
      phone: text("phone"),
      headline: text("headline"),
      bio: text("bio"),
      address: text("address"),
      linkedin_url: normaliseLinkedIn(text("linkedin_url")),
      skills,
    })
    .eq("id", userId);

  if (error) {
    redirect(`/dashboard/seeker/profile?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/seeker/profile");
  redirect("/dashboard/seeker/profile?saved=1");
}

export async function uploadCv(formData: FormData) {
  const { supabase, userId } = await requireProfile("seeker");

  const file = formData.get("cv");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/dashboard/seeker/profile?error=Choose+a+PDF+to+upload");
  }

  // The bucket enforces both of these too (migration 007). Checking here as
  // well turns a storage rejection into a message the applicant can act on.
  if (file.type !== CV_ACCEPT) {
    redirect("/dashboard/seeker/profile?error=CV+must+be+a+PDF");
  }
  if (file.size > CV_MAX_BYTES) {
    redirect("/dashboard/seeker/profile?error=CV+must+be+under+5MB");
  }

  const path = cvObjectPath(file.name);
  const { error: uploadError } = await supabase.storage
    .from(CV_BUCKET)
    .upload(path, file, { contentType: CV_ACCEPT, upsert: false });

  if (uploadError) {
    redirect(
      `/dashboard/seeker/profile?error=${encodeURIComponent(uploadError.message)}`
    );
  }

  // Store the object path, never a URL — see lib/cv.ts.
  const { error } = await supabase
    .from("profiles")
    .update({ cv_url: path })
    .eq("id", userId);

  if (error) {
    redirect(`/dashboard/seeker/profile?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/seeker/profile");
  redirect("/dashboard/seeker/profile?cv=1");
}

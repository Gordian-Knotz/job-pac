"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import type { JobStatus } from "@/types/database";

const ALLOWED: JobStatus[] = [
  "draft",
  "pending_review",
  "published",
  "expired",
  "closed",
];

/**
 * Moves a listing through the review queue. This is the only route from
 * pending_review to published, so it is the only way anything reaches /jobs.
 */
export async function setJobStatus(formData: FormData) {
  const { supabase } = await requireProfile("admin");

  const jobId = formData.get("job_id");
  const status = formData.get("status");

  if (
    typeof jobId !== "string" ||
    typeof status !== "string" ||
    !(ALLOWED as string[]).includes(status)
  ) {
    redirect("/admin?error=Invalid+request");
  }

  const { error } = await supabase
    .from("jobs")
    .update({ status: status as JobStatus })
    .eq("id", jobId);

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  // The listing appears on or disappears from the public pages, so refresh
  // those too, not just the queue.
  revalidatePath("/admin");
  revalidatePath("/jobs");
  revalidatePath("/");
  redirect(`/admin?updated=${status}`);
}

/**
 * Verification drives the badge on job cards. A database trigger blocks users
 * from setting it on themselves (migration 001); this is the sanctioned path.
 */
export async function setCompanyVerified(formData: FormData) {
  const { supabase } = await requireProfile("admin");

  const companyId = formData.get("company_id");
  const verified = formData.get("verified") === "true";

  if (typeof companyId !== "string") {
    redirect("/admin?error=Invalid+request");
  }

  const { error } = await supabase
    .from("companies")
    .update({ verified })
    .eq("id", companyId);

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/jobs");
  redirect("/admin?updated=verification");
}

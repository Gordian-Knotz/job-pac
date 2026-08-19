"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { slugify, randomSuffix } from "@/lib/utils";
import {
  UNIQUE_VIOLATION,
  insertJobWithUniqueSlug,
  oneOf,
  parseJobFields,
  str,
} from "@/lib/job-form";
import type { ApplicationStatus } from "@/types/database";

const APPLICATION_STATUSES: ApplicationStatus[] = [
  "pending",
  "shortlisted",
  "rejected",
  "hired",
];

export async function upsertCompany(formData: FormData) {
  const { supabase, userId, profile } = await requireProfile("employer");

  const name = str(formData, "name");
  if (!name) {
    redirect("/dashboard/employer/company?error=Company+name+is+required");
  }

  const fields = {
    name,
    website: str(formData, "website"),
    description: str(formData, "description"),
    industry: str(formData, "industry"),
    location: str(formData, "location"),
    size: str(formData, "size"),
  };

  // `verified` is deliberately absent: a database trigger rejects any attempt to
  // change it from a user session (migration 001). Only an admin can grant it.
  if (profile.company_id) {
    const { error } = await supabase
      .from("companies")
      .update(fields)
      .eq("id", profile.company_id);

    if (error) {
      redirect(
        `/dashboard/employer/company?error=${encodeURIComponent(error.message)}`
      );
    }
    revalidatePath("/dashboard/employer/company");
    redirect("/dashboard/employer/company?saved=1");
  }

  // slug is unique, and two employers both called "Nairobi Logistics" is
  // entirely ordinary — so retry once with a suffix.
  let companyId: string | null = null;
  for (let attempt = 0; attempt < 2 && !companyId; attempt++) {
    const slug = attempt === 0 ? slugify(name) : `${slugify(name)}-${randomSuffix()}`;
    const { data, error } = await supabase
      .from("companies")
      .insert({ ...fields, slug, owner_id: userId })
      .select("id")
      .single();

    if (!error && data) {
      companyId = data.id;
      break;
    }
    if (error && error.code !== UNIQUE_VIOLATION) {
      redirect(
        `/dashboard/employer/company?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  if (!companyId) {
    redirect("/dashboard/employer/company?error=Could+not+create+company");
  }

  const { error: linkError } = await supabase
    .from("profiles")
    .update({ company_id: companyId })
    .eq("id", userId);

  if (linkError) {
    redirect(
      `/dashboard/employer/company?error=${encodeURIComponent(linkError.message)}`
    );
  }

  revalidatePath("/dashboard/employer");
  redirect("/dashboard/employer/company?saved=1");
}

export async function createJob(formData: FormData) {
  const { supabase, userId, profile } = await requireProfile("employer");

  // A job needs company_id for the employer-visibility policy on applications
  // to resolve (migration 004), so posting without a company is blocked here as
  // well as in the page guard.
  if (!profile.company_id) {
    redirect("/dashboard/employer/company?error=Create+your+company+profile+first");
  }

  const fields = parseJobFields(formData);
  if (!fields) {
    redirect("/dashboard/employer/post?error=Title+and+description+are+required");
  }

  const result = await insertJobWithUniqueSlug(fields.title, (slug) =>
    supabase
      .from("jobs")
      .insert({
        ...fields,
        slug,
        company_id: profile.company_id,
        posted_by: userId,
        // Employer submissions always enter the queue. Only an admin publishes.
        status: "pending_review" as const,
      })
      .select("id")
      .single()
  );

  if ("error" in result) {
    redirect(`/dashboard/employer/post?error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath("/dashboard/employer");
  redirect("/dashboard/employer?posted=1");
}

export async function setApplicationStatus(formData: FormData) {
  const { supabase } = await requireProfile("employer");

  const applicationId = str(formData, "application_id");
  const jobId = str(formData, "job_id");
  const status = str(formData, "status");

  if (!applicationId || !jobId) {
    redirect("/dashboard/employer?error=Invalid+request");
  }

  const resolved = oneOf(status, APPLICATION_STATUSES, "pending");
  const note = str(formData, "employer_note");

  // RLS confines this to applications on jobs this employer owns, so a
  // mismatched id updates nothing rather than erroring.
  const { error } = await supabase
    .from("applications")
    .update({
      status: resolved,
      ...(note !== null ? { employer_note: note } : {}),
    })
    .eq("id", applicationId);

  if (error) {
    redirect(
      `/dashboard/employer/jobs/${jobId}?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath(`/dashboard/employer/jobs/${jobId}`);
  redirect(`/dashboard/employer/jobs/${jobId}?updated=1`);
}

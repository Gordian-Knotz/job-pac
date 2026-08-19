"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { slugify, randomSuffix } from "@/lib/utils";
import type {
  ApplicationStatus,
  EmploymentLevel,
  JobType,
} from "@/types/database";

const JOB_TYPES: JobType[] = [
  "full_time",
  "part_time",
  "freelance",
  "contract",
  "internship",
];
const LEVELS: EmploymentLevel[] = ["entry", "mid", "senior", "executive"];
const APPLICATION_STATUSES: ApplicationStatus[] = [
  "pending",
  "shortlisted",
  "rejected",
  "hired",
];

const UNIQUE_VIOLATION = "23505";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function int(formData: FormData, key: string): number | null {
  const raw = str(formData, key);
  if (raw === null) return null;
  const n = Number.parseInt(raw.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

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

  // Existing company: `verified` is deliberately absent from `fields`, and a
  // database trigger rejects any attempt to change it from a user session
  // (migration 001).
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

  // New company. slug is unique, so retry once with a suffix on collision —
  // "Nairobi Logistics" is exactly the kind of name two employers both pick.
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
  // to resolve (migration 004), so posting without a company is blocked here
  // as well as in the page guard.
  if (!profile.company_id) {
    redirect("/dashboard/employer/company?error=Create+your+company+profile+first");
  }

  const title = str(formData, "title");
  const description = str(formData, "description");
  if (!title || !description) {
    redirect("/dashboard/employer/post?error=Title+and+description+are+required");
  }

  const rawType = str(formData, "job_type");
  const rawLevel = str(formData, "employment_level");

  const payload = {
    company_id: profile.company_id,
    posted_by: userId,
    title,
    description,
    requirements: str(formData, "requirements"),
    benefits: str(formData, "benefits"),
    category_id: str(formData, "category_id"),
    location_id: str(formData, "location_id"),
    location_text: str(formData, "location_text"),
    job_type: (JOB_TYPES as string[]).includes(rawType ?? "")
      ? (rawType as JobType)
      : ("full_time" as JobType),
    employment_level: (LEVELS as string[]).includes(rawLevel ?? "")
      ? (rawLevel as EmploymentLevel)
      : ("mid" as EmploymentLevel),
    salary_min: int(formData, "salary_min"),
    salary_max: int(formData, "salary_max"),
    is_remote: formData.get("is_remote") === "on",
    application_deadline: str(formData, "application_deadline"),
    // Everything enters the review queue. /admin publishes it.
    status: "pending_review" as const,
  };

  let created = false;
  for (let attempt = 0; attempt < 2 && !created; attempt++) {
    const slug =
      attempt === 0 ? slugify(title) : `${slugify(title)}-${randomSuffix()}`;
    const { error } = await supabase.from("jobs").insert({ ...payload, slug });

    if (!error) {
      created = true;
      break;
    }
    if (error.code !== UNIQUE_VIOLATION) {
      redirect(`/dashboard/employer/post?error=${encodeURIComponent(error.message)}`);
    }
  }

  if (!created) {
    redirect("/dashboard/employer/post?error=Could+not+create+the+listing");
  }

  revalidatePath("/dashboard/employer");
  redirect("/dashboard/employer?posted=1");
}

export async function setApplicationStatus(formData: FormData) {
  const { supabase } = await requireProfile("employer");

  const applicationId = str(formData, "application_id");
  const jobId = str(formData, "job_id");
  const status = str(formData, "status");

  if (!applicationId || !jobId || !(APPLICATION_STATUSES as string[]).includes(status ?? "")) {
    redirect(`/dashboard/employer/jobs/${jobId ?? ""}?error=Invalid+request`);
  }

  const note = str(formData, "employer_note");

  // RLS confines this to applications on jobs this employer owns, so there is
  // no ownership check to duplicate here — a mismatched id simply updates
  // nothing rather than erroring.
  const { error } = await supabase
    .from("applications")
    .update({
      status: status as ApplicationStatus,
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

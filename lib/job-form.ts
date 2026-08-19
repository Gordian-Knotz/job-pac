import { slugify, randomSuffix } from "@/lib/utils";
import type { EmploymentLevel, JobStatus, JobType } from "@/types/database";

export const UNIQUE_VIOLATION = "23505";

const JOB_TYPES: JobType[] = [
  "full_time",
  "part_time",
  "freelance",
  "contract",
  "internship",
];
const LEVELS: EmploymentLevel[] = ["entry", "mid", "senior", "executive"];
export const JOB_STATUSES: JobStatus[] = [
  "draft",
  "pending_review",
  "published",
  "expired",
  "closed",
];

export function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function int(formData: FormData, key: string): number | null {
  const raw = str(formData, key);
  if (raw === null) return null;
  const n = Number.parseInt(raw.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export function oneOf<T extends string>(value: string | null, allowed: T[], fallback: T): T {
  return (allowed as string[]).includes(value ?? "") ? (value as T) : fallback;
}

export type JobFields = {
  title: string;
  description: string;
  requirements: string | null;
  benefits: string | null;
  category_id: string | null;
  location_id: string | null;
  location_text: string | null;
  job_type: JobType;
  employment_level: EmploymentLevel;
  salary_min: number | null;
  salary_max: number | null;
  is_remote: boolean;
  application_deadline: string | null;
};

/**
 * Reads the shared job fields. Returns null when the two required fields are
 * missing so the caller can redirect with its own error target.
 */
export function parseJobFields(formData: FormData): JobFields | null {
  const title = str(formData, "title");
  const description = str(formData, "description");
  if (!title || !description) return null;

  const salary_min = int(formData, "salary_min");
  const salary_max = int(formData, "salary_max");

  return {
    title,
    description,
    requirements: str(formData, "requirements"),
    benefits: str(formData, "benefits"),
    category_id: str(formData, "category_id"),
    location_id: str(formData, "location_id"),
    location_text: str(formData, "location_text"),
    job_type: oneOf(str(formData, "job_type"), JOB_TYPES, "full_time"),
    employment_level: oneOf(str(formData, "employment_level"), LEVELS, "mid"),
    // Swap them rather than reject: someone typing 120000 then 80000 meant a
    // range, and silently storing it backwards would break the salary sort.
    salary_min:
      salary_min !== null && salary_max !== null && salary_min > salary_max
        ? salary_max
        : salary_min,
    salary_max:
      salary_min !== null && salary_max !== null && salary_min > salary_max
        ? salary_min
        : salary_max,
    is_remote: formData.get("is_remote") === "on",
    application_deadline: str(formData, "application_deadline"),
  };
}

/**
 * Inserts a job, retrying once with a random suffix on a slug collision.
 * jobs.slug is `unique not null`, and two employers both posting "Sales
 * Representative" is entirely ordinary.
 */
/**
 * The caller supplies the insert, so the Supabase generics stay exact at the
 * call site instead of being flattened into a structural stand-in here.
 * PromiseLike rather than Promise because Supabase's query builder is thenable
 * but not an actual Promise.
 */
export async function insertJobWithUniqueSlug(
  title: string,
  insert: (slug: string) => PromiseLike<{
    data: { id: string } | null;
    error: { code?: string; message: string } | null;
  }>
): Promise<{ id: string } | { error: string }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const slug =
      attempt === 0 ? slugify(title) : `${slugify(title)}-${randomSuffix()}`;

    const { data, error } = await insert(slug);

    if (!error && data) return { id: data.id };
    if (error && error.code !== UNIQUE_VIOLATION) return { error: error.message };
  }
  return { error: "Could not create the listing — please try again." };
}

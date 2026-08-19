import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createJob } from "../actions";
import { JOB_TYPE_LABELS } from "@/lib/utils";
import type { JobCategory, JobLocation } from "@/types/database";

const inputClass =
  "w-full px-3 py-2.5 rounded-card border border-pac-line text-sm focus:border-pac-orange outline-none bg-white";

const LEVELS = [
  { value: "entry", label: "Entry level" },
  { value: "mid", label: "Mid level" },
  { value: "senior", label: "Senior" },
  { value: "executive", label: "Executive" },
];

export default async function PostJobPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, profile } = await requireProfile("employer");
  const params = await searchParams;

  // A listing needs company_id for the employer-visibility policy on
  // applications to resolve (migration 004). Without it an employer would post
  // a job and never see who applied.
  if (!profile.company_id) {
    redirect("/dashboard/employer/company?error=Create+your+company+profile+first");
  }

  const [{ data: categories }, { data: locations }] = await Promise.all([
    supabase.from("job_categories").select("id, name").order("name").limit(300),
    supabase.from("job_locations").select("id, name").order("name").limit(200),
  ]);

  return (
    <div>
      <span className="eyebrow">Employer</span>
      <h1 className="font-display text-3xl font-700 text-pac-ink mt-2 mb-2">
        Post a job
      </h1>
      <p className="text-sm text-pac-muted mb-8">
        Listings are reviewed by PAC Africa before they go live.
      </p>

      {params.error && (
        <p className="mb-6 text-sm text-red-600 border border-red-200 bg-red-50 rounded-card px-4 py-3">
          {params.error}
        </p>
      )}

      <form action={createJob} className="space-y-4 max-w-2xl">
        <div>
          <label htmlFor="title" className="eyebrow block mb-2">
            Job title *
          </label>
          <input id="title" name="title" required className={inputClass} />
        </div>

        <div>
          <label htmlFor="description" className="eyebrow block mb-2">
            About the role *
          </label>
          <textarea
            id="description"
            name="description"
            rows={8}
            required
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label htmlFor="requirements" className="eyebrow block mb-2">
            Requirements
          </label>
          <textarea
            id="requirements"
            name="requirements"
            rows={5}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label htmlFor="benefits" className="eyebrow block mb-2">
            Benefits
          </label>
          <textarea
            id="benefits"
            name="benefits"
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="category_id" className="eyebrow block mb-2">
              Category
            </label>
            <select id="category_id" name="category_id" className={inputClass}>
              <option value="">Not specified</option>
              {((categories ?? []) as JobCategory[]).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="location_id" className="eyebrow block mb-2">
              Location
            </label>
            <select id="location_id" name="location_id" className={inputClass}>
              <option value="">Not specified</option>
              {((locations ?? []) as JobLocation[]).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="location_text" className="eyebrow block mb-2">
            Location detail
          </label>
          <input
            id="location_text"
            name="location_text"
            placeholder="e.g. Westlands, Nairobi — or leave blank"
            className={inputClass}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="job_type" className="eyebrow block mb-2">
              Job type
            </label>
            <select
              id="job_type"
              name="job_type"
              defaultValue="full_time"
              className={inputClass}
            >
              {Object.entries(JOB_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="employment_level" className="eyebrow block mb-2">
              Seniority
            </label>
            <select
              id="employment_level"
              name="employment_level"
              defaultValue="mid"
              className={inputClass}
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="salary_min" className="eyebrow block mb-2">
              Salary from (KES)
            </label>
            <input
              id="salary_min"
              name="salary_min"
              inputMode="numeric"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="salary_max" className="eyebrow block mb-2">
              Salary to (KES)
            </label>
            <input
              id="salary_max"
              name="salary_max"
              inputMode="numeric"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="application_deadline" className="eyebrow block mb-2">
              Closing date
            </label>
            <input
              id="application_deadline"
              name="application_deadline"
              type="date"
              className={inputClass}
            />
          </div>
        </div>

        <label className="flex items-center gap-2.5 text-sm text-pac-ink pt-1">
          <input
            type="checkbox"
            name="is_remote"
            className="w-4 h-4 accent-pac-orange"
          />
          This role can be done remotely
        </label>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-pac-orange text-white px-5 py-2.5 rounded-card text-sm font-medium hover:bg-pac-orange-dark transition-colors"
          >
            Submit for review
          </button>
        </div>
      </form>
    </div>
  );
}

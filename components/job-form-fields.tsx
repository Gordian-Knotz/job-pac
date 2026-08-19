import { JOB_TYPE_LABELS } from "@/lib/utils";
import type { Job, JobCategory, JobLocation } from "@/types/database";

const LEVELS = [
  { value: "entry", label: "Entry level" },
  { value: "mid", label: "Mid level" },
  { value: "senior", label: "Senior" },
  { value: "executive", label: "Executive" },
];

/**
 * Every field of a job listing, shared by the employer post form and the admin
 * post/edit forms. One definition so the three can never drift apart — the
 * admin form is the one PAC staff use to collect jobs on employers' behalf, so
 * it has to accept exactly what an employer could have submitted.
 *
 * Pass `job` to prefill for editing.
 */
export function JobFormFields({
  categories,
  locations,
  job,
}: {
  categories: Pick<JobCategory, "id" | "name">[];
  locations: Pick<JobLocation, "id" | "name">[];
  job?: Job;
}) {
  return (
    <>
      <div>
        <label htmlFor="title" className="eyebrow block mb-2">
          Job title *
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={job?.title ?? ""}
          placeholder="e.g. Accounts Assistant"
          className="field"
        />
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
          defaultValue={job?.description ?? ""}
          className="field resize-y"
        />
        <p className="text-xs text-pac-muted mt-1.5">
          Basic HTML is preserved. Plain paragraphs are fine.
        </p>
      </div>

      <div>
        <label htmlFor="requirements" className="eyebrow block mb-2">
          Requirements
        </label>
        <textarea
          id="requirements"
          name="requirements"
          rows={5}
          defaultValue={job?.requirements ?? ""}
          className="field resize-y"
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
          defaultValue={job?.benefits ?? ""}
          className="field resize-y"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="category_id" className="eyebrow block mb-2">
            Category
          </label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={job?.category_id ?? ""}
            className="field"
          >
            <option value="">Not specified</option>
            {categories.map((c) => (
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
          <select
            id="location_id"
            name="location_id"
            defaultValue={job?.location_id ?? ""}
            className="field"
          >
            <option value="">Not specified</option>
            {locations.map((l) => (
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
          defaultValue={job?.location_text ?? ""}
          placeholder="e.g. Westlands, Nairobi"
          className="field"
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
            defaultValue={job?.job_type ?? "full_time"}
            className="field"
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
            defaultValue={job?.employment_level ?? "mid"}
            className="field"
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
            defaultValue={job?.salary_min ?? ""}
            className="field"
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
            defaultValue={job?.salary_max ?? ""}
            className="field"
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
            defaultValue={job?.application_deadline ?? ""}
            className="field"
          />
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-pac-ink">
        <input
          type="checkbox"
          name="is_remote"
          defaultChecked={job?.is_remote ?? false}
          className="w-4 h-4 accent-pac-orange"
        />
        This role can be done remotely
      </label>
    </>
  );
}

import { requireProfile } from "@/lib/auth";
import { upsertCompany } from "../actions";
import type { Company } from "@/types/database";

const inputClass =
  "w-full px-3 py-2.5 rounded-card border border-pac-line text-sm focus:border-pac-orange outline-none bg-white";

const SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

export default async function CompanyProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireProfile("employer");
  const params = await searchParams;

  let company: Company | null = null;
  if (profile.company_id) {
    const { data } = await supabase
      .from("companies")
      .select("*")
      .eq("id", profile.company_id)
      .single();
    company = (data as Company) ?? null;
  }

  return (
    <div>
      <span className="eyebrow">Employer</span>
      <h1 className="font-display text-3xl font-700 text-pac-ink mt-2 mb-8">
        {company ? "Company profile" : "Add your company"}
      </h1>

      {params.error && (
        <p className="mb-6 text-sm text-red-600 border border-red-200 bg-red-50 rounded-card px-4 py-3">
          {params.error}
        </p>
      )}
      {params.saved && !params.error && (
        <p className="mb-6 text-sm text-green-700 border border-green-200 bg-green-50 rounded-card px-4 py-3">
          Company profile saved.
        </p>
      )}

      <form action={upsertCompany} className="space-y-4 max-w-xl">
        <div>
          <label htmlFor="name" className="eyebrow block mb-2">
            Company name *
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={company?.name ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="description" className="eyebrow block mb-2">
            What the company does
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            defaultValue={company?.description ?? ""}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="industry" className="eyebrow block mb-2">
              Industry
            </label>
            <input
              id="industry"
              name="industry"
              defaultValue={company?.industry ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="location" className="eyebrow block mb-2">
              Head office
            </label>
            <input
              id="location"
              name="location"
              placeholder="e.g. Nairobi"
              defaultValue={company?.location ?? ""}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="size" className="eyebrow block mb-2">
              Headcount
            </label>
            <select
              id="size"
              name="size"
              defaultValue={company?.size ?? ""}
              className={inputClass}
            >
              <option value="">Not specified</option>
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} people
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="website" className="eyebrow block mb-2">
              Website
            </label>
            <input
              id="website"
              name="website"
              type="url"
              placeholder="https://…"
              defaultValue={company?.website ?? ""}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            className="bg-pac-orange text-white px-5 py-2.5 rounded-card text-sm font-medium hover:bg-pac-orange-dark transition-colors"
          >
            {company ? "Save changes" : "Create company profile"}
          </button>
          {company && (
            <span className="text-xs text-pac-muted">
              {company.verified
                ? "Verified by PAC Africa"
                : "Verification is granted by PAC Africa, not self-set"}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

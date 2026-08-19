import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getJobLookups } from "@/lib/lookups";
import { JobFormFields } from "@/components/job-form-fields";
import { createJob } from "../actions";

export default async function PostJobPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile } = await requireProfile("employer");
  const params = await searchParams;

  // A listing needs company_id for the employer-visibility policy on
  // applications to resolve (migration 004). Without it an employer would post
  // a job and never see who applied.
  if (!profile.company_id) {
    redirect("/dashboard/employer/company?error=Create+your+company+profile+first");
  }

  const lookups = await getJobLookups();

  return (
    <div>
      <span className="eyebrow">Employer</span>
      <h1 className="font-display text-3xl font-700 text-pac-ink mt-2 mb-2">
        Post a job
      </h1>
      <p className="text-sm text-pac-muted mb-8">
        PAC Africa reviews every listing before it goes live.
      </p>

      {params.error && (
        <p className="mb-6 text-sm text-red-600 border border-red-200 bg-red-50 rounded-card px-4 py-3">
          {params.error}
        </p>
      )}

      <form action={createJob} className="space-y-4 max-w-2xl">
        <JobFormFields categories={lookups.categories} locations={lookups.locations} />

        <div className="pt-2">
          <button type="submit" className="btn-primary">
            Submit for review
          </button>
        </div>
      </form>
    </div>
  );
}

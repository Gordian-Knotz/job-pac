import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { JobStatusBadge } from "@/components/status-badge";
import { timeAgo } from "@/lib/utils";
import type { JobStatus } from "@/types/database";

interface JobRow {
  id: string;
  title: string;
  slug: string;
  status: JobStatus;
  created_at: string;
  applications: { count: number }[];
}

export default async function EmployerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ posted?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireProfile("employer");
  const params = await searchParams;

  // No company yet — nothing else on this page can work, so ask for that first
  // rather than showing an empty listings table.
  if (!profile.company_id) {
    return (
      <div>
        <span className="eyebrow">Employer</span>
        <h1 className="font-display text-3xl font-700 text-pac-ink mt-2 mb-8">
          Set up your company
        </h1>
        <div className="border border-dashed border-pac-line rounded-card py-16 px-6 text-center">
          <p className="font-display text-lg text-pac-ink mb-1">
            One step before you can post
          </p>
          <p className="text-sm text-pac-muted mb-5 max-w-md mx-auto">
            Job seekers see who they are applying to, and your listings are
            attached to your company record. Add it once and you are set.
          </p>
          <Link
            href="/dashboard/employer/company"
            className="inline-block bg-pac-orange text-white px-5 py-2.5 rounded-card text-sm font-medium hover:bg-pac-orange-dark transition-colors"
          >
            Add company profile
          </Link>
        </div>
      </div>
    );
  }

  const [{ data: jobs }, { data: company }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, slug, status, created_at, applications(count)")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("companies")
      .select("name, verified")
      .eq("id", profile.company_id)
      .single(),
  ]);

  const rows = (jobs ?? []) as unknown as JobRow[];
  const totalApplications = rows.reduce(
    (sum, job) => sum + (job.applications?.[0]?.count ?? 0),
    0
  );

  return (
    <div>
      <span className="eyebrow">Employer</span>
      <h1 className="font-display text-3xl font-700 text-pac-ink mt-2 mb-1">
        {company?.name ?? "Your listings"}
      </h1>
      <p className="text-sm text-pac-muted mb-8">
        {company?.verified
          ? "Verified employer"
          : "Pending verification — PAC Africa reviews new employers"}
      </p>

      {params.error && (
        <p className="mb-6 text-sm text-red-600 border border-red-200 bg-red-50 rounded-card px-4 py-3">
          {params.error}
        </p>
      )}
      {params.posted && (
        <p className="mb-6 text-sm text-green-700 border border-green-200 bg-green-50 rounded-card px-4 py-3">
          Listing submitted. It appears on the site once PAC Africa approves it.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 mb-10">
        <Stat label="Listings" value={rows.length} />
        <Stat label="Applications received" value={totalApplications} />
      </div>

      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-lg font-600 text-pac-ink">Listings</h2>
        <Link
          href="/dashboard/employer/post"
          className="text-sm text-pac-orange hover:underline"
        >
          Post a job &rarr;
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="border border-dashed border-pac-line rounded-card py-16 px-6 text-center">
          <p className="font-display text-lg text-pac-ink mb-1">No listings yet</p>
          <p className="text-sm text-pac-muted mb-5">
            Post a role and it goes to PAC Africa for review before publishing.
          </p>
          <Link
            href="/dashboard/employer/post"
            className="inline-block bg-pac-orange text-white px-5 py-2.5 rounded-card text-sm font-medium hover:bg-pac-orange-dark transition-colors"
          >
            Post your first job
          </Link>
        </div>
      ) : (
        <ul className="border border-pac-line rounded-card divide-y divide-pac-line">
          {rows.map((job) => {
            const count = job.applications?.[0]?.count ?? 0;
            return (
              <li key={job.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/employer/jobs/${job.id}`}
                    className="text-sm font-medium text-pac-ink hover:text-pac-orange transition-colors truncate block"
                  >
                    {job.title}
                  </Link>
                  <p className="text-xs text-pac-muted mt-0.5">
                    {count} applicant{count === 1 ? "" : "s"} &middot; posted{" "}
                    {timeAgo(job.created_at)}
                  </p>
                </div>
                <JobStatusBadge status={job.status} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-pac-line rounded-card p-5">
      <p className="eyebrow mb-1">{label}</p>
      <p className="font-display text-3xl font-700 text-pac-ink">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { ApplicationStatusBadge } from "@/components/status-badge";
import { displayApplicant, timeAgo } from "@/lib/utils";
import { setJobStatus, setCompanyVerified } from "./actions";
import type { ApplicationStatus } from "@/types/database";

interface PendingJob {
  id: string;
  title: string;
  created_at: string;
  company: { id: string; name: string; verified: boolean } | null;
}

interface RecentApp {
  id: string;
  applicant_name: string | null;
  applicant_email: string;
  wp_job_title: string | null;
  status: ApplicationStatus;
  applied_at: string;
  job: { title: string } | null;
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const { supabase } = await requireProfile("admin");
  const params = await searchParams;

  const [jobs, applications, users, published, pendingJobs, recentApps] =
    await Promise.all([
      supabase.from("jobs").select("id", { count: "exact", head: true }),
      supabase.from("applications").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      supabase
        .from("jobs")
        .select("id, title, created_at, company:companies(id, name, verified)")
        .eq("status", "pending_review")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("applications")
        .select(
          "id, applicant_name, applicant_email, wp_job_title, status, applied_at, job:jobs(title)"
        )
        .order("applied_at", { ascending: false })
        .limit(15),
    ]);

  const queue = (pendingJobs.data ?? []) as unknown as PendingJob[];
  const recent = (recentApps.data ?? []) as unknown as RecentApp[];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <span className="eyebrow">PAC Africa &middot; Internal</span>
      <h1 className="font-display text-3xl font-700 text-pac-ink mt-2 mb-8">
        Admin dashboard
      </h1>

      {params.error && (
        <p className="mb-6 text-sm text-red-600 border border-red-200 bg-red-50 rounded-card px-4 py-3">
          {params.error}
        </p>
      )}
      {params.updated && !params.error && (
        <p className="mb-6 text-sm text-green-700 border border-green-200 bg-green-50 rounded-card px-4 py-3">
          {params.updated === "published"
            ? "Listing published — it is now live on /jobs."
            : params.updated === "verification"
              ? "Employer verification updated."
              : `Listing moved to ${params.updated.replace("_", " ")}.`}
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <StatCard label="Live roles" value={published.count ?? 0} />
        <StatCard label="Total jobs" value={jobs.count ?? 0} />
        <StatCard label="Applications" value={applications.count ?? 0} />
        <StatCard label="Registered users" value={users.count ?? 0} />
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* REVIEW QUEUE ------------------------------------------------- */}
        <section>
          <h2 className="font-display text-lg font-600 text-pac-ink mb-4">
            Pending approval ({queue.length})
          </h2>
          <div className="border border-pac-line rounded-card divide-y divide-pac-line">
            {queue.length === 0 ? (
              <p className="p-6 text-sm text-pac-muted">
                Nothing waiting for review.
              </p>
            ) : (
              queue.map((job) => (
                <div key={job.id} className="p-4">
                  <p className="text-sm font-medium text-pac-ink">{job.title}</p>
                  <p className="text-xs text-pac-muted mt-0.5 mb-3">
                    {job.company?.name ?? "No company"} &middot; submitted{" "}
                    {timeAgo(job.created_at)}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <form action={setJobStatus}>
                      <input type="hidden" name="job_id" value={job.id} />
                      <input type="hidden" name="status" value="published" />
                      <button
                        type="submit"
                        className="text-xs font-medium px-3 py-1.5 rounded-card bg-pac-orange text-white hover:bg-pac-orange-dark transition-colors"
                      >
                        Approve &amp; publish
                      </button>
                    </form>

                    <form action={setJobStatus}>
                      <input type="hidden" name="job_id" value={job.id} />
                      <input type="hidden" name="status" value="draft" />
                      <button
                        type="submit"
                        className="text-xs font-medium px-3 py-1.5 rounded-card border border-pac-line text-pac-muted hover:border-pac-ink hover:text-pac-ink transition-colors"
                      >
                        Send back to draft
                      </button>
                    </form>

                    {job.company && !job.company.verified && (
                      <form action={setCompanyVerified}>
                        <input
                          type="hidden"
                          name="company_id"
                          value={job.company.id}
                        />
                        <input type="hidden" name="verified" value="true" />
                        <button
                          type="submit"
                          className="text-xs font-medium px-3 py-1.5 rounded-card border border-pac-line text-pac-muted hover:border-pac-orange hover:text-pac-orange transition-colors"
                        >
                          Verify employer
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* RECENT APPLICATIONS ----------------------------------------- */}
        <section>
          <h2 className="font-display text-lg font-600 text-pac-ink mb-4">
            Recent applications
          </h2>
          <div className="border border-pac-line rounded-card divide-y divide-pac-line max-h-[480px] overflow-y-auto">
            {recent.length === 0 ? (
              <p className="p-6 text-sm text-pac-muted">No applications yet.</p>
            ) : (
              recent.map((app) => (
                <div key={app.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-pac-ink truncate">
                      {displayApplicant(app.applicant_name, app.applicant_email)}
                    </p>
                    <ApplicationStatusBadge status={app.status} />
                  </div>
                  <p className="text-xs text-pac-muted mt-0.5">
                    {app.job?.title ?? app.wp_job_title ?? "—"} &middot;{" "}
                    {timeAgo(app.applied_at)}
                  </p>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-pac-muted mt-3">
            Showing the 15 most recent of {(applications.count ?? 0).toLocaleString()}.{" "}
            <Link href="/jobs" className="text-pac-orange hover:underline">
              Browse the public site
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-pac-line rounded-card p-5">
      <p className="eyebrow mb-1">{label}</p>
      <p className="font-display text-3xl font-700 text-pac-ink">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

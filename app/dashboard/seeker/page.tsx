import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { ApplicationStatusBadge } from "@/components/status-badge";
import { timeAgo, displayApplicant } from "@/lib/utils";
import { isLegacyCvUrl } from "@/lib/cv";
import { completeness, profileChecklist } from "@/lib/profile";
import { claimApplications } from "./actions";
import type { ApplicationStatus } from "@/types/database";

interface Row {
  id: string;
  applicant_name: string | null;
  applicant_email: string;
  wp_job_title: string | null;
  status: ApplicationStatus;
  applied_at: string;
  job: { title: string; slug: string } | null;
}

export default async function SeekerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ claimed?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireProfile("seeker");
  const params = await searchParams;

  const [{ data: applications }, { data: claimable }] = await Promise.all([
    supabase
      .from("applications")
      .select(
        "id, applicant_name, applicant_email, wp_job_title, status, applied_at, job:jobs(title, slug)"
      )
      .order("applied_at", { ascending: false })
      .limit(200),
    supabase.rpc("count_claimable_applications"),
  ]);

  const rows = (applications ?? []) as unknown as Row[];
  const claimableCount = (claimable as number) ?? 0;

  // Checked without signing a URL: a legacy cv_url is not usable, anything else
  // non-null is. Cheap enough for a page that only needs the count.
  const hasUsableCv = Boolean(profile.cv_url) && !isLegacyCvUrl(profile.cv_url);
  const progress = completeness(profileChecklist(profile, hasUsableCv));

  return (
    <div>
      <span className="eyebrow">Your account</span>
      <h1 className="font-display text-3xl font-700 text-pac-ink mt-2 mb-8">
        {displayApplicant(profile.full_name, profile.email)}
      </h1>

      {params.error && (
        <p className="mb-6 text-sm text-red-600 border border-red-200 bg-red-50 rounded-card px-4 py-3">
          {params.error}
        </p>
      )}

      {params.claimed && Number(params.claimed) > 0 && (
        <p className="mb-6 text-sm text-green-700 border border-green-200 bg-green-50 rounded-card px-4 py-3">
          Added {params.claimed} earlier application
          {Number(params.claimed) === 1 ? "" : "s"} to your account.
        </p>
      )}

      {/* CLAIM HISTORICAL APPLICATIONS ---------------------------------
          The 4,355 migrated records have no applicant_id, so they are
          invisible under RLS until claimed. For someone who applied through
          PAC Africa years ago, this is the difference between an empty
          dashboard and their actual history. */}
      {claimableCount > 0 && (
        <div className="mb-8 rounded-card border border-pac-line bg-white p-6 shadow-stamp relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-pac-orange" />
          <p className="eyebrow mb-1">Archive match</p>
          <p className="font-display text-lg font-600 text-pac-ink">
            We found {claimableCount} earlier application
            {claimableCount === 1 ? "" : "s"} filed under {profile.email}
          </p>
          <p className="text-sm text-pac-muted mt-1 mb-4 max-w-lg">
            PAC Africa has been running this job board since 2014. These records
            came across from the old site — add them to your account to see them
            here.
          </p>
          <form action={claimApplications}>
            <button
              type="submit"
              className="bg-pac-orange text-white px-4 py-2 rounded-card text-sm font-medium hover:bg-pac-orange-dark transition-colors"
            >
              Add {claimableCount === 1 ? "it" : "them"} to my account
            </button>
          </form>
        </div>
      )}

      {/* An incomplete profile costs the applicant every time they apply, so it
          is worth surfacing here rather than only on the profile page. */}
      {progress.percent < 100 && (
        <div className="mb-8 rounded-card border border-pac-line bg-white p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-pac-ink">
              Your profile is {progress.percent}% complete
            </p>
            <p className="text-xs text-pac-muted mt-0.5">
              A fuller profile fills in your applications for you — and is what
              employers see first.
            </p>
          </div>
          <Link href="/dashboard/seeker/profile" className="btn-secondary shrink-0">
            Finish profile
          </Link>
        </div>
      )}

      <h2 className="font-display text-lg font-600 text-pac-ink mb-4">
        Applications ({rows.length})
      </h2>

      {rows.length === 0 ? (
        <div className="border border-dashed border-pac-line rounded-card py-16 px-6 text-center">
          <p className="font-display text-lg text-pac-ink mb-1">
            No applications yet
          </p>
          <p className="text-sm text-pac-muted mb-5">
            {claimableCount > 0
              ? "Add your earlier applications above, or browse what's open now."
              : "Once you apply for a role it will show up here with its status."}
          </p>
          <Link
            href="/jobs"
            className="text-sm font-medium text-pac-orange hover:underline"
          >
            Browse open roles &rarr;
          </Link>
        </div>
      ) : (
        <ul className="border border-pac-line rounded-card divide-y divide-pac-line">
          {rows.map((row) => {
            // job_id is NULL for every migrated row, so the title snapshot
            // preserved from WordPress is the only label available.
            const title = row.job?.title ?? row.wp_job_title ?? "Role no longer listed";
            return (
              <li key={row.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  {row.job ? (
                    <Link
                      href={`/jobs/${row.job.slug}`}
                      className="text-sm font-medium text-pac-ink hover:text-pac-orange transition-colors truncate block"
                    >
                      {title}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-pac-ink truncate">{title}</p>
                  )}
                  <p className="text-xs text-pac-muted mt-0.5">
                    Applied {timeAgo(row.applied_at)}
                  </p>
                </div>
                <ApplicationStatusBadge status={row.status} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

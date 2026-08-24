import Link from "next/link";
import { ArrowRight, Bookmark, CheckCircle2, Send, Sparkles } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { PageHead } from "@/components/dashboard-shell";
import { EmptyState, Flash, StatCard } from "@/components/dashboard-ui";
import { ApplicationStatusBadge } from "@/components/status-badge";
import { timeAgo, displayApplicant } from "@/lib/utils";
import { dash } from "@/lib/content";
import { claimApplications } from "./actions";
import type { ApplicationStatus } from "@/types/database";

/** Brief §8: "last 5 application status changes with timestamp". */
const ACTIVITY_LIMIT = 5;

interface EventRow {
  id: string;
  to_status: ApplicationStatus;
  created_at: string;
  application: {
    id: string;
    wp_job_title: string | null;
    job: { title: string; slug: string } | null;
  } | null;
}

export default async function SeekerOverview({
  searchParams,
}: {
  searchParams: Promise<{ claimed?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireProfile("seeker");
  const params = await searchParams;

  const [sent, shortlisted, saved, { data: claimable }, { data: events }] =
    await Promise.all([
      supabase.from("applications").select("id", { count: "exact", head: true }),
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .in("status", ["shortlisted", "hired"]),
      supabase.from("saved_jobs").select("id", { count: "exact", head: true }),
      supabase.rpc("count_claimable_applications"),
      // The activity feed reads the log written by migration 017's trigger
      // rather than the applications table, so it shows what changed and when
      // rather than only the current state. RLS on application_events delegates
      // to applications, so this is already scoped to this applicant.
      supabase
        .from("application_events")
        .select(
          "id, to_status, created_at, application:applications(id, wp_job_title, job:jobs(title, slug))"
        )
        .order("created_at", { ascending: false })
        .limit(ACTIVITY_LIMIT),
    ]);

  const claimableCount = (claimable as number) ?? 0;
  const feed = (events ?? []) as unknown as EventRow[];

  return (
    <div>
      <PageHead
        eyebrow={dash.common.overview}
        title={dash.seeker.greeting(displayApplicant(profile.full_name, profile.email))}
        action={
          <Link href="/jobs" className="btn-primary group">
            {dash.seeker.findRoles}
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
        }
      />

      <Flash
        error={params.error}
        success={
          params.claimed && Number(params.claimed) > 0
            ? `Added ${params.claimed} earlier application${
                Number(params.claimed) === 1 ? "" : "s"
              } to your account.`
            : null
        }
      />

      {/* CLAIM HISTORICAL APPLICATIONS ---------------------------------
          The migrated records have no applicant_id, so they are invisible under
          RLS until claimed. For someone who applied through PAC Africa years
          ago, this is the difference between an empty dashboard and their
          actual history. */}
      {claimableCount > 0 && (
        <div className="clay relative mb-8 overflow-hidden p-6">
          <div aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-accent" />
          <p className="eyebrow">Archive match</p>
          <p className="mt-1 font-display text-lg font-600 text-ink">
            We found {claimableCount} earlier application
            {claimableCount === 1 ? "" : "s"} filed under {profile.email}
          </p>
          <p className="mb-4 mt-1 max-w-lg text-sm leading-relaxed text-muted">
            PAC Africa has been running this job board for over a decade. These records
            came across from the old site — add them to your account to see them here.
          </p>
          <form action={claimApplications}>
            <button type="submit" className="btn-accent">
              Add {claimableCount === 1 ? "it" : "them"} to my account
            </button>
          </form>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={dash.seeker.statApplications}
          value={sent.count ?? 0}
          hint={dash.seeker.statHint}
          icon={Send}
          href="/dashboard/seeker/applications"
        />
        <StatCard
          label={dash.seeker.statShortlisted}
          value={shortlisted.count ?? 0}
          hint={dash.seeker.shortlistedHint}
          icon={CheckCircle2}
          href="/dashboard/seeker/applications?status=shortlisted"
        />
        <StatCard
          label={dash.seeker.statSaved}
          value={saved.count ?? 0}
          icon={Bookmark}
          href="/dashboard/seeker/saved"
        />
      </div>

      {/* ACTIVITY ------------------------------------------------------- */}
      <div className="mb-4 mt-10 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-lg font-600 text-ink">{dash.common.activity}</h2>
        <Link
          href="/dashboard/seeker/applications"
          className="text-sm text-accent-text transition-opacity duration-150 hover:opacity-70"
        >
          {dash.common.viewAll}
        </Link>
      </div>

      {feed.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={dash.seeker.emptyApplications}
          body={dash.seeker.emptyApplicationsBody}
          action={
            <Link href="/jobs" className="btn-primary">
              Browse roles
            </Link>
          }
        />
      ) : (
        <ol className="clay divide-y divide-line">
          {feed.map((event) => {
            const title =
              event.application?.job?.title ??
              event.application?.wp_job_title ??
              dash.drawer.roleNotRecorded;
            return (
              <li key={event.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">
                    {dash.seeker.event[event.to_status]}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {event.application?.job ? (
                      <Link
                        href={`/jobs/${event.application.job.slug}`}
                        className="hover:text-accent-text"
                      >
                        {title}
                      </Link>
                    ) : (
                      title
                    )}
                    {" · "}
                    {timeAgo(event.created_at)}
                  </p>
                </div>
                <ApplicationStatusBadge status={event.to_status} />
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

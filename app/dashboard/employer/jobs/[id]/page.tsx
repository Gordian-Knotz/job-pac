import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { ApplicationStatusBadge, JobStatusBadge } from "@/components/status-badge";
import { displayApplicant, timeAgo } from "@/lib/utils";
import { isLegacyCvUrl, signedCvUrl } from "@/lib/supabase/storage";
import { setApplicationStatus } from "../../actions";
import type { ApplicationStatus, JobStatus } from "@/types/database";

interface AppRow {
  id: string;
  applicant_name: string | null;
  applicant_email: string;
  applicant_phone: string | null;
  cover_letter: string | null;
  cv_url: string | null;
  status: ApplicationStatus;
  employer_note: string | null;
  applied_at: string;
}

const ACTIONS: { status: ApplicationStatus; label: string }[] = [
  { status: "shortlisted", label: "Shortlist" },
  { status: "hired", label: "Hired" },
  { status: "rejected", label: "Reject" },
  { status: "pending", label: "Reset" },
];

export default async function JobApplicantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const { supabase } = await requireProfile("employer");
  const { id } = await params;
  const query = await searchParams;

  // RLS limits this to jobs the employer owns, so a foreign id returns nothing
  // and becomes a 404 rather than leaking that the job exists.
  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, slug, status")
    .eq("id", id)
    .single();

  if (!job) notFound();

  const { data: applications } = await supabase
    .from("applications")
    .select(
      "id, applicant_name, applicant_email, applicant_phone, cover_letter, cv_url, status, employer_note, applied_at"
    )
    .eq("job_id", id)
    .order("applied_at", { ascending: false });

  const rows = (applications ?? []) as AppRow[];

  // Signed URLs are minted per render and expire in 5 minutes, so a CV link
  // cannot be forwarded to someone who should not have it.
  const cvLinks = await Promise.all(
    rows.map((row) => signedCvUrl(supabase, row.cv_url))
  );

  return (
    <div>
      <Link
        href="/dashboard/employer"
        className="text-sm text-pac-muted hover:text-pac-orange transition-colors"
      >
        &larr; All listings
      </Link>

      <div className="flex items-center gap-3 mt-4 mb-1">
        <h1 className="font-display text-3xl font-700 text-pac-ink">{job.title}</h1>
        <JobStatusBadge status={job.status as JobStatus} />
      </div>
      <p className="text-sm text-pac-muted mb-8">
        {rows.length} applicant{rows.length === 1 ? "" : "s"}
        {job.status === "published" && (
          <>
            {" "}
            &middot;{" "}
            <Link href={`/jobs/${job.slug}`} className="text-pac-orange hover:underline">
              View public listing
            </Link>
          </>
        )}
      </p>

      {query.error && (
        <p className="mb-6 text-sm text-red-600 border border-red-200 bg-red-50 rounded-card px-4 py-3">
          {query.error}
        </p>
      )}
      {query.updated && !query.error && (
        <p className="mb-6 text-sm text-green-700 border border-green-200 bg-green-50 rounded-card px-4 py-3">
          Applicant updated.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="border border-dashed border-pac-line rounded-card py-16 px-6 text-center">
          <p className="font-display text-lg text-pac-ink mb-1">No applicants yet</p>
          <p className="text-sm text-pac-muted">
            {job.status === "published"
              ? "This listing is live — applications will appear here."
              : "This listing is not published yet, so nobody can apply to it."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((row, i) => (
            <li
              key={row.id}
              className="rounded-card border border-pac-line bg-white p-5 shadow-stamp"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display text-base font-600 text-pac-ink">
                    {displayApplicant(row.applicant_name, row.applicant_email)}
                  </p>
                  <p className="text-xs text-pac-muted mt-0.5">
                    <a
                      href={`mailto:${row.applicant_email}`}
                      className="hover:text-pac-orange"
                    >
                      {row.applicant_email}
                    </a>
                    {row.applicant_phone && <> &middot; {row.applicant_phone}</>}
                    {" "}&middot; applied {timeAgo(row.applied_at)}
                  </p>
                </div>
                <ApplicationStatusBadge status={row.status} />
              </div>

              {row.cover_letter && (
                <p className="text-sm text-pac-ink/90 mt-3 leading-relaxed whitespace-pre-line">
                  {row.cover_letter}
                </p>
              )}

              <p className="text-xs mt-3">
                {cvLinks[i] ? (
                  <a
                    href={cvLinks[i]!}
                    target="_blank"
                    rel="noreferrer"
                    className="text-pac-orange hover:underline font-medium"
                  >
                    Open CV
                  </a>
                ) : isLegacyCvUrl(row.cv_url) ? (
                  <span className="text-pac-muted">
                    CV archived on the previous site — no longer retrievable
                  </span>
                ) : (
                  <span className="text-pac-muted">No CV attached</span>
                )}
              </p>

              <form
                action={setApplicationStatus}
                className="mt-4 pt-4 border-t border-pac-line"
              >
                <input type="hidden" name="application_id" value={row.id} />
                <input type="hidden" name="job_id" value={job.id} />
                <input
                  name="employer_note"
                  defaultValue={row.employer_note ?? ""}
                  placeholder="Internal note (not shown to the applicant)"
                  className="w-full px-3 py-2 rounded-card border border-pac-line text-sm focus:border-pac-orange outline-none mb-3"
                />
                <div className="flex flex-wrap gap-2">
                  {ACTIONS.filter((a) => a.status !== row.status).map((action) => (
                    <button
                      key={action.status}
                      type="submit"
                      name="status"
                      value={action.status}
                      className="text-xs font-medium px-3 py-1.5 rounded-card border border-pac-line text-pac-ink hover:border-pac-orange hover:text-pac-orange transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

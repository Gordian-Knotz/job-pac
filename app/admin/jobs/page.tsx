import Link from "next/link";
import { Plus, ExternalLink } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { JobStatusBadge } from "@/components/status-badge";
import { timeAgo } from "@/lib/utils";
import { setJobStatus, deleteJob } from "../actions";
import type { JobStatus } from "@/types/database";

interface Row {
  id: string;
  title: string;
  slug: string;
  status: JobStatus;
  created_at: string;
  is_featured: boolean;
  company: { name: string; verified: boolean } | null;
  applications: { count: number }[];
}

const TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Live" },
  { value: "pending_review", label: "In review" },
  { value: "draft", label: "Drafts" },
  { value: "closed", label: "Closed" },
];

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    created?: string;
    updated?: string;
    deleted?: string;
    lost?: string;
    error?: string;
  }>;
}) {
  const { supabase } = await requireProfile("admin");
  const params = await searchParams;
  const tab = params.status ?? "all";

  let query = supabase
    .from("jobs")
    .select(
      "id, title, slug, status, created_at, is_featured, company:companies(name, verified), applications(count)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (tab !== "all") query = query.eq("status", tab as JobStatus);

  const { data, count } = await query.limit(200);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="eyebrow">PAC Africa &middot; Internal</span>
          <h1 className="font-display text-3xl font-700 text-pac-ink mt-2">
            Listings
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin" className="btn-secondary">
            Dashboard
          </Link>
          <Link href="/admin/jobs/new" className="btn-primary">
            <Plus className="w-4 h-4" aria-hidden />
            Post a job
          </Link>
        </div>
      </div>

      {params.error && (
        <p className="mt-6 text-sm text-red-600 border border-red-200 bg-red-50 rounded-card px-4 py-3">
          {params.error}
        </p>
      )}
      {params.created && (
        <p className="mt-6 text-sm text-green-700 border border-green-200 bg-green-50 rounded-card px-4 py-3">
          {params.created === "published"
            ? "Listing is live on the site."
            : `Listing saved as ${params.created.replace("_", " ")}.`}
        </p>
      )}
      {params.updated && !params.error && (
        <p className="mt-6 text-sm text-green-700 border border-green-200 bg-green-50 rounded-card px-4 py-3">
          Listing moved to {params.updated.replace("_", " ")}.
        </p>
      )}
      {params.deleted && !params.error && (
        <p className="mt-6 text-sm text-pac-ink border border-pac-line bg-pac-stone rounded-card px-4 py-3">
          Deleted &ldquo;{params.deleted}&rdquo;
          {Number(params.lost) > 0 && (
            <>
              {" "}
              and {params.lost} application
              {Number(params.lost) === 1 ? "" : "s"} attached to it
            </>
          )}
          .
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-6 mb-4">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={t.value === "all" ? "/admin/jobs" : `/admin/jobs?status=${t.value}`}
            className={`chip ${tab === t.value ? "chip-active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
        <span className="text-xs text-pac-muted ml-auto">
          {(count ?? 0).toLocaleString()} listing{count === 1 ? "" : "s"}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="border border-dashed border-pac-line rounded-card py-16 px-6 text-center">
          <p className="font-display text-lg text-pac-ink mb-1">
            {tab === "all" ? "No listings yet" : "Nothing in this state"}
          </p>
          <p className="text-sm text-pac-muted mb-5">
            {tab === "all"
              ? "Post the first role and it goes live immediately."
              : "Try another tab."}
          </p>
          {tab === "all" && (
            <Link href="/admin/jobs/new" className="btn-primary">
              Post a job
            </Link>
          )}
        </div>
      ) : (
        <ul className="border border-pac-line rounded-card divide-y divide-pac-line bg-white">
          {rows.map((job) => {
            const applicants = job.applications?.[0]?.count ?? 0;
            return (
              <li key={job.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/jobs/${job.id}/edit`}
                        className="text-sm font-medium text-pac-ink hover:text-pac-orange-dark transition-colors truncate"
                      >
                        {job.title}
                      </Link>
                      {job.is_featured && <span className="eyebrow">featured</span>}
                    </div>
                    <p className="text-xs text-pac-muted mt-0.5">
                      {job.company?.name ?? "Confidential employer"}
                      {job.company?.verified && " · verified"} &middot; {applicants}{" "}
                      applicant{applicants === 1 ? "" : "s"} &middot; {timeAgo(job.created_at)}
                    </p>
                  </div>
                  <JobStatusBadge status={job.status} />
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {job.status !== "published" ? (
                    <StatusButton
                      jobId={job.id}
                      status="published"
                      label="Publish"
                      primary
                    />
                  ) : (
                    <>
                      <Link
                        href={`/jobs/${job.slug}`}
                        className="btn-secondary px-3 py-1.5 text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                        View live
                      </Link>
                      <StatusButton jobId={job.id} status="closed" label="Close" />
                    </>
                  )}
                  <Link
                    href={`/admin/jobs/${job.id}/edit`}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    Edit
                  </Link>

                  {/* Nothing to lose, so delete straight from the list. With
                      applicants it goes to the confirmation instead — deleting
                      cascades to their applications. */}
                  {applicants === 0 ? (
                    <form action={deleteJob}>
                      <input type="hidden" name="job_id" value={job.id} />
                      <button
                        type="submit"
                        className="btn press px-3 py-1.5 text-xs border border-pac-line text-pac-muted transition-[transform,color,border-color] duration-150 ease-out hover:border-red-300 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </form>
                  ) : (
                    <Link
                      href={`/admin/jobs/${job.id}/edit`}
                      className="btn press px-3 py-1.5 text-xs border border-pac-line text-pac-muted transition-[transform,color,border-color] duration-150 ease-out hover:border-red-300 hover:text-red-700"
                    >
                      Delete…
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusButton({
  jobId,
  status,
  label,
  primary,
}: {
  jobId: string;
  status: JobStatus;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={setJobStatus}>
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="return_to" value="/admin/jobs" />
      <button
        type="submit"
        className={
          primary ? "btn-primary px-3 py-1.5 text-xs" : "btn-secondary px-3 py-1.5 text-xs"
        }
      >
        {label}
      </button>
    </form>
  );
}

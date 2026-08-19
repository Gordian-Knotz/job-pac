import Link from "next/link";
import { MapPin, Clock, BadgeCheck } from "lucide-react";
import { formatSalary, JOB_TYPE_LABELS, timeAgo } from "@/lib/utils";
import type { Job } from "@/types/database";

/**
 * Grid card, used on the homepage. The results list uses JobResult instead,
 * where the same left-edge stamp carries selection state.
 */
export function JobCard({ job }: { job: Job }) {
  return (
    <Link
      href={`/jobs/${job.slug}`}
      className="group press relative block rounded-card border border-pac-line bg-white
                 shadow-stamp overflow-hidden
                 transition-[transform,border-color] duration-150 ease-out
                 hover:border-pac-orange"
    >
      {/* The vetting stamp — a checked document rather than a SaaS card. */}
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[3px] bg-pac-line
                   transition-colors duration-150 ease-out group-hover:bg-pac-orange"
      />

      <div className="px-6 py-5 pl-7">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="eyebrow truncate">{job.category?.name ?? "General"}</span>
              {job.company?.verified && (
                <BadgeCheck
                  className="w-3.5 h-3.5 shrink-0 text-pac-orange-dark"
                  strokeWidth={2.5}
                  aria-label="Verified employer"
                />
              )}
            </div>
            <h3
              className="font-display text-lg font-600 text-pac-ink truncate tracking-tight
                         transition-colors duration-150 ease-out group-hover:text-pac-orange-dark"
            >
              {job.title}
            </h3>
            <p className="text-sm text-pac-muted mt-0.5 truncate">
              {job.company?.name ?? "Confidential employer"}
            </p>
          </div>

          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-pac-line text-pac-muted">
            {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
          </span>
        </div>

        {(job.salary_min || job.salary_max) && (
          <p className="text-sm font-medium text-pac-ink mt-3">
            {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
          </p>
        )}

        <div className="flex items-center gap-4 mt-3 text-xs text-pac-muted">
          <span className="flex items-center gap-1 min-w-0">
            <MapPin className="w-3.5 h-3.5 shrink-0" strokeWidth={2} aria-hidden />
            <span className="truncate">
              {job.is_remote
                ? "Remote"
                : (job.location?.name ?? job.location_text ?? "Kenya")}
            </span>
          </span>
          <span className="flex items-center gap-1 shrink-0">
            <Clock className="w-3.5 h-3.5" strokeWidth={2} aria-hidden />
            {timeAgo(job.original_date ?? job.created_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}

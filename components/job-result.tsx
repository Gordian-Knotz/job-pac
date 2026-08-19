import Link from "next/link";
import { MapPin, BadgeCheck } from "lucide-react";
import { formatSalary, JOB_TYPE_LABELS, plainSnippet, timeAgo } from "@/lib/utils";
import type { Job } from "@/types/database";

/**
 * A row in the results list of the two-pane search.
 *
 * THE SIGNATURE ELEMENT. The 3px left edge started life as a "vetting stamp" —
 * decoration that turned orange on hover. Here it earns its keep: in a list
 * where one row is open in the detail pane, the bar is the selected-state
 * indicator. Same mark, now carrying information instead of just flavour.
 *
 * It is deliberately not the *only* selection signal — colour alone would fail
 * for anyone who cannot distinguish it, so the row also gets a tinted surface
 * and aria-current.
 */
export function JobResult({
  job,
  selected,
  href,
}: {
  job: Job;
  selected: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={selected ? "true" : undefined}
      className={`group relative block border-b border-pac-line pl-5 pr-4 py-4
                  transition-colors duration-150 ease-out
                  ${selected ? "bg-pac-orange-tint/60" : "bg-transparent"}`}
    >
      <span
        aria-hidden
        className={`absolute left-0 top-0 bottom-0 w-[3px] transition-colors duration-150 ease-out
                    ${selected ? "bg-pac-orange" : "bg-pac-line group-hover:bg-pac-orange/45"}`}
      />

      <div className="flex items-start justify-between gap-3">
        <h3
          className={`font-display text-[17px] font-600 leading-snug tracking-tight
                      transition-colors duration-150 ease-out
                      ${selected ? "text-pac-orange-dark" : "text-pac-ink group-hover:text-pac-orange-dark"}`}
        >
          {job.title}
        </h3>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-pac-line text-pac-muted">
          {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
        </span>
      </div>

      <p className="flex items-center gap-1.5 text-sm text-pac-muted mt-1">
        <span className="truncate">{job.company?.name ?? "Confidential employer"}</span>
        {job.company?.verified && (
          <BadgeCheck
            className="w-3.5 h-3.5 shrink-0 text-pac-orange-dark"
            strokeWidth={2.5}
            aria-label="Verified employer"
          />
        )}
      </p>

      <p className="flex items-center gap-1.5 text-sm text-pac-muted mt-1">
        <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden />
        {job.is_remote ? "Remote" : (job.location?.name ?? job.location_text ?? "Kenya")}
      </p>

      {(job.salary_min || job.salary_max) && (
        <p className="text-sm font-medium text-pac-ink mt-1.5">
          {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
        </p>
      )}

      {/* Density is the point of this layout — a snippet is what lets someone
          rule a role out without opening it. */}
      <p className="text-[13px] text-pac-muted leading-relaxed mt-2 line-clamp-2">
        {plainSnippet(job.description)}
      </p>

      <p className="text-xs text-pac-faint mt-2">
        {timeAgo(job.original_date ?? job.created_at)}
      </p>
    </Link>
  );
}

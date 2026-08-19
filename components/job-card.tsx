import Link from "next/link";
import { MapPin, Clock, BadgeCheck } from "lucide-react";
import { Job } from "@/types/database";
import { JOB_TYPE_LABELS, timeAgo } from "@/lib/utils";

export function JobCard({ job }: { job: Job }) {
  return (
    <Link
      href={`/jobs/${job.slug}`}
      className="group block rounded-card border border-pac-line bg-white hover:border-pac-orange transition-colors shadow-stamp relative overflow-hidden"
    >
      {/* stamp perforation edge — signature element */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] bg-pac-line group-hover:bg-pac-orange transition-colors"
        aria-hidden
      />

      <div className="px-6 py-5 pl-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="eyebrow">
                {job.category?.name ?? "General"}
              </span>
              {job.company?.verified && (
                <BadgeCheck className="w-3.5 h-3.5 text-pac-orange" strokeWidth={2.5} />
              )}
            </div>
            <h3 className="font-display text-lg font-600 text-pac-ink group-hover:text-pac-orange transition-colors truncate">
              {job.title}
            </h3>
            <p className="text-sm text-pac-muted mt-0.5">
              {job.company?.name ?? "Confidential Employer"}
            </p>
          </div>

          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-pac-line text-pac-muted">
            {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
          </span>
        </div>

        <div className="flex items-center gap-4 mt-4 text-xs text-pac-muted">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" strokeWidth={2} />
            {job.location?.name ?? job.location_text ?? "Nairobi"}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" strokeWidth={2} />
            {timeAgo(job.created_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}

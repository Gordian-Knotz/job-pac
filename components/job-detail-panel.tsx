import { Bookmark } from "lucide-react";
import { JobDetail } from "@/components/job-detail";
import { ApplyForm, type ApplyViewer } from "@/components/apply-form";
import { toggleSavedJob } from "@/app/actions/saved-jobs";
import type { Job } from "@/types/database";

/**
 * Server-rendered — kept out of jobs-split-view.tsx (a client component)
 * because JobDetail pulls in lib/sanitize.ts, which is "server-only" and
 * cannot be bundled into client JS. app/jobs/page.tsx renders one of these
 * per job and hands the finished nodes down as a prop.
 */
export function JobDetailPanel({
  job,
  saved,
  matchPercent,
  appliedAt,
  viewer,
  returnTo,
}: {
  job: Job;
  saved: boolean;
  matchPercent: number | null;
  appliedAt: string | null;
  viewer: ApplyViewer | null;
  returnTo: string;
}) {
  return (
    <div className="clay lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto p-6 md:p-8">
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <form action={toggleSavedJob}>
          <input type="hidden" name="job_id" value={job.id} />
          <input type="hidden" name="return_to" value={returnTo} />
          <button
            type="submit"
            aria-label={saved ? "Unsave" : "Save"}
            title={saved ? "Unsave" : "Save"}
            className={`press grid h-9 w-9 shrink-0 place-items-center rounded-pill transition-colors duration-200 ease-out hover:bg-surface-raised ${
              saved ? "text-accent-text" : "text-muted"
            }`}
          >
            <Bookmark
              className="h-4 w-4"
              strokeWidth={2}
              fill={saved ? "currentColor" : "none"}
              aria-hidden
            />
          </button>
        </form>

        {matchPercent !== null && (
          <span className="clay-raised shrink-0 rounded-pill px-2.5 py-1 font-mono text-xs font-500 text-accent-text">
            {matchPercent}% match
          </span>
        )}

        <a href="#apply-panel" className="btn-accent ml-auto shrink-0 px-6">
          Apply now
        </a>
      </div>

      <JobDetail
        job={job}
        headingLevel="h2"
        apply={
          <div id="apply-panel" className="clay-inset p-5">
            <ApplyForm
              slug={job.slug}
              jobTitle={job.title}
              viewer={viewer}
              appliedAt={appliedAt}
            />
          </div>
        }
      />
    </div>
  );
}

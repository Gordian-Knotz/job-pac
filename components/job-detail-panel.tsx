import { JobDetail } from "@/components/job-detail";
import { ApplyPanel } from "@/components/apply-panel";
import { SaveToggle } from "@/components/save-toggle";
import { MatchBadge } from "@/components/match-badge";
import { job as jobCopy } from "@/lib/content";
import type { Job } from "@/types/database";

/**
 * Split view's right pane — one job's full detail, server-rendered because
 * JobDetail pulls in lib/sanitize.ts ("server-only") and can't be bundled
 * into a client component. app/jobs/page.tsx renders one of these per job
 * on the page and hands the finished nodes down to the client-side
 * JobsSplitView as a prop; only the save button, match badge and apply form
 * inside it are client components (each resolves viewer state itself, same
 * as everywhere else on this route — see components/apply-panel.tsx).
 */
export function JobDetailPanel({ job, returnTo }: { job: Job; returnTo: string }) {
  return (
    <div className="clay p-6 md:p-8 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto">
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <SaveToggle jobId={job.id} returnTo={returnTo} />
        <MatchBadge requiredSkills={job.required_skills} />
        <a href="#apply-panel" className="btn-accent ml-auto shrink-0 px-6">
          {jobCopy.apply}
        </a>
      </div>

      <JobDetail
        job={job}
        headingLevel="h2"
        apply={
          <div id="apply-panel" className="clay-inset p-5">
            <h2 className="font-display text-lg font-600 text-ink">{jobCopy.apply}</h2>
            <ApplyPanel jobId={job.id} slug={job.slug} jobTitle={job.title} />
          </div>
        }
      />
    </div>
  );
}

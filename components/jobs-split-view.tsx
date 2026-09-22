"use client";

import { useState } from "react";
import { JobCard } from "@/components/job-card";
import { useViewer } from "@/lib/use-viewer";
import { matchPercent } from "@/lib/match";
import type { Job } from "@/types/database";

/**
 * Desktop two-pane browsing: click a card, the right pane swaps in place —
 * no navigation, no new fetch, everything here came from app/jobs/page.tsx's
 * one server-side query. Mobile renders none of this (see app/jobs/page.tsx);
 * it keeps the plain card-links-to-/jobs/[slug] behavior unchanged.
 *
 * detailPanels arrives pre-rendered (job id -> JSX) from the server, because
 * the panel content pulls in lib/sanitize.ts ("server-only") via JobDetail —
 * that can't be bundled into this client component directly. Save state and
 * match percent are resolved here via useViewer, same as ResultsGrid/RelatedJobs,
 * rather than passed down as props — the search itself stays on the anon-key
 * client so it can be cached (see app/jobs/page.tsx).
 */
export function JobsSplitView({
  jobs,
  returnTo,
  detailPanels,
}: {
  jobs: Job[];
  returnTo: string;
  detailPanels: Record<string, React.ReactNode>;
}) {
  const [selectedId, setSelectedId] = useState(jobs[0]?.id ?? null);
  const { data } = useViewer();
  const savedIds = new Set(data.savedJobIds);
  const selected = jobs.find((j) => j.id === selectedId) ?? jobs[0] ?? null;

  if (!selected) return null;

  return (
    <div className="hidden gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-4">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            variant="compact"
            active={job.id === selected.id}
            onSelect={() => setSelectedId(job.id)}
            saved={savedIds.has(job.id)}
            showSave={data.signedIn}
            returnTo={returnTo}
            matchPercent={matchPercent(job.required_skills, data.skills)}
          />
        ))}
      </div>

      <div key={selected.id}>{detailPanels[selected.id]}</div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { JobCard } from "@/components/job-card";
import { ViewCountTracker } from "@/components/view-count-tracker";
import type { Job } from "@/types/database";

/**
 * Desktop two-pane browsing: click a card, the right pane swaps in place —
 * no navigation, no new fetch, everything here came from app/jobs/page.tsx's
 * one server-side query. Mobile renders none of this (see app/jobs/page.tsx);
 * it keeps the plain card-links-to-/jobs/[slug] behavior unchanged.
 *
 * detailPanels arrives pre-rendered (job id -> JSX) from the server, because
 * the panel content pulls in lib/sanitize.ts ("server-only") via JobDetail —
 * that can't be bundled into this client component directly.
 */
export function JobsSplitView({
  jobs,
  savedIds,
  matchPercents,
  returnTo,
  detailPanels,
  showSave,
}: {
  jobs: Job[];
  savedIds: Set<string>;
  matchPercents: Map<string, number | null>;
  returnTo: string;
  detailPanels: Record<string, React.ReactNode>;
  showSave: boolean;
}) {
  const [selectedId, setSelectedId] = useState(jobs[0]?.id ?? null);
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
            showSave={showSave}
            returnTo={returnTo}
            matchPercent={matchPercents.get(job.id) ?? null}
          />
        ))}
      </div>

      <div key={selected.id}>
        <ViewCountTracker jobId={selected.id} />
        {detailPanels[selected.id]}
      </div>
    </div>
  );
}

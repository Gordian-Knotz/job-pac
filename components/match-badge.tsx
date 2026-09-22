"use client";

import { useViewer } from "@/lib/use-viewer";
import { matchPercent } from "@/lib/match";

/** Split-view detail pane's skill-match pill — same lib/match.ts scoring JobCard uses. */
export function MatchBadge({ requiredSkills }: { requiredSkills: string[] | null }) {
  const { data } = useViewer();
  const pct = matchPercent(requiredSkills, data.skills);
  if (pct === null) return null;

  return (
    <span className="clay-raised shrink-0 rounded-pill px-2.5 py-1 font-mono text-xs font-500 text-accent-text">
      {pct}% match
    </span>
  );
}

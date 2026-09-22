"use client";

import { Bookmark } from "lucide-react";
import { toggleSavedJob } from "@/app/actions/saved-jobs";
import { useViewer } from "@/lib/use-viewer";

/**
 * Standalone save/bookmark button for the split-view detail pane — the
 * pane isn't wrapped by JobCard, which carries its own version of this same
 * button, so it needs its own client-side viewer lookup. Renders nothing
 * until signed in, same as JobCard's showSave gate.
 */
export function SaveToggle({ jobId, returnTo }: { jobId: string; returnTo: string }) {
  const { data } = useViewer();
  if (!data.signedIn) return null;
  const saved = data.savedJobIds.includes(jobId);

  return (
    <form action={toggleSavedJob}>
      <input type="hidden" name="job_id" value={jobId} />
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
  );
}

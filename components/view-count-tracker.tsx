"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Fires increment_job_view once per selected job, mirroring a click on
 * /jobs/[slug] — the client-side stand-in for that page's server-side
 * recordView(), which no longer runs since selecting a job here never
 * navigates there. Split out of the (server-rendered) detail panel so this
 * is the only client-side piece touching that job's view count.
 */
export function ViewCountTracker({ jobId }: { jobId: string }) {
  const counted = useRef<string | null>(null);

  useEffect(() => {
    if (counted.current === jobId) return;
    counted.current = jobId;
    createClient()
      .rpc("increment_job_view", { job: jobId })
      .then(() => {});
  }, [jobId]);

  return null;
}

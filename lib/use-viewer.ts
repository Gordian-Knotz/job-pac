"use client";

import { useEffect, useState } from "react";
import type { ViewerResponse } from "@/app/api/viewer/route";

const SIGNED_OUT: ViewerResponse = {
  signedIn: false,
  role: null,
  savedJobIds: [],
  skills: null,
  viewer: null,
  appliedAt: null,
};

/**
 * Fetches `/api/viewer` once on mount. Every page using this renders the
 * signed-out shape first (matching the server-rendered fallback exactly, so
 * there's no layout shift) and swaps in the real viewer state once it
 * resolves — see `app/api/viewer/route.ts` for why this moved off the page's
 * server render.
 */
export function useViewer(jobId?: string): { data: ViewerResponse; loading: boolean } {
  const [data, setData] = useState<ViewerResponse>(SIGNED_OUT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const qs = jobId ? `?jobId=${encodeURIComponent(jobId)}` : "";
    fetch(`/api/viewer${qs}`)
      .then((r) => (r.ok ? (r.json() as Promise<ViewerResponse>) : SIGNED_OUT))
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {
        // Stay on the signed-out default.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [jobId]);

  return { data, loading };
}

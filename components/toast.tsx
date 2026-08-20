"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

/**
 * Transient confirmation (brief §9: "updates inline with a toast confirmation").
 *
 * Driven by a search param the server action redirects to, so the message is
 * produced by the thing that actually succeeded rather than by optimistic client
 * state — if the update failed, no toast appears.
 *
 * It enters and exits along the same path, so the dismissal reads as a reversal
 * of the arrival. `role="status"` rather than `alert`: this is a confirmation,
 * and interrupting a screen reader mid-sentence to say "saved" is rude.
 */
export function Toast({
  message,
  duration = 3200,
}: {
  message: string | null | undefined;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(Boolean(message));

  useEffect(() => {
    setShown(Boolean(message));
    if (!message) return;
    const timer = window.setTimeout(() => setShown(false), duration);
    return () => window.clearTimeout(timer);
  }, [message, duration]);

  return (
    <AnimatePresence>
      {shown && message && (
        <motion.div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 lg:bottom-8"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
          transition={
            reduced ? { duration: 0.2 } : { type: "spring", bounce: 0, duration: 0.35 }
          }
        >
          <div className="clay flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink">
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

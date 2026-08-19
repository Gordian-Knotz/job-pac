import { FileText, ExternalLink } from "lucide-react";
import type { CvLink as CvLinkValue } from "@/lib/supabase/storage";

/**
 * One rendering of a CV link, used by the admin browser, the employer applicant
 * view and the seeker profile.
 *
 * A legacy link is deliberately shown as working, because it is: the migrated
 * URLs point at the old WordPress uploads tree, which survived the wipe and
 * still serves. It is labelled as coming from the old site so nobody mistakes
 * it for something we host — that distinction matters, since the archive is
 * only reachable for as long as that server stays up.
 */
export function CvLink({
  value,
  compact = false,
}: {
  value: CvLinkValue;
  compact?: boolean;
}) {
  if (value.kind === "none") {
    return <span className="text-xs text-pac-faint">No CV attached</span>;
  }

  const isLegacy = value.kind === "legacy";

  return (
    <a
      href={value.href}
      target="_blank"
      rel="noreferrer noopener"
      title={
        isLegacy
          ? "Served from the previous WordPress site. Pending migration into our own storage."
          : "Private link, expires in 5 minutes"
      }
      className="inline-flex items-center gap-1.5 text-xs font-medium text-pac-orange-dark hover:underline"
    >
      {isLegacy ? (
        <ExternalLink className="w-3.5 h-3.5" aria-hidden />
      ) : (
        <FileText className="w-3.5 h-3.5" aria-hidden />
      )}
      Open CV
      {!compact && (
        <span className="font-normal text-pac-muted">
          {isLegacy ? "— on the old site" : "— expires in 5 min"}
        </span>
      )}
    </a>
  );
}

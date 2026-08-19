import { FileText, Clock } from "lucide-react";
import type { CvLink as CvLinkValue } from "@/lib/supabase/storage";

/**
 * One rendering of a CV link, used by the admin browser, the employer applicant
 * view and the seeker profile.
 *
 * A "legacy" cv_url points at https://jobs.pac.africa/wp-content/uploads/... —
 * and that is now unreachable, because the domain was cut over to Vercel, so
 * those paths hit the Next.js app instead of the old WordPress host and return
 * 403. The files are not lost: they exist in the local archive and are waiting
 * on scripts/migrate-cvs.mjs to move them into the private `cvs` bucket.
 *
 * So a legacy row is deliberately NOT rendered as a link. Offering one that
 * cannot work reads as a broken product; saying the CV is pending migration is
 * accurate and tells whoever is looking that nothing has been lost.
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

  if (value.kind === "legacy") {
    return (
      <span
        title="Held in the archive recovered from the previous site. Unreachable at its old address since the domain moved — pending migration into our own storage."
        className="inline-flex items-center gap-1.5 text-xs text-pac-muted"
      >
        <Clock className="w-3.5 h-3.5" aria-hidden />
        CV pending migration
      </span>
    );
  }

  return (
    <a
      href={value.href}
      target="_blank"
      rel="noreferrer noopener"
      title="Private link, expires in 5 minutes"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-pac-orange-dark hover:underline"
    >
      <FileText className="w-3.5 h-3.5" aria-hidden />
      Open CV
      {!compact && (
        <span className="font-normal text-pac-muted">— expires in 5 min</span>
      )}
    </a>
  );
}

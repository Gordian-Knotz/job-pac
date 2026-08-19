import { FileText, Clock } from "lucide-react";
import type { CvLink as CvLinkValue } from "@/lib/cv";

/**
 * One rendering of a CV link, used by the admin browser, the employer applicant
 * view and the seeker profile.
 *
 * "supabase" and "r2" are both openable and look identical to the user — which
 * backend holds the file is our problem, not theirs. Both are short-lived
 * presigned links.
 *
 * "legacy" is deliberately NOT a link. Those cv_urls point at
 * https://jobs.pac.africa/wp-content/uploads/... and return 403, because the
 * domain now resolves to Vercel rather than the old WordPress host. The files
 * are not lost — they are in the recovered archive, waiting on
 * scripts/migrate-cvs.mjs. Offering a link that cannot work reads as a broken
 * product; saying so plainly tells whoever is looking that nothing was lost.
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

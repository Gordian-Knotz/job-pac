import { MapPin, Clock, Briefcase, BadgeCheck, Signal, CalendarClock } from "lucide-react";
import { formatSalary, JOB_TYPE_LABELS, timeAgo } from "@/lib/utils";
import type { Job } from "@/types/database";

const LEVEL_LABELS: Record<string, string> = {
  entry: "Entry level",
  mid: "Mid level",
  senior: "Senior",
  executive: "Executive",
};

/**
 * The job body, shared by the standalone /jobs/[slug] page and the detail pane
 * of the two-pane search. One source of truth so the two can never drift.
 *
 * `apply` is a slot rather than a prop-driven form: the standalone page renders
 * the form inline, the pane renders a link across to it.
 */
export function JobDetail({
  job,
  apply,
  headingLevel = "h1",
}: {
  job: Job;
  apply?: React.ReactNode;
  headingLevel?: "h1" | "h2";
}) {
  const Heading = headingLevel;

  return (
    <article>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
        <span className="eyebrow">{job.category?.name ?? "General"}</span>
        {job.company?.verified && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-pac-orange-dark">
            <BadgeCheck className="w-3.5 h-3.5" aria-hidden />
            Verified employer
          </span>
        )}
      </div>

      <Heading className="font-display text-2xl md:text-3xl font-700 text-pac-ink leading-[1.12] tracking-display">
        {job.title}
      </Heading>
      <p className="text-pac-muted mt-1.5 text-[15px]">
        {job.company?.name ?? "Confidential employer"}
      </p>

      {/* Pay first: it is the thing applicants look for, and "not disclosed" is
          itself useful information rather than an absence to hide. */}
      <p className="font-display text-lg font-600 text-pac-ink mt-5">
        {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
      </p>

      <dl className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-sm text-pac-muted border-y border-pac-line py-3.5">
        <Meta icon={<MapPin className="w-4 h-4" aria-hidden />} label="Location">
          {job.is_remote
            ? "Remote"
            : (job.location?.name ?? job.location_text ?? "Kenya")}
        </Meta>
        <Meta icon={<Briefcase className="w-4 h-4" aria-hidden />} label="Job type">
          {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
        </Meta>
        <Meta icon={<Signal className="w-4 h-4" aria-hidden />} label="Seniority">
          {LEVEL_LABELS[job.employment_level] ?? job.employment_level}
        </Meta>
        <Meta icon={<Clock className="w-4 h-4" aria-hidden />} label="Posted">
          {timeAgo(job.original_date ?? job.created_at)}
        </Meta>
        {job.application_deadline && (
          <Meta
            icon={<CalendarClock className="w-4 h-4" aria-hidden />}
            label="Closes"
          >
            {new Date(job.application_deadline).toLocaleDateString("en-KE", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Meta>
        )}
      </dl>

      {apply && <div className="mt-6">{apply}</div>}

      <div className="mt-8 space-y-6">
        <Section title="About the role" html={job.description} />
        {job.requirements && <Section title="Requirements" html={job.requirements} />}
        {job.benefits && <Section title="Benefits" html={job.benefits} />}
      </div>
    </article>
  );
}

function Meta({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <dt className="sr-only">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Section({ title, html }: { title: string; html: string }) {
  return (
    <section>
      <h3 className="eyebrow mb-2.5">{title}</h3>
      {/* Trusted admin/employer input today. Once employer-authored listings are
          a real pathway this needs sanitising — see 07-next-steps P2 #7. */}
      <div
        className="prose prose-sm max-w-none text-pac-ink/90 leading-relaxed
                   prose-headings:font-display prose-headings:text-pac-ink
                   prose-a:text-pac-orange-dark prose-strong:text-pac-ink"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}

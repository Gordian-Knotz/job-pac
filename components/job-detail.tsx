import { MapPin, Clock, Briefcase, Signal, CalendarClock, ShieldCheck } from "lucide-react";
import { formatSalary, timeAgo } from "@/lib/utils";
import { sanitizeJobHtml } from "@/lib/sanitize";
import { job as jobCopy, employmentLevelLabels, jobTypeLabels } from "@/lib/content";
import type { Job } from "@/types/database";

/**
 * The job body, shared by the standalone detail page and anywhere else a role is
 * shown in full. One source of truth so they cannot drift.
 *
 * NO EMPLOYER AND NO SALARY, by design:
 *
 *  - The company behind a role is admin-only. PAC sits between the applicant and
 *    the employer, so there is no company name, logo, verified badge or "About
 *    the company" section here. `postedVia` states who the listing comes from,
 *    which makes the absence read as deliberate rather than as missing data.
 *  - Salaries were removed from the product. The columns still exist in the
 *    database (see migration 015) but nothing writes or reads them.
 *
 * `qualifications` replaced `benefits` — same slot, better prompt.
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
      <span className="eyebrow">{job.category?.name ?? "General"}</span>

      <Heading className="mt-2 font-display text-3xl font-700 leading-[1.1] tracking-display text-ink md:text-4xl">
        {job.title}
      </Heading>

      <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted">
        <ShieldCheck className="h-4 w-4 text-accent-text" aria-hidden />
        {jobCopy.postedVia}
      </p>

      {/* Only when set. An unpriced role simply says nothing about pay. */}
      {(job.salary_min || job.salary_max) && (
        <p className="mt-5 font-display text-xl font-600 text-ink">
          {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
        </p>
      )}

      <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-3 border-y border-line py-4 text-sm text-muted">
        <Meta icon={<MapPin className="h-4 w-4" aria-hidden />} label="Location">
          {job.is_remote
            ? "Remote"
            : (job.location?.name ?? job.location_text ?? "Kenya")}
        </Meta>
        <Meta icon={<Briefcase className="h-4 w-4" aria-hidden />} label="Job type">
          {jobTypeLabels[job.job_type] ?? job.job_type}
        </Meta>
        <Meta icon={<Signal className="h-4 w-4" aria-hidden />} label="Seniority">
          {employmentLevelLabels[job.employment_level] ?? job.employment_level}
        </Meta>
        <Meta icon={<Clock className="h-4 w-4" aria-hidden />} label="Posted">
          {timeAgo(job.original_date ?? job.created_at)}
        </Meta>
        {job.application_deadline && (
          <Meta
            icon={<CalendarClock className="h-4 w-4" aria-hidden />}
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

      <div className="mt-8 space-y-7">
        <Section title={jobCopy.about} html={job.description} />
        {job.requirements && (
          <Section title={jobCopy.requirements} html={job.requirements} />
        )}
        {job.qualifications && (
          <Section title={jobCopy.qualifications} html={job.qualifications} />
        )}
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
      {/* Employers author this copy, so it is untrusted — sanitised through an
          allowlist on every render. See lib/sanitize.ts. */}
      <div
        className="prose prose-sm max-w-none leading-relaxed text-ink/90
                   prose-headings:font-display prose-headings:text-ink
                   prose-strong:text-ink prose-a:text-accent-text
                   dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: sanitizeJobHtml(html) }}
      />
    </section>
  );
}

import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, Phone, Mail } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { ApplicationStatusBadge } from "@/components/status-badge";
import { CvLink } from "@/components/cv-link";
import { cvLinksBatch } from "@/lib/cv-access";
import type { CvLink as CvLinkValue } from "@/lib/cv";
import { displayApplicant } from "@/lib/utils";
import type { ApplicationStatus } from "@/types/database";

const PER_PAGE = 50;

interface Row {
  id: string;
  applicant_name: string | null;
  applicant_email: string;
  applicant_phone: string | null;
  cover_letter: string | null;
  cv_url: string | null;
  status: ApplicationStatus;
  employer_note: string | null;
  wp_post_id: number | null;
  wp_job_title: string | null;
  applied_at: string;
  applicant_id: string | null;
  job: { title: string; slug: string } | null;
}

interface Params {
  q?: string;
  status?: string;
  source?: string;
  cv?: string;
  /** Calendar year of applied_at. Records span 2015–2026. */
  year?: string;
  /** Employer (company) the applied-for role belongs to. Admin-only view. */
  employer?: string;
  /** Whether the applicant has an account attached to the record. */
  claimed?: string;
  page?: string;
}

// under_review is included now that migration 014 added it.
const STATUSES: ApplicationStatus[] = [
  "pending",
  "under_review",
  "shortlisted",
  "rejected",
  "hired",
];

function href(current: Params, changes: Partial<Record<keyof Params, string | null>>) {
  const next = new URLSearchParams();
  const merged = { ...current, ...changes } as Record<string, string | null | undefined>;
  for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value);
  const qs = next.toString();
  return qs ? `/admin/applications?${qs}` : "/admin/applications";
}

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const { supabase } = await requireProfile("admin");
  const params = await searchParams;

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PER_PAGE;

  let query = supabase
    .from("applications")
    .select(
      `id, applicant_name, applicant_email, applicant_phone, cover_letter, cv_url,
       status, employer_note, wp_post_id, wp_job_title, applied_at, applicant_id,
       job:jobs(title, slug)`,
      { count: "exact" }
    )
    .order("applied_at", { ascending: false });

  if (params.q) {
    // Applicants are searched by the three things an admin actually knows: who
    // they are, how to reach them, and what they applied for. wp_job_title is
    // included because job_id is NULL for every migrated row, so the free-text
    // snapshot is the only role name those 4,355 records carry.
    const term = params.q.replace(/[%,()]/g, " ").trim();
    if (term) {
      query = query.or(
        `applicant_name.ilike.%${term}%,applicant_email.ilike.%${term}%,wp_job_title.ilike.%${term}%`
      );
    }
  }

  if (params.status && (STATUSES as string[]).includes(params.status)) {
    query = query.eq("status", params.status as ApplicationStatus);
  }

  // Historical rows are exactly the ones carrying a WordPress post id.
  if (params.source === "historical") query = query.not("wp_post_id", "is", null);
  if (params.source === "new") query = query.is("wp_post_id", null);

  // "migrated" now means anywhere we host it — Supabase for new uploads, R2 for
  // the recovered archive. Only an http:// value is still unreachable.
  if (params.cv === "legacy") query = query.like("cv_url", "http%");
  if (params.cv === "migrated") {
    query = query.not("cv_url", "is", null).not("cv_url", "like", "http%");
  }
  if (params.cv === "none") query = query.is("cv_url", null);

  // Whether the applicant has an account attached. Every archive row starts
  // unclaimed, so this is how you find who has come back and reconnected.
  if (params.claimed === "yes") query = query.not("applicant_id", "is", null);
  if (params.claimed === "no") query = query.is("applicant_id", null);

  const year = Number.parseInt(params.year ?? "", 10);
  if (Number.isFinite(year) && year > 2000 && year < 2100) {
    query = query
      .gte("applied_at", `${year}-01-01`)
      .lt("applied_at", `${year + 1}-01-01`);
  }

  // Employer filter resolves to job ids first rather than filtering through the
  // embedded resource: PostgREST needs an !inner join for that, which would
  // silently drop every archive row (job_id is NULL on all 4,355 of them).
  if (params.employer) {
    const { data: employerJobs } = await supabase
      .from("jobs")
      .select("id")
      .eq("company_id", params.employer);
    const ids = ((employerJobs as { id: string }[] | null) ?? []).map((j) => j.id);
    // No jobs means no applications — an impossible id keeps the result empty
    // rather than silently ignoring the filter.
    query = query.in("job_id", ids.length ? ids : [
      "00000000-0000-0000-0000-000000000000",
    ]);
  }

  const { data, count, error } = await query.range(from, from + PER_PAGE - 1);

  const rows = (data ?? []) as unknown as Row[];
  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));

  // Year options come from the data's real span, not a hardcoded range — the
  // archive starts in 2015 and the newest arrives whenever someone applies.
  const [{ data: oldest }, { data: newest }, { data: employerRows }, cvLinks] =
    await Promise.all([
      supabase
        .from("applications")
        .select("applied_at")
        .order("applied_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("applications")
        .select("applied_at")
        .order("applied_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Admin-only: companies are no longer world-readable (migration 016), and
      // this view is behind requireProfile("admin").
      supabase.from("companies").select("id, name").order("name").limit(500),
      cvLinksBatch(supabase, rows.map((r) => r.cv_url)),
    ]);

  const firstYear = (oldest as { applied_at: string } | null)
    ? new Date((oldest as { applied_at: string }).applied_at).getFullYear()
    : new Date().getFullYear();
  const lastYear = (newest as { applied_at: string } | null)
    ? new Date((newest as { applied_at: string }).applied_at).getFullYear()
    : new Date().getFullYear();
  const years = Array.from(
    { length: Math.max(1, lastYear - firstYear + 1) },
    (_, i) => lastYear - i
  );
  const employers = (employerRows as { id: string; name: string }[] | null) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="eyebrow">PAC Africa &middot; Internal</span>
          <h1 className="font-display text-3xl font-700 text-pac-ink mt-2">
            Applications
          </h1>
          <p className="text-sm text-pac-muted mt-1">
            Every application on record, including the archive recovered from the
            previous site — back to March 2015.
          </p>
        </div>
        <Link href="/admin" className="btn-secondary">
          Dashboard
        </Link>
      </div>

      {error && (
        <p className="mt-6 text-sm text-red-600 border border-red-200 bg-red-50 rounded-card px-4 py-3">
          {error.message}
        </p>
      )}

      {/* SEARCH ------------------------------------------------------- */}
      <form action="/admin/applications" className="flex flex-col sm:flex-row gap-2.5 mt-6">
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pac-faint"
            aria-hidden
          />
          <label htmlFor="q" className="sr-only">
            Search by name, email or role
          </label>
          <input
            id="q"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Name, email address, or the role they applied for"
            className="field pl-10"
          />
        </div>
        {/* Chip state lives in the URL, so it must survive a search submit. */}
        {params.status && <input type="hidden" name="status" value={params.status} />}
        {params.source && <input type="hidden" name="source" value={params.source} />}
        {params.cv && <input type="hidden" name="cv" value={params.cv} />}
        {params.claimed && <input type="hidden" name="claimed" value={params.claimed} />}
        {params.year && <input type="hidden" name="year" value={params.year} />}
        {params.employer && (
          <input type="hidden" name="employer" value={params.employer} />
        )}
        <button type="submit" className="btn-primary shrink-0">
          Search
        </button>
      </form>

      {/* Year and employer are selects rather than chips — 12 years and a
          growing employer list would swamp the chip row. */}
      <form action="/admin/applications" className="mt-3 flex flex-wrap items-end gap-2">
        {params.q && <input type="hidden" name="q" value={params.q} />}
        {params.status && <input type="hidden" name="status" value={params.status} />}
        {params.source && <input type="hidden" name="source" value={params.source} />}
        {params.cv && <input type="hidden" name="cv" value={params.cv} />}
        {params.claimed && <input type="hidden" name="claimed" value={params.claimed} />}

        <div>
          <label htmlFor="year" className="eyebrow mb-1.5 block">
            Year applied
          </label>
          <select
            id="year"
            name="year"
            defaultValue={params.year ?? ""}
            className="field w-[150px]"
          >
            <option value="">Any year</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="employer" className="eyebrow mb-1.5 block">
            Employer
          </label>
          <select
            id="employer"
            name="employer"
            defaultValue={params.employer ?? ""}
            className="field w-[220px]"
          >
            <option value="">Any employer</option>
            {employers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-secondary text-xs">
          Apply
        </button>
      </form>

      {/* FILTERS ------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <FilterChip label="All" active={!params.status} to={href(params, { status: null, page: null })} />
        {STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={s}
            active={params.status === s}
            to={href(params, { status: s, page: null })}
          />
        ))}
        <span className="w-px h-5 bg-pac-line mx-1" aria-hidden />
        <FilterChip
          label="Archive"
          active={params.source === "historical"}
          to={href(params, {
            source: params.source === "historical" ? null : "historical",
            page: null,
          })}
        />
        <FilterChip
          label="Since relaunch"
          active={params.source === "new"}
          to={href(params, { source: params.source === "new" ? null : "new", page: null })}
        />
        <span className="w-px h-5 bg-pac-line mx-1" aria-hidden />
        <FilterChip
          label="CV on old site"
          active={params.cv === "legacy"}
          to={href(params, { cv: params.cv === "legacy" ? null : "legacy", page: null })}
        />
        <FilterChip
          label="CV migrated"
          active={params.cv === "migrated"}
          to={href(params, { cv: params.cv === "migrated" ? null : "migrated", page: null })}
        />
        <FilterChip
          label="No CV"
          active={params.cv === "none"}
          to={href(params, { cv: params.cv === "none" ? null : "none", page: null })}
        />
        <span className="w-px h-5 bg-pac-line mx-1" aria-hidden />
        {/* Every archive row starts unclaimed, so this is how you find who has
            come back and reconnected their history. */}
        <FilterChip
          label="Claimed"
          active={params.claimed === "yes"}
          to={href(params, {
            claimed: params.claimed === "yes" ? null : "yes",
            page: null,
          })}
        />
        <FilterChip
          label="Unclaimed"
          active={params.claimed === "no"}
          to={href(params, {
            claimed: params.claimed === "no" ? null : "no",
            page: null,
          })}
        />

        {(params.q ||
          params.status ||
          params.source ||
          params.cv ||
          params.claimed ||
          params.year ||
          params.employer) && (
          <Link href="/admin/applications" className="btn-quiet ml-auto">
            Clear all
          </Link>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-4 mt-6 mb-3">
        <p className="text-sm text-pac-muted">
          {total.toLocaleString()} application{total === 1 ? "" : "s"}
          {total > 0 && (
            <>
              {" "}
              &middot; page {page} of {lastPage}
            </>
          )}
        </p>
        <Pager params={params} page={page} lastPage={lastPage} />
      </div>

      {rows.length === 0 ? (
        <div className="border border-dashed border-pac-line rounded-card py-16 px-6 text-center">
          <p className="font-display text-lg text-pac-ink mb-1">Nothing matches</p>
          <p className="text-sm text-pac-muted mb-5">
            Try a shorter search term or clear the filters.
          </p>
          <Link href="/admin/applications" className="btn-secondary">
            Clear filters
          </Link>
        </div>
      ) : (
        <ul className="border border-pac-line rounded-card divide-y divide-pac-line bg-white">
          {rows.map((row) => {
            const link: CvLinkValue = row.cv_url
              ? (cvLinks.get(row.cv_url) ?? { kind: "none" })
              : { kind: "none" };
            const role = row.job?.title ?? row.wp_job_title;

            return (
              <li key={row.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-pac-ink">
                      {displayApplicant(row.applicant_name, row.applicant_email)}
                      {row.wp_post_id !== null && (
                        <span className="eyebrow ml-2">archive</span>
                      )}
                    </p>
                    <p className="text-xs text-pac-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <a
                        href={`mailto:${row.applicant_email}`}
                        className="inline-flex items-center gap-1 hover:text-pac-orange-dark"
                      >
                        <Mail className="w-3.5 h-3.5" aria-hidden />
                        {row.applicant_email}
                      </a>
                      {row.applicant_phone && (
                        <a
                          href={`tel:${row.applicant_phone.replace(/\s+/g, "")}`}
                          className="inline-flex items-center gap-1 hover:text-pac-orange-dark"
                        >
                          <Phone className="w-3.5 h-3.5" aria-hidden />
                          {row.applicant_phone}
                        </a>
                      )}
                    </p>
                    <p className="text-xs text-pac-muted mt-1">
                      {role ? (
                        row.job ? (
                          <Link
                            href={`/jobs/${row.job.slug}`}
                            className="hover:text-pac-orange-dark"
                          >
                            {role}
                          </Link>
                        ) : (
                          role
                        )
                      ) : (
                        <span className="text-pac-faint">Role not recorded</span>
                      )}
                      {" · "}
                      {new Date(row.applied_at).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {row.applicant_id === null && row.wp_post_id !== null && (
                        <span className="text-pac-faint"> · unclaimed</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <CvLink value={link} compact />
                    <ApplicationStatusBadge status={row.status} />
                  </div>
                </div>

                {(row.cover_letter || row.employer_note) && (
                  <details className="mt-2.5 group">
                    <summary className="text-xs text-pac-muted cursor-pointer hover:text-pac-ink list-none marker:hidden">
                      <span className="group-open:hidden">Show cover letter</span>
                      <span className="hidden group-open:inline">Hide</span>
                    </summary>
                    {row.cover_letter && (
                      <p className="text-[13px] text-pac-ink/90 leading-relaxed whitespace-pre-line mt-2 border-l-2 border-pac-line pl-3">
                        {row.cover_letter}
                      </p>
                    )}
                    {row.employer_note && (
                      <p className="text-[13px] text-pac-muted mt-2 border-l-2 border-pac-orange/40 pl-3">
                        <span className="eyebrow block mb-0.5">Internal note</span>
                        {row.employer_note}
                      </p>
                    )}
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex justify-between items-center mt-4">
        <p className="text-xs text-pac-muted">
          Showing {rows.length === 0 ? 0 : from + 1}–{from + rows.length} of{" "}
          {total.toLocaleString()}
        </p>
        <Pager params={params} page={page} lastPage={lastPage} />
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  to,
}: {
  label: string;
  active: boolean;
  to: string;
}) {
  return (
    <Link href={to} className={`chip ${active ? "chip-active" : ""} capitalize`}>
      {label}
    </Link>
  );
}

function Pager({
  params,
  page,
  lastPage,
}: {
  params: Params;
  page: number;
  lastPage: number;
}) {
  if (lastPage <= 1) return null;
  return (
    <div className="flex items-center gap-1.5">
      {page > 1 ? (
        <Link
          href={href(params, { page: page === 2 ? null : String(page - 1) })}
          className="btn-secondary px-2.5 py-1.5 text-xs"
        >
          <ChevronLeft className="w-3.5 h-3.5" aria-hidden />
          Previous
        </Link>
      ) : (
        <span className="btn-secondary px-2.5 py-1.5 text-xs opacity-45 pointer-events-none">
          <ChevronLeft className="w-3.5 h-3.5" aria-hidden />
          Previous
        </span>
      )}
      {page < lastPage ? (
        <Link
          href={href(params, { page: String(page + 1) })}
          className="btn-secondary px-2.5 py-1.5 text-xs"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      ) : (
        <span className="btn-secondary px-2.5 py-1.5 text-xs opacity-45 pointer-events-none">
          Next
          <ChevronRight className="w-3.5 h-3.5" aria-hidden />
        </span>
      )}
    </div>
  );
}

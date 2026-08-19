import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, Phone, Mail } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { ApplicationStatusBadge } from "@/components/status-badge";
import { CvLink } from "@/components/cv-link";
import { cvLinksBatch, type CvLink as CvLinkValue } from "@/lib/supabase/storage";
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
  page?: string;
}

const STATUSES: ApplicationStatus[] = ["pending", "shortlisted", "rejected", "hired"];

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

  if (params.cv === "legacy") query = query.like("cv_url", "http%");
  if (params.cv === "migrated") {
    query = query.not("cv_url", "is", null).not("cv_url", "like", "http%");
  }
  if (params.cv === "none") query = query.is("cv_url", null);

  const { data, count, error } = await query.range(from, from + PER_PAGE - 1);

  const rows = (data ?? []) as unknown as Row[];
  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));

  const cvLinks = await cvLinksBatch(supabase, rows.map((r) => r.cv_url));

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
            previous site — back to December 2014.
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
        {params.status && <input type="hidden" name="status" value={params.status} />}
        {params.source && <input type="hidden" name="source" value={params.source} />}
        {params.cv && <input type="hidden" name="cv" value={params.cv} />}
        <button type="submit" className="btn-primary shrink-0">
          Search
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

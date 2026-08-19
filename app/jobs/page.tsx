import Link from "next/link";
import { Search, X, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JobResult } from "@/components/job-result";
import { JobDetail } from "@/components/job-detail";
import { JOB_TYPE_LABELS } from "@/lib/utils";
import type { Job, JobCategory, JobLocation, JobType } from "@/types/database";

interface SearchParams {
  q?: string;
  category?: string;
  location?: string;
  type?: string;
  remote?: string;
  sort?: string;
  /** slug of the row open in the detail pane */
  j?: string;
}

const SORTS = [
  { value: "new", label: "Newest" },
  { value: "pay", label: "Highest pay" },
];

const SELECT_FIELDS = `
  *,
  company:companies(*),
  category:job_categories(*),
  location:job_locations(*)
`;

/** Rebuilds the current URL with changes applied; null clears a param. */
function href(current: SearchParams, changes: Partial<Record<keyof SearchParams, string | null>>) {
  const next = new URLSearchParams();
  const merged = { ...current, ...changes } as Record<string, string | null | undefined>;
  for (const [key, value] of Object.entries(merged)) {
    if (value) next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `/jobs?${qs}` : "/jobs";
}

async function getJobs(params: SearchParams) {
  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select(SELECT_FIELDS, { count: "exact" })
    .eq("status", "published");

  if (params.q) {
    // websearch, not the default plainto/tsquery parsing: raw input like "c++"
    // or "sales & marketing" is a valid search phrase to a person and a syntax
    // error to tsquery. websearch_to_tsquery tolerates arbitrary text.
    query = query.textSearch("fts", params.q, { type: "websearch" });
  }
  if (params.category) query = query.eq("category_id", params.category);
  if (params.location) query = query.eq("location_id", params.location);
  // ?type= is arbitrary text from the URL. Check it against the known job types
  // before it reaches an enum column, so a junk value is ignored rather than
  // becoming a Postgres cast error.
  if (params.type && params.type in JOB_TYPE_LABELS) {
    query = query.eq("job_type", params.type as JobType);
  }
  if (params.remote === "1") query = query.eq("is_remote", true);

  query =
    params.sort === "pay"
      ? query.order("salary_max", { ascending: false, nullsFirst: false })
      : query.order("created_at", { ascending: false });

  const { data, count, error } = await query.limit(50);
  if (error) console.error(error);
  return { jobs: (data as unknown as Job[]) ?? [], total: count ?? 0 };
}

async function getFilterOptions() {
  const supabase = await createClient();
  const [categories, locations] = await Promise.all([
    supabase.from("job_categories").select("id, name").order("name").limit(300),
    supabase.from("job_locations").select("id, name").order("name").limit(200),
  ]);
  return {
    categories: (categories.data as JobCategory[]) ?? [],
    locations: (locations.data as JobLocation[]) ?? [],
  };
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [{ jobs, total }, options] = await Promise.all([
    getJobs(params),
    getFilterOptions(),
  ]);

  // Open the first result by default, the way a results page should already be
  // showing you something rather than an instruction to click.
  const selected = jobs.find((job) => job.slug === params.j) ?? jobs[0] ?? null;

  // Master–detail on one screen at desktop width; on mobile the pane replaces
  // the list once a row is chosen, with a way back. No JS either way.
  const hasExplicitSelection = Boolean(params.j);
  const listVisibility = hasExplicitSelection ? "hidden lg:block" : "block";
  const paneVisibility = hasExplicitSelection ? "block" : "hidden lg:block";

  const activeFilters = [
    params.q && { label: `“${params.q}”`, clear: href(params, { q: null, j: null }) },
    params.type && {
      label: JOB_TYPE_LABELS[params.type] ?? params.type,
      clear: href(params, { type: null, j: null }),
    },
    params.remote === "1" && { label: "Remote", clear: href(params, { remote: null, j: null }) },
    params.category && {
      label: options.categories.find((c) => c.id === params.category)?.name ?? "Category",
      clear: href(params, { category: null, j: null }),
    },
    params.location && {
      label: options.locations.find((l) => l.id === params.location)?.name ?? "Location",
      clear: href(params, { location: null, j: null }),
    },
  ].filter(Boolean) as { label: string; clear: string }[];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* ── SEARCH ─────────────────────────────────────────────────── */}
      <form action="/jobs" className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pac-faint"
            aria-hidden
          />
          <label htmlFor="q" className="sr-only">
            Job title, skill or company
          </label>
          <input
            id="q"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Job title, skill, or company"
            className="field pl-10"
          />
        </div>

        <div className="sm:w-48">
          <label htmlFor="location" className="sr-only">
            Location
          </label>
          <select
            id="location"
            name="location"
            defaultValue={params.location ?? ""}
            className="field"
          >
            <option value="">Anywhere in Kenya</option>
            {options.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* 165 categories belong in a select, not a list of links. The previous
            sidebar rendered only the first 12 and silently dropped the rest. */}
        <div className="sm:w-48">
          <label htmlFor="category" className="sr-only">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={params.category ?? ""}
            className="field"
          >
            <option value="">All categories</option>
            {options.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Chip state lives in the URL, so it has to survive a form submit. */}
        {params.type && <input type="hidden" name="type" value={params.type} />}
        {params.remote && <input type="hidden" name="remote" value={params.remote} />}
        {params.sort && <input type="hidden" name="sort" value={params.sort} />}

        <button type="submit" className="btn-primary shrink-0">
          Search jobs
        </button>
      </form>

      {/* ── FILTERS ────────────────────────────────────────────────────
          Chips for the five job types, because an enumeration that small
          should be visible and one tap away. A 165-entry category list is a
          select — the previous sidebar showed only the first 12 and silently
          hid the rest. */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        {Object.entries(JOB_TYPE_LABELS).map(([value, label]) => {
          const active = params.type === value;
          return (
            <Link
              key={value}
              href={href(params, { type: active ? null : value, j: null })}
              className={`chip ${active ? "chip-active" : ""}`}
            >
              {label}
            </Link>
          );
        })}

        <Link
          href={href(params, { remote: params.remote === "1" ? null : "1", j: null })}
          className={`chip ${params.remote === "1" ? "chip-active" : ""}`}
        >
          Remote
        </Link>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="eyebrow">Filtered by</span>
          {activeFilters.map((filter) => (
            <Link key={filter.label} href={filter.clear} className="chip chip-active">
              {filter.label}
              <X className="w-3 h-3" aria-hidden />
              <span className="sr-only">Remove filter</span>
            </Link>
          ))}
          <Link href="/jobs" className="btn-quiet">
            Clear all
          </Link>
        </div>
      )}

      {/* ── COUNT + SORT ───────────────────────────────────────────── */}
      <div className="flex items-baseline justify-between gap-4 mt-6 mb-3">
        <h1 className="font-display text-xl font-600 text-pac-ink tracking-tight">
          {total.toLocaleString()} open role{total === 1 ? "" : "s"}
        </h1>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="eyebrow">Sort</span>
          {SORTS.map((sort) => {
            const active = (params.sort ?? "new") === sort.value;
            return (
              <Link
                key={sort.value}
                href={href(params, { sort: sort.value, j: null })}
                className={`px-2 py-1 rounded transition-colors duration-150 ease-out ${
                  active
                    ? "text-pac-orange-dark font-medium"
                    : "text-pac-muted hover:text-pac-ink"
                }`}
              >
                {sort.label}
              </Link>
            );
          })}
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="border border-dashed border-pac-line rounded-card py-20 px-6 text-center">
          <p className="font-display text-lg text-pac-ink mb-1">
            No roles match those filters
          </p>
          <p className="text-sm text-pac-muted mb-5">
            Try a broader search term, or clear a filter to widen the results.
          </p>
          <Link href="/jobs" className="btn-secondary">
            Clear all filters
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-6 items-start">
          {/* RESULTS */}
          <div
            className={`${listVisibility} lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto lg:sticky lg:top-24
                        border border-pac-line rounded-card bg-white overflow-hidden`}
          >
            {jobs.map((job) => (
              <JobResult
                key={job.id}
                job={job}
                selected={selected?.id === job.id}
                href={href(params, { j: job.slug })}
              />
            ))}
            {total > jobs.length && (
              <p className="px-5 py-4 text-xs text-pac-muted">
                Showing the first {jobs.length} of {total.toLocaleString()}. Narrow
                the search to see more.
              </p>
            )}
          </div>

          {/* DETAIL PANE */}
          {selected && (
            <div className={paneVisibility}>
              <Link
                href={href(params, { j: null })}
                className="lg:hidden inline-flex items-center gap-1.5 text-sm text-pac-muted mb-3"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden />
                Back to results
              </Link>

              <div
                key={selected.id}
                className="animate-pane-in rounded-card border border-pac-line bg-white shadow-raised p-6 md:p-8
                           lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto lg:sticky lg:top-24"
              >
                <JobDetail
                  job={selected}
                  headingLevel="h2"
                  apply={
                    <Link href={`/jobs/${selected.slug}`} className="btn-primary w-full">
                      Apply for this role
                    </Link>
                  }
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

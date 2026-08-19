import { createClient } from "@/lib/supabase/server";
import { JobCard } from "@/components/job-card";
import { Job, JobCategory, JobLocation } from "@/types/database";

export const revalidate = 60;

interface SearchParams {
  q?: string;
  category?: string;
  location?: string;
  type?: string;
}

async function getJobs(params: SearchParams) {
  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select(`
      *,
      company:companies(*),
      category:job_categories(*),
      location:job_locations(*)
    `)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (params.q) {
    query = query.textSearch("fts", params.q);
  }
  if (params.category) {
    query = query.eq("category_id", params.category);
  }
  if (params.location) {
    query = query.eq("location_id", params.location);
  }
  if (params.type) {
    query = query.eq("job_type", params.type);
  }

  const { data, error } = await query.limit(50);
  if (error) console.error(error);
  return (data as unknown as Job[]) ?? [];
}

async function getFilters() {
  const supabase = await createClient();
  const [categories, locations] = await Promise.all([
    supabase.from("job_categories").select("*").order("name").limit(30),
    supabase.from("job_locations").select("*").order("name").limit(30),
  ]);
  return {
    categories: (categories.data as JobCategory[]) ?? [],
    locations: (locations.data as JobLocation[]) ?? [],
  };
}

const JOB_TYPES = [
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Contract" },
  { value: "freelance", label: "Freelance" },
  { value: "internship", label: "Internship" },
];

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [jobs, filters] = await Promise.all([getJobs(params), getFilters()]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <span className="eyebrow">Browse</span>
      <h1 className="font-display text-3xl font-700 text-pac-ink mt-2 mb-8">
        {jobs.length} open role{jobs.length !== 1 ? "s" : ""}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-10">
        {/* SIDEBAR FILTERS */}
        <aside className="space-y-8">
          <FilterGroup
            title="Job Type"
            name="type"
            options={JOB_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            active={params.type}
          />
          <FilterGroup
            title="Category"
            name="category"
            options={filters.categories.map((c) => ({ value: c.id, label: c.name }))}
            active={params.category}
          />
          <FilterGroup
            title="Location"
            name="location"
            options={filters.locations.map((l) => ({ value: l.id, label: l.name }))}
            active={params.location}
          />
        </aside>

        {/* RESULTS */}
        <div>
          {jobs.length === 0 ? (
            <div className="border border-dashed border-pac-line rounded-card py-20 text-center text-pac-muted">
              <p className="font-display text-lg text-pac-ink mb-1">
                No roles match those filters
              </p>
              <p className="text-sm">Try clearing a filter or searching a broader term.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  name,
  options,
  active,
}: {
  title: string;
  name: string;
  options: { value: string; label: string }[];
  active?: string;
}) {
  return (
    <div>
      <h3 className="eyebrow mb-3">{title}</h3>
      <ul className="space-y-1.5 text-sm">
        {options.slice(0, 12).map((opt) => (
          <li key={opt.value}>
            <a
              href={`/jobs?${name}=${opt.value}`}
              className={`block truncate hover:text-pac-orange transition-colors ${
                active === opt.value ? "text-pac-orange font-medium" : "text-pac-ink"
              }`}
            >
              {opt.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

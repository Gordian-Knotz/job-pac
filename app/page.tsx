import { createClient } from "@/lib/supabase/server";
import { JobCard } from "@/components/job-card";
import { Job } from "@/types/database";
import Link from "next/link";
import { Search } from "lucide-react";

export const revalidate = 60;

async function getFeaturedJobs(): Promise<Job[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(`
      *,
      company:companies(*),
      category:job_categories(*),
      location:job_locations(*)
    `)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(9);

  if (error) {
    console.error(error);
    return [];
  }
  return (data as unknown as Job[]) ?? [];
}

// The hero used to show live counts here via the stats() RPC. Removed on
// request: the application total is commercially sensitive while the board is
// being rebuilt, and a public "4,355 applications on file" also tells anyone
// exactly how much personal data sits behind the site.
//
// Migration 011 revokes stats() from anon to match — otherwise the numbers were
// still readable straight off /rest/v1/rpc/stats and taking them off the page
// would only have hidden them from people who don't look.

async function getLocations() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_locations")
    .select("id, name")
    .order("name")
    .limit(200);
  return (data as { id: string; name: string }[]) ?? [];
}

export default async function HomePage() {
  const [jobs, locations] = await Promise.all([getFeaturedJobs(), getLocations()]);

  return (
    <>
      {/* HERO */}
      <section className="border-b border-pac-line">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <span className="eyebrow">PAC Africa &middot; Job Board</span>
          <h1 className="font-display text-4xl md:text-5xl font-700 mt-3 max-w-2xl leading-[1.06] tracking-display text-pac-ink">
            Vetted work, verified employers, across Kenya.
          </h1>
          <p className="text-pac-muted mt-4 max-w-lg text-[15px] leading-relaxed">
            Since 2014 we&apos;ve connected thousands of applicants with real,
            checked opportunities — no ghost listings, no recruiter noise.
          </p>

          {/* What and where, the two questions every job search starts with. */}
          <form action="/jobs" className="mt-8 flex flex-col sm:flex-row gap-2.5 max-w-2xl">
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pac-faint"
                aria-hidden
              />
              <label htmlFor="hero-q" className="sr-only">
                Job title, skill or company
              </label>
              <input
                id="hero-q"
                name="q"
                placeholder="Job title, skill, or company"
                className="field pl-10 py-3"
              />
            </div>
            <div className="sm:w-52">
              <label htmlFor="hero-location" className="sr-only">
                Location
              </label>
              <select id="hero-location" name="location" className="field py-3">
                <option value="">Anywhere in Kenya</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary shrink-0 px-6 py-3">
              Search jobs
            </button>
          </form>

        </div>
      </section>

      {/* FEATURED JOBS */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="font-display text-2xl font-600 text-pac-ink">
            Latest roles
          </h2>
          <Link
            href="/jobs"
            className="text-sm text-pac-orange hover:underline"
          >
            View all jobs &rarr;
          </Link>
        </div>

        {jobs.length === 0 ? (
          /* An empty screen is an invitation to act, so it names the two things
             a visitor can actually do rather than describing the vacancy. */
          <div className="border border-dashed border-pac-line rounded-card py-16 px-6 text-center">
            <p className="font-display text-lg text-pac-ink mb-1">
              No roles are live right now
            </p>
            <p className="text-sm text-pac-muted mb-5 max-w-md mx-auto">
              PAC Africa reviews every listing before it publishes. Nothing has
              cleared review yet — check back shortly, or post a role if you are
              hiring.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/auth/register" className="btn-primary">
                Post a job
              </Link>
              <Link href="/jobs" className="btn-secondary">
                Browse all roles
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

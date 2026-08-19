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

async function getStats() {
  const supabase = await createClient();

  // Counted through the stats() RPC rather than three head:true queries.
  // A visitor is not signed in, and RLS correctly hides every application row
  // from anon — so counting the table directly returned 0 while 4,355 rows sat
  // in it. stats() is SECURITY DEFINER and returns only aggregates, so the
  // number is real without any policy exposing applicant names, emails or
  // phone numbers to the public. See migration 005.
  const { data, error } = await supabase.rpc("stats").single();

  if (error || !data) {
    if (error) console.error(error);
    return { jobs: 0, applications: 0, companies: 0 };
  }

  const row = data as { live_jobs: number; applications: number; employers: number };
  return {
    jobs: Number(row.live_jobs) || 0,
    applications: Number(row.applications) || 0,
    companies: Number(row.employers) || 0,
  };
}

export default async function HomePage() {
  const [jobs, stats] = await Promise.all([getFeaturedJobs(), getStats()]);

  return (
    <>
      {/* HERO */}
      <section className="border-b border-pac-line">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <span className="eyebrow">PAC Africa &middot; Job Board</span>
          <h1 className="font-display text-4xl md:text-5xl font-700 mt-3 max-w-2xl leading-[1.1] text-pac-ink">
            Vetted work, verified employers, across Kenya.
          </h1>
          <p className="text-pac-muted mt-4 max-w-lg text-[15px] leading-relaxed">
            Since 2014 we&apos;ve connected thousands of applicants with real,
            checked opportunities — no ghost listings, no recruiter noise.
          </p>

          <form
            action="/jobs"
            className="mt-8 flex flex-col sm:flex-row gap-3 max-w-xl"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pac-muted" />
              <input
                name="q"
                placeholder="Job title, skill, or company"
                className="w-full pl-10 pr-4 py-3 rounded-card border border-pac-line bg-white text-sm focus:border-pac-orange outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-pac-orange text-white px-6 py-3 rounded-card text-sm font-medium hover:bg-pac-orange-dark transition-colors"
            >
              Search jobs
            </button>
          </form>

          <div className="flex gap-10 mt-12 font-mono text-xs uppercase tracking-wider text-pac-muted">
            <div>
              <span className="block font-display text-2xl text-pac-ink normal-case tracking-normal font-600">
                {stats.jobs.toLocaleString()}
              </span>
              Live roles
            </div>
            <div>
              <span className="block font-display text-2xl text-pac-ink normal-case tracking-normal font-600">
                {stats.applications.toLocaleString()}
              </span>
              Applications on file
            </div>
            <div>
              <span className="block font-display text-2xl text-pac-ink normal-case tracking-normal font-600">
                {stats.companies.toLocaleString()}
              </span>
              Employers
            </div>
          </div>
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
          <div className="border border-dashed border-pac-line rounded-card py-16 text-center text-pac-muted">
            <p className="font-display text-lg text-pac-ink mb-1">
              No live roles yet
            </p>
            <p className="text-sm">
              Once jobs are published they&apos;ll appear here.
            </p>
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

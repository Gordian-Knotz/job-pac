import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { after } from "next/server";
import { cache } from "react";
import { ArrowLeft, Flag } from "lucide-react";
import type { Metadata } from "next";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { JobDetail } from "@/components/job-detail";
import { JobCard } from "@/components/job-card";
import { ApplyForm, type ApplyViewer } from "@/components/apply-form";
import { ShareButton } from "@/components/share-button";
import { job as jobCopy, gate } from "@/lib/content";
import type { Job, Profile, Database } from "@/types/database";

export const revalidate = 300;

const SELECT = `
  *,
  category:job_categories(*),
  location:job_locations(*)
`;

const getJob = cache(async function getJob(slug: string): Promise<Job | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select(SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return (data as unknown as Job) ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) return { title: jobCopy.notFound };

  // No employer in the title or description — the company behind a role is
  // admin-only, and metadata is the most public surface there is.
  return {
    title: `${job.title} | PAC Jobs`,
    description: `${job.title} — ${
      job.is_remote ? "Remote" : (job.location?.name ?? "Kenya")
    }. Listed by PAC Africa.`,
  };
}

/**
 * Who is looking, and have they already applied?
 *
 * Resolved server-side so the apply card never flashes a blank guest form at
 * someone who is signed in, and never files an application with a NULL
 * applicant_id that would then be missing from their dashboard.
 */
async function getViewerContext(jobId: string): Promise<{
  viewer: ApplyViewer | null;
  appliedAt: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { viewer: null, appliedAt: null };

  const [{ data: profile }, { data: existing }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, role, full_name, email, phone, cv_url")
      .eq("id", user.id)
      .single(),
    supabase
      .from("applications")
      .select("applied_at")
      .eq("job_id", jobId)
      .eq("applicant_id", user.id)
      .order("applied_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!profile) return { viewer: null, appliedAt: null };
  const p = profile as Pick<
    Profile,
    "id" | "role" | "full_name" | "email" | "phone" | "cv_url"
  >;

  return {
    viewer: {
      id: p.id,
      role: p.role,
      fullName: p.full_name,
      email: p.email,
      phone: p.phone,
      cvUrl: p.cv_url,
    },
    appliedAt: (existing as { applied_at: string } | null)?.applied_at ?? null,
  };
}

/**
 * Bots that identify themselves. Not a security control — a scraper can send any
 * user agent it likes — but it removes the large, honest, self-declaring share.
 */
const BOT = /bot|crawler|spider|crawling|slurp|bingpreview|headlesschrome|lighthouse|monitoring|preview/i;

/**
 * Bumps the view counter through the SECURITY DEFINER RPC — an anonymous
 * visitor has no UPDATE on jobs and is not going to be given one.
 *
 * Crawlers are skipped. The Vercel firewall log showed Google alone making 2.3k
 * of 6.6k requests in a day, which means the Views figure an employer reads on
 * their dashboard was substantially Googlebot rather than people. It is still a
 * naive counter — reloads count, and any scraper that lies about its user agent
 * counts — but "mostly search engines" is a different kind of wrong from
 * "counts reloads", and this removes the bigger half.
 *
 * Errors are swallowed on purpose. This is a vanity number on an employer's
 * dashboard; nothing about the page depends on it.
 *
 * Runs inside next/server's `after()`, not awaited into the render — a
 * failed or slow counter must never cost the visitor the listing. The
 * user agent is a parameter rather than read in here with `headers()`
 * because Server Components cannot call request-scoped APIs (`headers`,
 * `cookies`) from inside an `after()` callback — it throws. The same
 * reason rules out `lib/supabase/server.ts`'s `createClient()`, which
 * reads `cookies()` internally; `increment_job_view` is grantable to
 * `anon` specifically so this never needed a session, so a plain
 * anon-key client sidesteps the problem rather than working around it.
 */
async function recordView(jobId: string, userAgent: string): Promise<void> {
  if (!userAgent || BOT.test(userAgent)) return;
  try {
    const supabase = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.rpc("increment_job_view", { job: jobId });
  } catch {
    // Intentionally ignored.
  }
}

/**
 * Three related roles in one query using an `or` filter.
 *
 * Previously fired up to 2 sequential DB calls: one for category, then if
 * that came back empty, a second for location. Now fetches up to 6 candidates
 * (3 by category + 3 by location) in a single round-trip and picks the best 3
 * — category matches are preferred by sorting them first.
 */
async function getRelated(job: Job): Promise<Job[]> {
  if (!job.category_id && !job.location_id) return [];

  const supabase = await createClient();

  const filters: string[] = [];
  if (job.category_id) filters.push(`category_id.eq.${job.category_id}`);
  if (job.location_id) filters.push(`location_id.eq.${job.location_id}`);

  const { data } = await supabase
    .from("jobs")
    .select(SELECT)
    .eq("status", "published")
    .neq("id", job.id)
    .or(filters.join(","))
    .order("created_at", { ascending: false })
    .limit(6);

  if (!data?.length) return [];

  // Prefer category matches; fill remaining slots with location matches.
  const byCategory = (data as unknown as Job[]).filter(
    (j) => j.category_id === job.category_id
  );
  if (byCategory.length >= 3) return byCategory.slice(0, 3);

  const byLocation = (data as unknown as Job[]).filter(
    (j) => j.category_id !== job.category_id
  );
  return [...byCategory, ...byLocation].slice(0, 3);
}

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  // The apply action redirects back here with one or the other. A guest has no
  // session and no dashboard, so this is the only place their submission can be
  // confirmed.
  searchParams: Promise<{ applied?: string; apply_error?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const job = await getJob(slug);
  if (!job) notFound();

  const [{ viewer, appliedAt }, related] = await Promise.all([
    getViewerContext(job.id),
    getRelated(job),
  ]);

  // The Views figure on the employer's My Jobs page. Fire-and-forget, and
  // scheduled with `after()` rather than awaited into the render: a failed or
  // slow counter must never cost the visitor the listing, and previously it
  // did block the response despite this comment always having said otherwise.
  // It counts reloads and crawlers, which is why the employer's column
  // carries a tooltip saying so (migration 017).
  const userAgent = (await headers()).get("user-agent") ?? "";
  after(() => recordView(job.id, userAgent));

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors duration-150 ease-out hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {jobCopy.allRoles}
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="clay p-6 md:p-8">
          <JobDetail job={job} />
        </div>

        {/* Sticky apply panel. No company block — the employer is admin-only. */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="clay p-6">
            <h2 className="font-display text-lg font-600 text-ink">
              {jobCopy.apply}
            </h2>
            <p className="mb-5 mt-1 text-sm text-muted">
              {viewer
                ? viewer.role === "seeker"
                  ? "Your details are filled in from your profile."
                  : "Viewing as staff."
                : gate.noAccountNeeded}
            </p>

            <ApplyForm
              slug={job.slug}
              jobTitle={job.title}
              viewer={viewer}
              appliedAt={appliedAt}
              justApplied={query.applied === "1"}
              error={query.apply_error}
            />

            <div className="mt-5 space-y-2 border-t border-line pt-5">
              <ShareButton title={job.title} />
              <a
                href={`mailto:it@pac.africa?subject=${encodeURIComponent(
                  `Report listing: ${job.title}`
                )}&body=${encodeURIComponent(`Listing: /jobs/${job.slug}\n\nWhat is wrong:`)}`}
                className="btn-ghost w-full text-xs"
              >
                <Flag className="h-3.5 w-3.5" aria-hidden />
                {jobCopy.report}
              </a>
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-5 font-display text-xl font-600 tracking-tight text-ink">
            {jobCopy.related}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((row) => (
              <JobCard
                key={row.id}
                job={row}
                showSave={Boolean(viewer)}
                returnTo={`/jobs/${job.slug}`}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

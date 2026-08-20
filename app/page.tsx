import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { postJobHref } from "@/lib/auth";
import { JobCard } from "@/components/job-card";
import { Reveal } from "@/components/reveal";
import { home } from "@/lib/content";
import type { Job, UserRole } from "@/types/database";

/** Brief §3: show 8–12 and link out. No infinite scroll here. */
const FEED_SIZE = 10;

// No company join. The employer behind a role is admin-only, so the public
// surfaces do not fetch it at all — not fetching is a stronger guarantee than
// fetching and choosing not to render.
const SELECT = `
  *,
  category:job_categories(*),
  location:job_locations(*)
`;

/**
 * Homepage.
 *
 * Hero is headline, one line, two clay pills. No stat bar and no numbers — the
 * counts were removed on request, and the brief asks for confidence through
 * restraint. The ambient background in the root layout is doing the visual work.
 *
 * The job feed starts immediately below. No "how it works" band: the brief is
 * explicit that the jobs are the proof.
 */
export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: jobs }, roleRow, savedRow] = await Promise.all([
    supabase
      .from("jobs")
      .select(SELECT)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(FEED_SIZE),
    user
      ? supabase.from("profiles").select("role").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
    // RLS keeps this to the caller's own bookmarks.
    user
      ? supabase.from("saved_jobs").select("job_id")
      : Promise.resolve({ data: null }),
  ]);

  const role = (roleRow?.data?.role as UserRole | undefined) ?? null;
  const rows = (jobs as unknown as Job[]) ?? [];
  const savedIds = new Set(
    ((savedRow?.data as { job_id: string }[] | null) ?? []).map((s) => s.job_id)
  );

  return (
    <>
      {/* HERO ------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 pb-14 pt-20 md:pt-28">
        <Reveal>
          <h1 className="max-w-3xl font-display text-4xl font-700 leading-[1.06] tracking-display text-ink md:text-6xl">
            {home.headline}
          </h1>
        </Reveal>

        <Reveal delay={0.08}>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted md:text-base">
            {home.sub}
          </p>
        </Reveal>

        <Reveal delay={0.16}>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/jobs" className="btn-accent px-6 py-3">
              {home.browseCta}
            </Link>
            <Link href={postJobHref(role)} className="btn-primary px-6 py-3">
              {home.postCta}
            </Link>
          </div>
        </Reveal>
      </section>

      {/* FEED ------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 pb-8">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl font-600 tracking-tight text-ink">
            {home.latest}
          </h2>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-sm text-accent-text transition-opacity duration-150 hover:opacity-75"
          >
            {home.viewAll}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="clay p-10 text-center md:p-16">
            <p className="font-display text-lg font-600 text-ink">
              {home.emptyTitle}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              {home.emptyBody}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href={postJobHref(role)} className="btn-primary">
                {home.postCta}
              </Link>
              <Link href="/jobs" className="btn-ghost">
                {home.browseCta}
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((row, i) => (
              <Reveal key={row.id} delay={Math.min(i * 0.04, 0.24)}>
                <JobCard
                  job={row}
                  saved={savedIds.has(row.id)}
                  showSave={Boolean(user)}
                  returnTo="/"
                />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

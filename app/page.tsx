import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { postJobHref } from "@/lib/auth";
import { JobCard } from "@/components/job-card";
import { Reveal } from "@/components/reveal";
import { Meteors } from "@/components/meteors";
import { Globe } from "@/components/globe";
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
 * The hero leads with search rather than only the two pills the brief describes.
 * A job board homepage that a stranger lands on cold and cannot search from is a
 * dead end — the pills stay, underneath, as secondary. Still no stat bar and no
 * numbers: the counts were deliberately removed and confidence comes from the
 * copy instead.
 *
 * The ambient mesh in the root layout carries the visual weight, which is why
 * there is no hero image.
 */
export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: jobs }, { data: locations }, roleRow, savedRow, { data: popular }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select(SELECT)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(FEED_SIZE),
      supabase.from("job_locations").select("id, name").order("name").limit(200),
      user
        ? supabase.from("profiles").select("role").eq("id", user.id).single()
        : Promise.resolve({ data: null }),
      user ? supabase.from("saved_jobs").select("job_id") : Promise.resolve({ data: null }),
      // Categories that actually have live roles behind them — a chip that
      // leads to an empty result set is worse than no chip.
      supabase
        .from("jobs")
        .select("category_id, category:job_categories(id, name)")
        .eq("status", "published")
        .not("category_id", "is", null)
        .limit(200),
    ]);

  const role = (roleRow?.data?.role as UserRole | undefined) ?? null;
  const rows = (jobs as unknown as Job[]) ?? [];
  const savedIds = new Set(
    ((savedRow?.data as { job_id: string }[] | null) ?? []).map((s) => s.job_id)
  );

  // Count live roles per category, keep the busiest six.
  const counts = new Map<string, { id: string; name: string; n: number }>();
  for (const row of (popular as unknown as { category: { id: string; name: string } | null }[]) ??
    []) {
    if (!row.category) continue;
    const seen = counts.get(row.category.id);
    counts.set(row.category.id, {
      id: row.category.id,
      name: row.category.name,
      n: (seen?.n ?? 0) + 1,
    });
  }
  const topCategories = [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 6);

  return (
    <>
      {/* HERO — hero216 structure: kicker, large centred headline, meteor
          field, rounded secondary CTA with arrow motion, overscaled globe
          strip below. Built from the described layout rather than the licensed
          block source. */}
      <section className="relative overflow-hidden">
        <Meteors className="opacity-70" />

        <div className="relative mx-auto max-w-4xl px-6 pb-4 pt-20 text-center md:pt-28">
          <Reveal>
            <p className="text-sm text-muted">{home.kicker}</p>
          </Reveal>

          <Reveal delay={0.06}>
            <h1 className="mx-auto mt-6 max-w-3xl font-display text-[2.75rem] font-700 leading-[0.95] tracking-display text-ink sm:text-6xl lg:text-7xl">
              <span className="block text-accent-text">{home.headlineLead}</span>
              <span className="block">{home.headlineMid}</span>
              <span className="block">{home.headlineTail}</span>
            </h1>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="mx-auto mt-7 max-w-xl text-[15px] leading-relaxed text-muted md:text-base">
              {home.sub}
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/jobs" className="btn-accent px-7 py-3">
                {home.browseCta}
              </Link>
              {/* Rounded secondary with the arrow nudge, per the reference. */}
              <Link href={postJobHref(role)} className="btn-primary group px-7 py-3">
                {home.postCta}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-safe:animate-nudge motion-safe:group-hover:animate-none"
                  aria-hidden
                />
              </Link>
            </div>
          </Reveal>

          {topCategories.length > 0 && (
            <Reveal delay={0.22}>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                <span className="eyebrow">{home.popular}</span>
                {topCategories.map((c) => (
                  <Link key={c.id} href={`/jobs?category=${c.id}`} className="chip">
                    {c.name}
                  </Link>
                ))}
              </div>
            </Reveal>
          )}
        </div>

        {/* Overscaled globe, cropped at the bottom and faded into the page so
            it dissolves rather than ending on a hard edge.

            The frame is tall enough to show past the sphere's widest point, so
            it reads as a whole planet rising rather than a shallow arc, and it
            is pulled up under the copy — a gap between the two made the globe
            look like a separate band of the page. */}
        <div className="relative mx-auto -mt-6 h-[350px] max-w-[1060px] overflow-hidden sm:-mt-8 sm:h-[450px] md:h-[530px]">
          <div className="absolute left-1/2 top-0 w-[600px] -translate-x-1/2 sm:w-[800px] md:w-[980px]">
            <Globe />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-bg to-transparent"
          />
        </div>

        {/* Trust, stated rather than counted. */}
        <div className="mx-auto max-w-4xl px-6">
          <Reveal>
            <ul className="grid gap-3 border-t border-line pt-8 sm:grid-cols-3">
              {home.trust.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-muted">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-accent-text"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* FEED ------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 pb-8">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl font-600 tracking-tight text-ink">
            {home.latest}
          </h2>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-sm text-accent-text transition-opacity duration-150 hover:opacity-70"
          >
            {home.viewAll}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="clay p-10 text-center md:p-16">
            <p className="font-display text-lg font-600 text-ink">{home.emptyTitle}</p>
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

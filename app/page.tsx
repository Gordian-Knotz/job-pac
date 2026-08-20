import Link from "next/link";
import { ArrowRight, Search, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { postJobHref } from "@/lib/auth";
import { JobCard } from "@/components/job-card";
import { Reveal } from "@/components/reveal";
import { home } from "@/lib/content";
import type { Job, JobLocation, UserRole } from "@/types/database";

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
      {/* HERO ------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 md:pb-24 md:pt-24">
        <Reveal>
          <span className="eyebrow">{home.eyebrow}</span>
        </Reveal>

        <Reveal delay={0.06}>
          <h1 className="mt-4 max-w-4xl font-display text-[2.5rem] font-700 leading-[0.98] tracking-display text-ink sm:text-6xl lg:text-7xl">
            <span className="text-accent-text">{home.headlineLead}</span>{" "}
            {home.headlineRest}
          </h1>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted md:text-base">
            {home.sub}
          </p>
        </Reveal>

        {/* Search is the primary action. One clay slab so it reads as a single
            control rather than three loose inputs. */}
        <Reveal delay={0.18}>
          <form
            action="/jobs"
            className="clay mt-9 flex max-w-3xl flex-col gap-2 p-2 sm:flex-row sm:items-center"
          >
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
                aria-hidden
              />
              <label htmlFor="hero-q" className="sr-only">
                {home.searchWhat}
              </label>
              <input
                id="hero-q"
                name="q"
                placeholder={home.searchWhat}
                className="w-full bg-transparent py-3 pl-10 pr-3 text-sm text-ink outline-none placeholder:text-faint"
              />
            </div>

            <span className="hidden h-7 w-px bg-line sm:block" aria-hidden />

            <div className="sm:w-52">
              <label htmlFor="hero-location" className="sr-only">
                {home.searchWhere}
              </label>
              <select
                id="hero-location"
                name="location"
                defaultValue=""
                className="w-full bg-transparent px-3 py-3 text-sm text-ink outline-none"
              >
                <option value="">{home.searchWhere}</option>
                {((locations as Pick<JobLocation, "id" | "name">[]) ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn-accent shrink-0 px-6 py-3">
              {home.searchCta}
            </button>
          </form>
        </Reveal>

        {topCategories.length > 0 && (
          <Reveal delay={0.22}>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="eyebrow">{home.popular}</span>
              {topCategories.map((c) => (
                <Link key={c.id} href={`/jobs?category=${c.id}`} className="chip">
                  {c.name}
                </Link>
              ))}
            </div>
          </Reveal>
        )}

        <Reveal delay={0.26}>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1.5 text-sm text-ink transition-opacity duration-150 hover:opacity-70"
            >
              {home.browseCta}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <span className="h-4 w-px bg-line" aria-hidden />
            <Link
              href={postJobHref(role)}
              className="inline-flex items-center gap-1.5 text-sm text-accent-text transition-opacity duration-150 hover:opacity-70"
            >
              {home.postCta}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </Reveal>

        {/* Trust, stated rather than counted. */}
        <Reveal delay={0.32}>
          <ul className="mt-12 grid gap-3 border-t border-line pt-8 sm:grid-cols-3">
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

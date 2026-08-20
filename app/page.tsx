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

  // The seeker CTA's twin of postJobHref: signup for a stranger, the listings
  // for someone already signed in. `next` is a fixed literal, so there is no
  // open-redirect surface here.
  const seekerHref = role ? "/jobs" : "/auth/signup?next=/jobs";

  return (
    <>
      {/* HERO — hero216 structure: large centred headline, meteor field,
          rounded secondary CTA with arrow motion, and an overscaled globe that
          sits behind the copy rather than below it. Built from the described
          layout rather than the licensed block source. */}
      <section className="relative overflow-hidden">
        <Meteors className="opacity-70" />

        <div className="relative z-[1] mx-auto max-w-4xl px-6 pt-20 text-center md:pt-28">
          <Reveal>
            <h1 className="mx-auto max-w-3xl font-display text-[2.75rem] font-700 leading-[0.95] tracking-display text-ink sm:text-6xl lg:text-7xl">
              <span className="block text-accent-text">{home.headlineLead}</span>
              <span className="block">{home.headlineMid}</span>
              <span className="block">{home.headlineTail}</span>
            </h1>
          </Reveal>

          <Reveal delay={0.06}>
            <p className="mx-auto mt-7 max-w-xl text-[15px] leading-relaxed text-muted md:text-base">
              {home.sub}
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              {/* Both sides of the marketplace, named for what each visitor
                  wants. A signed-out visitor goes to signup carrying where they
                  were headed; a signed-in one skips it and lands on the page
                  that is actually useful to them. */}
              <Link href={seekerHref} className="btn-accent px-7 py-3">
                {home.seekerCta}
              </Link>
              {/* Rounded secondary with the arrow nudge, per the reference. */}
              <Link href={postJobHref(role)} className="btn-primary group px-7 py-3">
                {home.employerCta}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-safe:animate-nudge motion-safe:group-hover:animate-none"
                  aria-hidden
                />
              </Link>
            </div>
          </Reveal>

          {topCategories.length > 0 && (
            <Reveal delay={0.18}>
              {/* This row now sits over the globe, so the bare eyebrow was
                  unreadable against the dot field. The whole row gets a
                  translucent backing rather than the label alone — a single
                  floating strip reads as deliberate, one patched word does not.
                  `.translucent` opts it into the reduced-transparency override
                  in globals.css. */}
              <div className="mt-7 flex justify-center">
                <div className="translucent flex flex-wrap items-center justify-center gap-2 rounded-pill bg-bg/65 px-3 py-2 backdrop-blur-md">
                  <span className="eyebrow">{home.popular}</span>
                  {topCategories.map((c) => (
                    <Link key={c.id} href={`/jobs?category=${c.id}`} className="chip">
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            </Reveal>
          )}
        </div>

        {/* Overscaled globe, cropped at the bottom and faded into the page so it
            dissolves rather than ending on a hard edge.

            It now sits BEHIND the copy rather than under it: the negative margin
            pulls the frame up past the CTA row, and the copy block above carries
            z-[1] so the headline stays on top. Two knobs, because they do
            different things — the margin moves the whole frame up the page, and
            the canvas offset moves the sphere up within that frame, which is
            what closes the dead space cobe leaves above the visible arc.

            The popular-categories row ends up over the dot field, which is why
            it has a translucent backing. */}
        {/* Full-bleed, not max-width. The frame used to be capped at 1060px,
            which was invisible until the scrim below was added — a gradient to
            the page colour inside a narrower box drew its own rectangle against
            the ambient mesh, side edges and all. The globe itself is unaffected:
            the canvas has fixed widths and is centred on the frame. */}
        <div className="relative -mt-[13rem] h-[420px] overflow-hidden sm:-mt-[15rem] sm:h-[520px] md:-mt-[17rem] md:h-[600px]">
          <div className="absolute left-1/2 top-[-70px] w-[600px] -translate-x-1/2 sm:top-[-85px] sm:w-[800px] md:top-[-100px] md:w-[980px]">
            <Globe />
          </div>
          {/* Top scrim. Raising the globe this far put the dot field directly
              behind the sub-paragraph, and muted grey body text over a dotted
              sphere is not readable. Dimming the sphere where the text sits — a
              gradient back to the page colour, strongest at the top and gone by
              the time it reaches Africa — keeps the globe high AND the sentence
              legible. The alternative was pushing the globe back down, which is
              the thing being asked for in reverse. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-bg via-bg/75 to-transparent md:h-72"
          />
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

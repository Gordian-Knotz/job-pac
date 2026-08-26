import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { postJobHref } from "@/lib/auth";
import { JobCard } from "@/components/job-card";
import { Reveal } from "@/components/reveal";
import { Meteors } from "@/components/meteors";
import { home } from "@/lib/content";
import type { Job, UserRole } from "@/types/database";
import type { Metadata } from "next";

// Previously absent — the homepage inherited the root layout's generic
// "Jobs | PAC Africa" title/description verbatim. This is the one page every
// new visitor and every search result lands on first.
export const metadata: Metadata = {
  title: "Pan African Jobs",
  description:
    "Browse vetted roles from employers across Kenya and East Africa, or post a job and reach candidates PAC Africa has already screened.",
};

export const revalidate = 120;

/**
 * Code-split out of the homepage's critical bundle. cobe's dot-map
 * generation is measured (Lighthouse, 4x CPU throttle) as multiple seconds
 * of blocking main-thread work — fine once deferred to idle time inside
 * Globe itself (see components/globe.tsx), but no reason for its ~46 kB to
 * even download and parse before the rest of the hero is interactive.
 * `ssr: false` is not available here — this is a Server Component, and
 * Next 15 only allows that option from a Client Component. Not needed
 * anyway: Globe's own effect never runs on the server, so SSR just emits an
 * inert `<canvas>` placeholder, which is exactly what the loading state
 * below would have been regardless.
 */
const Globe = dynamic(() => import("@/components/globe").then((m) => m.Globe), {
  loading: () => <div className="aspect-square w-full rounded-full" aria-hidden />,
});

/** Brief §3: show 8–12 and link out. No infinite scroll here. */
const FEED_SIZE = 10;

// No company join. The employer behind a role is admin-only, so the public
// surfaces do not fetch it at all — not fetching is a stronger guarantee than
// fetching and choosing not to render.
const SELECT = `
  *,
  category:job_categories!category_id(*),
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

  const [{ data: jobs }, roleRow, savedRow, { data: popular }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select(SELECT)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(FEED_SIZE),
      user
        ? supabase.from("profiles").select("role").eq("id", user.id).single()
        : Promise.resolve({ data: null }),
      user ? supabase.from("saved_jobs").select("job_id") : Promise.resolve({ data: null }),
      // Top 6 categories with live roles — GROUP BY in the DB, not in JS.
      // Previously fetched 200 job rows and counted in JS; this fetches 6 rows.
      // Cast to any: top_job_categories is defined in migration 027 but not
      // yet in the generated types/database.ts — the RPC exists in the DB.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).rpc("top_job_categories", { limit_n: 6 }),
    ]);

  const role = (roleRow?.data?.role as UserRole | undefined) ?? null;
  const rows = (jobs as unknown as Job[]) ?? [];
  const savedIds = new Set(
    ((savedRow?.data as { job_id: string }[] | null) ?? []).map((s) => s.job_id)
  );

  const topCategories = (
    (popular?.data as { id: string; name: string }[] | null) ?? []
  );

  // The seeker CTA's twin of postJobHref: signup for a stranger, the listings
  // for someone already signed in. `next` is a fixed literal, so there is no
  // open-redirect surface here.
  const seekerHref = role ? "/jobs" : "/auth/signup?next=/jobs";

  return (
    <>
      {/* HERO — side by side: copy on the left, the globe standing on its own
          to the right, rather than the globe rising cropped beneath the copy.
          Stacks on mobile, copy first, since the globe is decoration and the
          CTAs are not. */}
      <section className="relative overflow-hidden">
        <Meteors className="opacity-70" />

        <div className="relative z-[1] mx-auto max-w-6xl px-6 pt-28 pb-4 md:pt-40">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-12">
            {/* COPY */}
            <div className="text-center lg:text-left">
              <Reveal>
                <h1 className="mx-auto max-w-xl font-display text-[2.75rem] font-700 leading-[0.95] tracking-display text-ink sm:text-6xl lg:mx-0 lg:text-6xl xl:text-7xl">
                  <span className="block text-accent-text">{home.headlineLead}</span>
                  <span className="block">{home.headlineMid}</span>
                  <span className="block">{home.headlineTail}</span>
                </h1>
              </Reveal>

              <Reveal delay={0.06}>
                <p className="mx-auto mt-7 max-w-xl text-[15px] leading-relaxed text-muted md:text-base lg:mx-0">
                  {home.sub}
                </p>
              </Reveal>

              <Reveal delay={0.12}>
                <div className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
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
                  {/* Plain eyebrow + chips again now that this row sits beside the
                      copy rather than over the globe's dot field — the translucent
                      backing existed only to solve legibility against that
                      backdrop, which no longer applies here. */}
                  <div className="mt-7 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
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

            {/* GLOBE — the full sphere now, not the cropped-and-faded arc the
                stacked layout needed. cobe leaves the canvas transparent outside
                the sphere and its baseColor is matched to --bg in both themes
                (see components/globe.tsx), so it sits cleanly on the page without
                needing a frame, an overflow crop, or a fade to hide an edge. */}
            <Reveal delay={0.1}>
              <div className="mx-auto w-full max-w-[340px] sm:max-w-[440px] lg:max-w-none lg:w-[112%]">
                <Globe />
              </div>
            </Reveal>
          </div>
        </div>

        {/* Trust, stated rather than counted. */}
        <div className="mx-auto max-w-6xl px-6 pb-16">
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

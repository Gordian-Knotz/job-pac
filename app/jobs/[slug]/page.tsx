import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Flag } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { JobDetail } from "@/components/job-detail";
import { JobCard } from "@/components/job-card";
import { ApplyForm, type ApplyViewer } from "@/components/apply-form";
import { ShareButton } from "@/components/share-button";
import { job as jobCopy, gate } from "@/lib/content";
import type { Job, Profile } from "@/types/database";

const SELECT = `
  *,
  category:job_categories(*),
  location:job_locations(*)
`;

async function getJob(slug: string): Promise<Job | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select(SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return (data as unknown as Job) ?? null;
}

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

/** Three more roles in the same category, or failing that the same location. */
async function getRelated(job: Job): Promise<Job[]> {
  const supabase = await createClient();
  const base = supabase
    .from("jobs")
    .select(SELECT)
    .eq("status", "published")
    .neq("id", job.id)
    .order("created_at", { ascending: false })
    .limit(3);

  if (job.category_id) {
    const { data } = await base.eq("category_id", job.category_id);
    if (data?.length) return data as unknown as Job[];
  }
  if (job.location_id) {
    const { data } = await supabase
      .from("jobs")
      .select(SELECT)
      .eq("status", "published")
      .neq("id", job.id)
      .eq("location_id", job.location_id)
      .order("created_at", { ascending: false })
      .limit(3);
    if (data?.length) return data as unknown as Job[];
  }
  return [];
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) notFound();

  const [{ viewer, appliedAt }, related] = await Promise.all([
    getViewerContext(job.id),
    getRelated(job),
  ]);

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
              jobId={job.id}
              jobTitle={job.title}
              viewer={viewer}
              appliedAt={appliedAt}
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

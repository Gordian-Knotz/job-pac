import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JobDetail } from "@/components/job-detail";
import { ApplyForm, type ApplyViewer } from "@/components/apply-form";
import { formatSalary } from "@/lib/utils";
import type { Job, Profile } from "@/types/database";
import type { Metadata } from "next";

async function getJob(slug: string): Promise<Job | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(
      `*, company:companies(*), category:job_categories(*), location:job_locations(*)`
    )
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !data) return null;
  return data as unknown as Job;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) return { title: "Role not found | PAC Jobs" };

  return {
    title: `${job.title} at ${job.company?.name ?? "PAC Africa"} | PAC Jobs`,
    description: `${job.title} — ${job.location?.name ?? "Kenya"}. ${formatSalary(
      job.salary_min,
      job.salary_max,
      job.salary_currency
    )}.`,
  };
}

/**
 * Who is looking at this listing, and have they already applied?
 *
 * Without this the apply card shows a blank name/email form to someone who is
 * signed in — asking for details we already hold, and filing the application
 * with applicant_id NULL so it never appears in their dashboard.
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
    // RLS limits this to the caller's own applications.
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

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) notFound();

  const { viewer, appliedAt } = await getViewerContext(job.id);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-pac-muted hover:text-pac-orange-dark transition-colors duration-150 ease-out"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        All roles
      </Link>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-10 mt-5">
        <JobDetail job={job} />

        {/* The apply card is the one thing on this page that must never scroll
            out of reach, so it is the only sticky element. */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-card border border-pac-line bg-white p-6 shadow-raised relative overflow-hidden">
            <span
              aria-hidden
              className="absolute left-0 top-0 bottom-0 w-[3px] bg-pac-orange"
            />
            <h2 className="font-display text-lg font-600 text-pac-ink mb-1">
              Apply for this role
            </h2>
            <p className="text-sm text-pac-muted mb-5">
              {viewer
                ? viewer.role === "seeker"
                  ? "Your details are filled in from your profile."
                  : "Viewing as staff."
                : "You do not need an account. Attach a CV if you have one ready."}
            </p>
            <ApplyForm
              jobId={job.id}
              jobTitle={job.title}
              viewer={viewer}
              appliedAt={appliedAt}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

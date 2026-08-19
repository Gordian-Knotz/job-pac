import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JobDetail } from "@/components/job-detail";
import { ApplyForm } from "@/components/apply-form";
import { formatSalary } from "@/lib/utils";
import type { Job } from "@/types/database";
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

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) notFound();

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
              You do not need an account. Attach a CV if you have one ready.
            </p>
            <ApplyForm jobId={job.id} jobTitle={job.title} />
          </div>
        </aside>
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { Job } from "@/types/database";
import { notFound } from "next/navigation";
import { MapPin, Clock, Briefcase, BadgeCheck } from "lucide-react";
import { formatSalary, JOB_TYPE_LABELS, timeAgo } from "@/lib/utils";
import { ApplyForm } from "@/components/apply-form";

export const revalidate = 60;

async function getJob(slug: string): Promise<Job | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(`
      *,
      company:companies(*),
      category:job_categories(*),
      location:job_locations(*)
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !data) return null;
  return data as unknown as Job;
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
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="grid lg:grid-cols-[1fr_320px] gap-12">
        {/* MAIN CONTENT */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="eyebrow">{job.category?.name ?? "General"}</span>
            {job.company?.verified && (
              <span className="flex items-center gap-1 text-xs text-pac-orange font-medium">
                <BadgeCheck className="w-3.5 h-3.5" /> Verified employer
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl md:text-4xl font-700 text-pac-ink leading-tight">
            {job.title}
          </h1>
          <p className="text-pac-muted mt-2 text-[15px]">
            {job.company?.name ?? "Confidential Employer"}
          </p>

          <div className="flex flex-wrap gap-5 mt-6 text-sm text-pac-muted border-y border-pac-line py-4">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {job.location?.name ?? job.location_text ?? "Nairobi"}
            </span>
            <span className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Posted {timeAgo(job.created_at)}
            </span>
          </div>

          <div className="mt-8 space-y-6">
            <section>
              <h2 className="eyebrow mb-3">About the role</h2>
              <div
                className="prose prose-sm max-w-none text-pac-ink/90 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: job.description }}
              />
            </section>

            {job.requirements && (
              <section>
                <h2 className="eyebrow mb-3">Requirements</h2>
                <div
                  className="prose prose-sm max-w-none text-pac-ink/90 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: job.requirements }}
                />
              </section>
            )}

            {job.benefits && (
              <section>
                <h2 className="eyebrow mb-3">Benefits</h2>
                <div
                  className="prose prose-sm max-w-none text-pac-ink/90 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: job.benefits }}
                />
              </section>
            )}
          </div>
        </div>

        {/* SIDEBAR — apply card */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-card border border-pac-line bg-white p-6 shadow-stamp relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-pac-orange" />
            <p className="eyebrow mb-1">Compensation</p>
            <p className="font-display text-lg font-600 text-pac-ink mb-6">
              {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
            </p>

            <ApplyForm jobId={job.id} jobTitle={job.title} />
          </div>
        </aside>
      </div>
    </div>
  );
}

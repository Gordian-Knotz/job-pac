import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email";
import { applicationStatusLabels, site } from "@/lib/content";
import type { ApplicationStatus } from "@/types/database";

/**
 * Looks up who to notify for a job — the profile that posted it, falling
 * back to the owning company's profile. Always through the admin client:
 * `companies` and `profiles.email` aren't world-readable (migration 016),
 * and the caller here is sometimes a guest applicant's request with no
 * standing to read either.
 */
async function employerEmailForJob(jobId: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data: job } = await admin
    .from("jobs")
    .select("posted_by, company_id")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return null;
  const row = job as { posted_by: string | null; company_id: string | null };

  if (row.posted_by) {
    const { data: p } = await admin
      .from("profiles")
      .select("email")
      .eq("id", row.posted_by)
      .maybeSingle();
    if ((p as { email: string } | null)?.email) return (p as { email: string }).email;
  }

  if (row.company_id) {
    const { data: c } = await admin
      .from("companies")
      .select("owner_id")
      .eq("id", row.company_id)
      .maybeSingle();
    const ownerId = (c as { owner_id: string | null } | null)?.owner_id;
    if (ownerId) {
      const { data: p } = await admin
        .from("profiles")
        .select("email")
        .eq("id", ownerId)
        .maybeSingle();
      if ((p as { email: string } | null)?.email) return (p as { email: string }).email;
    }
  }

  return null;
}

const link = (path: string) => `https://${site.domain}${path}`;

/** Trigger 1 — a new application landed on the employer's job. */
export async function notifyApplicationReceived(
  jobId: string,
  jobTitle: string,
  applicantName: string
): Promise<void> {
  const to = await employerEmailForJob(jobId);
  if (!to) return;

  const url = link("/dashboard/employer/applications");
  await sendMail({
    to,
    subject: `New application: ${jobTitle}`,
    text: `${applicantName} just applied to ${jobTitle}.\n\nReview it: ${url}`,
    html: `<p>${applicantName} just applied to <strong>${jobTitle}</strong>.</p><p><a href="${url}">Review the application</a></p>`,
  });
}

/** Trigger 2 — a listing was approved or sent back by an admin. */
export async function notifyJobDecision(
  jobId: string,
  jobTitle: string,
  decision: "published" | "rejected",
  reason?: string | null
): Promise<void> {
  const to = await employerEmailForJob(jobId);
  if (!to) return;

  const url = link("/dashboard/employer/jobs");
  const subject =
    decision === "published" ? `Your listing is live: ${jobTitle}` : `Changes needed: ${jobTitle}`;
  const body =
    decision === "published"
      ? `${jobTitle} is now live on PAC Africa Jobs.`
      : `${jobTitle} was sent back for changes.${reason ? ` Reason: ${reason}` : ""}`;

  await sendMail({
    to,
    subject,
    text: `${body}\n\nView your listings: ${url}`,
    html: `<p>${body}</p><p><a href="${url}">View your listings</a></p>`,
  });
}

/** Trigger 3 — an employer moved an application to a new stage. */
export async function notifyApplicationStatusChanged(
  applicantEmail: string,
  jobTitle: string,
  status: ApplicationStatus
): Promise<void> {
  // "pending" is the starting state, never a transition worth emailing about.
  if (status === "pending") return;

  const label = applicationStatusLabels[status];
  const url = link("/dashboard/seeker/applications");
  const body = `Your application for ${jobTitle} is now: ${label}.`;

  await sendMail({
    to: applicantEmail,
    subject: `Update on your application: ${jobTitle}`,
    text: `${body}\n\nTrack it: ${url}`,
    html: `<p>${body}</p><p><a href="${url}">Track your application</a></p>`,
  });
}

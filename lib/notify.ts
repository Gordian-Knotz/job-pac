import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email";
import { applicationStatusLabels, site } from "@/lib/content";
import type { ApplicationStatus } from "@/types/database";

type NotifiableProfile = { email: string; notify_email: boolean };

/**
 * Looks up who to notify for a job — the profile that posted it, falling
 * back to the owning company's profile. Always through the admin client:
 * `companies` and `profiles.email` aren't world-readable (migration 016),
 * and the caller here is sometimes a guest applicant's request with no
 * standing to read either. Carries `notify_email` (migration 028) alongside
 * the address so a caller can honour the recipient's own opt-out in one trip.
 */
async function employerProfileForJob(jobId: string): Promise<NotifiableProfile | null> {
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
      .select("email, notify_email")
      .eq("id", row.posted_by)
      .maybeSingle();
    if ((p as NotifiableProfile | null)?.email) return p as NotifiableProfile;
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
        .select("email, notify_email")
        .eq("id", ownerId)
        .maybeSingle();
      if ((p as NotifiableProfile | null)?.email) return p as NotifiableProfile;
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
  const employer = await employerProfileForJob(jobId);
  if (!employer || !employer.notify_email) return;
  const to = employer.email;

  const url = link("/dashboard/employer/applications");
  await sendMail({
    to,
    subject: `New application: ${jobTitle}`,
    text: `${applicantName} just applied to ${jobTitle}.\n\nReview it: ${url}`,
    html: `<p>${applicantName} just applied to <strong>${jobTitle}</strong>.</p><p><a href="${url}">Review the application</a></p>`,
  });
}

/**
 * Trigger 1b — confirmation to the applicant themselves. Only meaningful for a
 * guest: a signed-in applicant already sees the application in their own
 * dashboard. The signup link carries their email so `claim_historical_applications`
 * (migration 006) picks this application up the moment they confirm an account.
 */
export async function notifyApplicantApplicationReceived(
  email: string,
  jobTitle: string
): Promise<void> {
  const url = link(`/auth/signup?email=${encodeURIComponent(email)}`);
  const body = `We've received your application for ${jobTitle}. The employer has been notified.`;

  await sendMail({
    to: email,
    subject: `Application received: ${jobTitle}`,
    text: `${body}\n\nCreate an account to track its status: ${url}`,
    html: `<p>${body}</p><p><a href="${url}">Create an account</a> to track its status.</p>`,
  });
}

/** Trigger 2 — a listing was approved or sent back by an admin. */
export async function notifyJobDecision(
  jobId: string,
  jobTitle: string,
  decision: "published" | "rejected",
  reason?: string | null
): Promise<void> {
  const employer = await employerProfileForJob(jobId);
  if (!employer || !employer.notify_email) return;
  const to = employer.email;

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

/**
 * Trigger 3 — an employer moved an application to a new stage.
 *
 * A guest applicant has no profile row and so no opt-out to honour — this
 * only ever suppresses the email for a registered seeker who turned
 * `notify_email` off, matched by address since the caller doesn't carry
 * `applicant_id` (it isn't needed for anything else it does).
 */
export async function notifyApplicationStatusChanged(
  applicantEmail: string,
  jobTitle: string,
  status: ApplicationStatus
): Promise<void> {
  // "pending" is the starting state, never a transition worth emailing about.
  if (status === "pending") return;

  const admin = createAdminClient();
  const { data: seeker } = await admin
    .from("profiles")
    .select("notify_email")
    .eq("email", applicantEmail)
    .maybeSingle();
  if ((seeker as { notify_email: boolean } | null)?.notify_email === false) return;

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

/**
 * Trigger 4 — a new listing just went live, for every seeker who opted in.
 * Off by default (migration 028): this is the one trigger that can fan out to
 * an entire table rather than one recipient, so it stays opt-in rather than
 * inheriting `notify_email`, which governs the seeker's own application
 * activity, not other people's job postings.
 */
export async function notifyNewJobSubscribers(jobTitle: string): Promise<void> {
  const admin = createAdminClient();
  const { data: subscribers } = await admin
    .from("profiles")
    .select("email")
    .eq("role", "seeker")
    .eq("notify_new_jobs", true);

  const rows = (subscribers as { email: string }[] | null) ?? [];
  if (rows.length === 0) return;

  const url = link("/jobs");
  const body = `A new role just went live: ${jobTitle}.`;

  // Fire-and-forget in parallel — each is its own fail-soft send (lib/email.ts),
  // so one bad address never stops the rest of the batch.
  await Promise.all(
    rows.map((row) =>
      sendMail({
        to: row.email,
        subject: `New job posted: ${jobTitle}`,
        text: `${body}\n\nHave a look: ${url}`,
        html: `<p>${body}</p><p><a href="${url}">Have a look</a></p>`,
      })
    )
  );
}

/**
 * Trigger 5 — a listing entered the review queue, for every admin who wants
 * to know. Defaults on (migration 028): unlike new-job volume, this is low
 * frequency and is the thing an admin's job is to act on.
 */
export async function notifyAdminPendingReview(jobTitle: string): Promise<void> {
  const admin = createAdminClient();
  const { data: admins } = await admin
    .from("profiles")
    .select("email")
    .eq("role", "admin")
    .eq("notify_pending_review", true);

  const rows = (admins as { email: string }[] | null) ?? [];
  if (rows.length === 0) return;

  const url = link("/admin/moderation");
  const body = `${jobTitle} is waiting for review.`;

  await Promise.all(
    rows.map((row) =>
      sendMail({
        to: row.email,
        subject: `Review needed: ${jobTitle}`,
        text: `${body}\n\nReview it: ${url}`,
        html: `<p>${body}</p><p><a href="${url}">Review it</a></p>`,
      })
    )
  );
}

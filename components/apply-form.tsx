"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  CV_ACCEPT,
  CV_BUCKET,
  CV_MAX_BYTES,
  cvObjectPath,
  looksLikePdf,
} from "@/lib/cv";
import type { UserRole } from "@/types/database";

export type ApplyViewer = {
  id: string;
  role: UserRole;
  fullName: string | null;
  email: string;
  phone: string | null;
  /** Object path or legacy URL of the CV on their profile, if any. */
  cvUrl: string | null;
};

export function ApplyForm({
  jobId,
  jobTitle,
  viewer,
  appliedAt,
}: {
  jobId: string;
  jobTitle: string;
  viewer: ApplyViewer | null;
  /** Set when this viewer already has an application on this job. */
  appliedAt?: string | null;
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");
  const [cv, setCv] = useState<File | null>(null);
  // Signed-in applicants with a CV on file default to reusing it — the whole
  // point of having an account is not re-uploading the same document.
  const [reuseCv, setReuseCv] = useState(Boolean(viewer?.cvUrl));
  const [form, setForm] = useState({
    name: viewer?.fullName ?? "",
    email: viewer?.email ?? "",
    phone: viewer?.phone ?? "",
    cover_letter: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const uploading = cv && !(reuseCv && viewer?.cvUrl);
    if (uploading) {
      if (cv!.type !== CV_ACCEPT) {
        setStatus("error");
        setMessage("Your CV needs to be a PDF.");
        return;
      }
      if (cv!.size > CV_MAX_BYTES) {
        setStatus("error");
        setMessage("Your CV needs to be under 5MB.");
        return;
      }
      // The declared content type can say anything — check the actual bytes.
      if (!(await looksLikePdf(cv!))) {
        setStatus("error");
        setMessage("That file is not a PDF, even though it is named like one.");
        return;
      }
    }

    setStatus("submitting");
    const supabase = createClient();

    // Upload first: an application row pointing at a file that failed to upload
    // is worse than no row at all. Guests may upload too — the bucket policy
    // allows anon insert (migration 007).
    let cvPath: string | null = null;
    if (reuseCv && viewer?.cvUrl) {
      // Same bucket, same object — reference it rather than copying bytes.
      cvPath = viewer.cvUrl;
    } else if (cv) {
      const path = cvObjectPath(cv.name);
      const { error: uploadError } = await supabase.storage
        .from(CV_BUCKET)
        .upload(path, cv, { contentType: CV_ACCEPT, upsert: false });

      if (uploadError) {
        setStatus("error");
        setMessage("We couldn't upload your CV. Please try again.");
        return;
      }
      cvPath = path;
    }

    const { error } = await supabase.from("applications").insert({
      job_id: jobId,
      applicant_id: viewer?.id ?? null,
      applicant_name: form.name.trim() || null,
      // A signed-in applicant files under their account address. Identity and
      // the claim-history flow both key on it, so it is not a free-text field.
      applicant_email: viewer?.email ?? form.email,
      applicant_phone: form.phone.trim() || null,
      cover_letter: form.cover_letter.trim() || null,
      cv_url: cvPath,
      wp_job_title: jobTitle,
      status: "pending",
    });

    if (error) {
      setStatus("error");
      setMessage(
        error.code === "23505"
          ? "You have already applied for this role."
          : "Something went wrong. Please try again."
      );
      return;
    }
    setStatus("done");
  }

  // ── Already applied ──────────────────────────────────────────────────
  if (appliedAt && status !== "done") {
    return (
      <div className="text-sm">
        <p className="font-display text-base font-600 text-pac-ink mb-1">
          You have applied for this role
        </p>
        <p className="text-pac-muted">
          Submitted{" "}
          {new Date(appliedAt).toLocaleDateString("en-KE", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          .
        </p>
        <Link
          href="/dashboard/seeker"
          className="btn-secondary w-full mt-4 justify-center"
        >
          Track your applications
        </Link>
      </div>
    );
  }

  // ── Employers and admins do not apply ────────────────────────────────
  if (viewer && viewer.role !== "seeker") {
    return (
      <div className="text-sm">
        <p className="font-display text-base font-600 text-pac-ink mb-1">
          Signed in as {viewer.role === "admin" ? "an administrator" : "an employer"}
        </p>
        <p className="text-pac-muted">
          Applications are for job seekers. This is how the listing looks to one.
        </p>
        <Link
          href={viewer.role === "admin" ? "/admin" : "/dashboard/employer"}
          className="btn-secondary w-full mt-4 justify-center"
        >
          Back to your dashboard
        </Link>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="text-sm">
        <p className="font-display text-base font-600 text-pac-ink mb-1">
          Application sent
        </p>
        <p className="text-pac-muted">
          {viewer
            ? "It is now in your dashboard, and you will hear from us by email if the employer responds."
            : "We'll notify you by email if the employer responds."}
        </p>
        {viewer && (
          <Link
            href="/dashboard/seeker"
            className="btn-secondary w-full mt-4 justify-center"
          >
            Track your applications
          </Link>
        )}
      </div>
    );
  }

  // ── The form ─────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {viewer ? (
        <div className="rounded-card bg-pac-stone px-3 py-2.5">
          <p className="eyebrow mb-0.5">Applying as</p>
          <p className="text-sm text-pac-ink font-medium truncate">
            {viewer.fullName?.trim() || viewer.email}
          </p>
          {viewer.fullName?.trim() && (
            <p className="text-xs text-pac-muted truncate">{viewer.email}</p>
          )}
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="apply-name" className="sr-only">
              Full name
            </label>
            <input
              id="apply-name"
              required
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="apply-email" className="sr-only">
              Email address
            </label>
            <input
              id="apply-email"
              required
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="field"
            />
          </div>
        </>
      )}

      {viewer && !viewer.fullName?.trim() && (
        <div>
          <label htmlFor="apply-name" className="sr-only">
            Full name
          </label>
          <input
            id="apply-name"
            required
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="field"
          />
        </div>
      )}

      <div>
        <label htmlFor="apply-phone" className="sr-only">
          Phone number
        </label>
        <input
          id="apply-phone"
          placeholder="Phone number"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="field"
        />
      </div>

      <div>
        <label htmlFor="apply-cover" className="sr-only">
          Cover letter
        </label>
        <textarea
          id="apply-cover"
          placeholder="Cover letter (optional)"
          rows={4}
          value={form.cover_letter}
          onChange={(e) => setForm({ ...form, cover_letter: e.target.value })}
          className="field resize-none"
        />
      </div>

      {/* CV ---------------------------------------------------------- */}
      {viewer?.cvUrl ? (
        <div className="space-y-2">
          <span className="eyebrow block">CV</span>
          <label className="flex items-start gap-2.5 text-sm text-pac-ink">
            <input
              type="radio"
              name="cv-choice"
              checked={reuseCv}
              onChange={() => setReuseCv(true)}
              className="mt-0.5 accent-pac-orange"
            />
            Use the CV on my profile
          </label>
          <label className="flex items-start gap-2.5 text-sm text-pac-ink">
            <input
              type="radio"
              name="cv-choice"
              checked={!reuseCv}
              onChange={() => setReuseCv(false)}
              className="mt-0.5 accent-pac-orange"
            />
            Attach a different one
          </label>
          {!reuseCv && (
            <input
              type="file"
              accept={CV_ACCEPT}
              onChange={(e) => setCv(e.target.files?.[0] ?? null)}
              className="w-full text-xs text-pac-ink file:mr-3 file:px-3 file:py-1.5 file:rounded-card file:border file:border-pac-line file:bg-pac-stone file:text-pac-ink file:text-xs file:font-medium hover:file:border-pac-orange file:cursor-pointer"
            />
          )}
        </div>
      ) : (
        <div>
          <label htmlFor="apply-cv" className="eyebrow block mb-2">
            CV (PDF, optional)
          </label>
          <input
            id="apply-cv"
            type="file"
            accept={CV_ACCEPT}
            onChange={(e) => setCv(e.target.files?.[0] ?? null)}
            className="w-full text-xs text-pac-ink file:mr-3 file:px-3 file:py-1.5 file:rounded-card file:border file:border-pac-line file:bg-pac-stone file:text-pac-ink file:text-xs file:font-medium hover:file:border-pac-orange file:cursor-pointer"
          />
          {viewer && (
            <p className="text-xs text-pac-muted mt-1.5">
              Adding it to{" "}
              <Link
                href="/dashboard/seeker/profile"
                className="text-pac-orange-dark hover:underline"
              >
                your profile
              </Link>{" "}
              means you will not have to attach it next time.
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="btn-primary w-full"
      >
        {status === "submitting" ? "Sending…" : "Apply now"}
      </button>

      {status === "error" && (
        <p className="text-xs text-red-600">
          {message || "Something went wrong. Please try again."}
        </p>
      )}

      {!viewer && (
        <p className="text-xs text-pac-muted text-center">
          Have an account?{" "}
          <Link href="/auth/login" className="text-pac-orange-dark hover:underline">
            Sign in
          </Link>{" "}
          to apply faster and track it.
        </p>
      )}
    </form>
  );
}

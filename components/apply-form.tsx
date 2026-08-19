"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CV_ACCEPT,
  CV_BUCKET,
  CV_MAX_BYTES,
  cvObjectPath,
} from "@/lib/supabase/storage";

export function ApplyForm({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [cv, setCv] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cover_letter: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (cv) {
      if (cv.type !== CV_ACCEPT) {
        setStatus("error");
        setMessage("Your CV needs to be a PDF.");
        return;
      }
      if (cv.size > CV_MAX_BYTES) {
        setStatus("error");
        setMessage("Your CV needs to be under 5MB.");
        return;
      }
    }

    setStatus("submitting");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Upload first: an application row pointing at a file that failed to
    // upload is worse than no row at all. Guests may upload too — the bucket
    // policy allows anon insert (migration 007).
    let cvPath: string | null = null;
    if (cv) {
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
      applicant_id: user?.id ?? null,
      applicant_name: form.name,
      applicant_email: form.email,
      applicant_phone: form.phone,
      cover_letter: form.cover_letter,
      cv_url: cvPath,
      wp_job_title: jobTitle,
      status: "pending",
    });

    if (error) {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
      return;
    }
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="text-sm">
        <p className="font-display text-base font-600 text-pac-ink mb-1">
          Application sent
        </p>
        <p className="text-pac-muted">
          We&apos;ll notify you by email if the employer responds.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        required
        placeholder="Full name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="w-full px-3 py-2.5 rounded-card border border-pac-line text-sm focus:border-pac-orange outline-none"
      />
      <input
        required
        type="email"
        placeholder="Email address"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className="w-full px-3 py-2.5 rounded-card border border-pac-line text-sm focus:border-pac-orange outline-none"
      />
      <input
        placeholder="Phone number"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        className="w-full px-3 py-2.5 rounded-card border border-pac-line text-sm focus:border-pac-orange outline-none"
      />
      <textarea
        placeholder="Cover letter (optional)"
        rows={4}
        value={form.cover_letter}
        onChange={(e) => setForm({ ...form, cover_letter: e.target.value })}
        className="w-full px-3 py-2.5 rounded-card border border-pac-line text-sm focus:border-pac-orange outline-none resize-none"
      />

      <div>
        <label htmlFor="cv" className="eyebrow block mb-2">
          CV (PDF, optional)
        </label>
        <input
          id="cv"
          type="file"
          accept={CV_ACCEPT}
          onChange={(e) => setCv(e.target.files?.[0] ?? null)}
          className="w-full text-xs text-pac-ink file:mr-3 file:px-3 file:py-1.5 file:rounded-card file:border file:border-pac-line file:bg-pac-stone file:text-pac-ink file:text-xs file:font-medium hover:file:border-pac-orange file:cursor-pointer"
        />
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full bg-pac-orange text-white py-2.5 rounded-card text-sm font-medium hover:bg-pac-orange-dark transition-colors disabled:opacity-60"
      >
        {status === "submitting" ? "Submitting…" : "Apply now"}
      </button>

      {status === "error" && (
        <p className="text-xs text-red-600">
          {message || "Something went wrong. Please try again."}
        </p>
      )}
    </form>
  );
}

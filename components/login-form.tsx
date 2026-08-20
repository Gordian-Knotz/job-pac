"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // /dashboard routes by role, so it is the right default: an employer signing
  // in should not land on the seeker dashboard and be bounced.
  const next = safeNextPath(params.get("next"), "/dashboard");

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(form);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <div className="clay p-8">
        <span className="eyebrow">Welcome back</span>
        <h1 className="mt-2 mb-8 font-display text-3xl font-700 tracking-display text-ink">
          Sign in
        </h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            type="email"
            aria-label="Email address"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="field"
          />
          <input
            required
            type="password"
            aria-label="Password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="field"
          />

          <button type="submit" disabled={loading} className="btn-accent w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>

        <p className="mt-6 text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link
            href={`/auth/signup${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="text-accent-text hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

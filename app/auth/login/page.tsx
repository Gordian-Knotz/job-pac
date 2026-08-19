"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
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
    // /dashboard routes by role — an employer signing in should not land on the
    // seeker dashboard and be bounced.
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <span className="eyebrow">Welcome back</span>
      <h1 className="font-display text-3xl font-700 text-pac-ink mt-2 mb-8">
        Sign in
      </h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          required
          type="email"
          placeholder="Email address"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full px-3 py-2.5 rounded-card border border-pac-line text-sm focus:border-pac-orange outline-none"
        />
        <input
          required
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full px-3 py-2.5 rounded-card border border-pac-line text-sm focus:border-pac-orange outline-none"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-pac-ink text-pac-paper py-2.5 rounded-card text-sm font-medium hover:bg-pac-orange transition-colors disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>

      <p className="text-sm text-pac-muted mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/auth/register" className="text-pac-orange hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}

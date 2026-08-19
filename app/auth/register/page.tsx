"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { UserRole } from "@/types/database";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("seeker");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name, role } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // The profiles row is created by the on_auth_user_created trigger
    // (migration 003), which also whitelists the role — a client cannot grant
    // itself admin by editing the metadata above. Nothing to insert here.

    // Email confirmation is deliberately left on: migration 006 treats a
    // confirmed address as proof of ownership before releasing a decade of
    // someone's application history. So there is no session yet.
    if (!data.session) {
      setAwaitingConfirmation(true);
      setLoading(false);
      return;
    }

    router.push(role === "employer" ? "/dashboard/employer" : "/dashboard/seeker");
    router.refresh();
  }

  if (awaitingConfirmation) {
    return (
      <div className="mx-auto max-w-sm px-6 py-20">
        <span className="eyebrow">One more step</span>
        <h1 className="font-display text-3xl font-700 text-pac-ink mt-2 mb-4">
          Check your email
        </h1>
        <p className="text-sm text-pac-muted leading-relaxed">
          We sent a confirmation link to{" "}
          <span className="text-pac-ink font-medium">{form.email}</span>. Open it
          to activate your account.
        </p>
        <p className="text-sm text-pac-muted leading-relaxed mt-3">
          If you applied for a role through PAC Africa before, confirming this
          address is also what lets us reconnect your earlier applications to
          your new account.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <span className="eyebrow">Join PAC Jobs</span>
      <h1 className="font-display text-3xl font-700 text-pac-ink mt-2 mb-8">
        Create account
      </h1>

      <div className="flex gap-2 mb-6">
        <RoleButton
          active={role === "seeker"}
          onClick={() => setRole("seeker")}
          label="I'm looking for work"
        />
        <RoleButton
          active={role === "employer"}
          onClick={() => setRole("employer")}
          label="I'm hiring"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          required
          placeholder={role === "employer" ? "Company contact name" : "Full name"}
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
          required
          type="password"
          placeholder="Password"
          minLength={8}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full px-3 py-2.5 rounded-card border border-pac-line text-sm focus:border-pac-orange outline-none"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-pac-ink text-pac-paper py-2.5 rounded-card text-sm font-medium hover:bg-pac-orange transition-colors disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>

      <p className="text-sm text-pac-muted mt-6">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-pac-orange hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function RoleButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 text-xs font-medium px-3 py-2.5 rounded-card border transition-colors",
        active
          ? "border-pac-orange bg-pac-orange/5 text-pac-orange"
          : "border-pac-line text-pac-muted hover:border-pac-ink"
      )}
    >
      {label}
    </button>
  );
}

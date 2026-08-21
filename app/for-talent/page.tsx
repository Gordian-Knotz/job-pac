import Link from "next/link";
import { ShieldCheck, ListChecks, Lock } from "lucide-react";

export const metadata = {
  title: "For talent",
  description:
    "Apply to vetted roles from employers across Kenya and East Africa, and track every application in one place.",
};

const points = [
  {
    icon: ShieldCheck,
    title: "Every listing is reviewed",
    body: "PAC Africa checks each role before it publishes. No demo listings, no roles that quietly went stale.",
  },
  {
    icon: ListChecks,
    title: "Apply once, track it",
    body: "Keep a CV on file, apply in one step and see the status of every application from your dashboard.",
  },
  {
    icon: Lock,
    title: "Your CV is never public",
    body: "Only the employer for the specific role you applied to can see it — never listed, never searchable.",
  },
];

export default function ForTalentPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <span className="eyebrow">For talent</span>
      <h1 className="mt-3 max-w-2xl font-display text-4xl font-700 leading-[1.08] tracking-display text-ink">
        Find work with employers who have been checked too.
      </h1>
      <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
        Browse vetted roles across Kenya and East Africa, apply with or without
        an account, and pick up a CV you have already attached before.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {points.map((point) => (
          <div key={point.title} className="clay p-5">
            <div className="clay-raised mb-4 grid h-9 w-9 place-items-center rounded-card">
              <point.icon className="h-4 w-4 text-accent-text" aria-hidden />
            </div>
            <h2 className="font-display text-base font-600 text-ink">{point.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{point.body}</p>
          </div>
        ))}
      </div>

      <div className="clay mt-10 flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="font-display text-lg font-600 text-ink">
            Ready to look?
          </p>
          <p className="mt-1 text-sm text-muted">
            No account needed to apply — sign up if you want your history saved
            and tracked.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/jobs" className="btn-primary">
            Browse roles
          </Link>
          <Link href="/auth/signup" className="btn-ghost">
            Create account
          </Link>
        </div>
      </div>

      <p className="mt-6 text-sm text-muted">
        Applied through PAC Africa before this site existed?{" "}
        <Link href="/auth/signup" className="text-accent-text hover:underline">
          Sign up
        </Link>{" "}
        with the same email address to reconnect your history.
      </p>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathFor } from "@/lib/auth";
import type { UserRole } from "@/types/database";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: UserRole | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = (data?.role as UserRole) ?? null;
  }

  return (
    <header className="border-b border-pac-line bg-pac-paper/95 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        {/* The mark carries a checkmark, which is the same idea as the vetting
            stamp on the job cards — worth keeping them visually related. */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image
            src="/pac-logo.png"
            alt="PAC Africa — Priority Activator Consulting"
            width={591}
            height={221}
            priority
            className="h-8 w-auto"
          />
          <span className="h-5 w-px bg-pac-line" aria-hidden />
          <span className="eyebrow">Jobs</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm">
          <Link href="/jobs" className="hover:text-pac-orange transition-colors">
            Browse Jobs
          </Link>
          {/* Only an employer can act on this, and it needs a company first,
              so the link routes through the employer dashboard rather than
              dropping a signed-out visitor onto a guarded page. */}
          <Link
            href={role === "employer" ? "/dashboard/employer/post" : "/auth/register"}
            className="hover:text-pac-orange transition-colors"
          >
            Post a Job
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {role ? (
            <>
              <Link
                href={dashboardPathFor(role)}
                className="text-sm font-medium hover:text-pac-orange transition-colors"
              >
                Dashboard
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-sm font-medium text-pac-muted hover:text-pac-orange transition-colors"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm font-medium hover:text-pac-orange transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="text-sm font-medium bg-pac-ink text-pac-paper px-4 py-2 rounded-card hover:bg-pac-orange transition-colors"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

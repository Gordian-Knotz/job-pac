import Link from "next/link";
import type { UserRole } from "@/types/database";

const LINKS: Record<UserRole, { href: string; label: string }[]> = {
  seeker: [
    { href: "/dashboard/seeker", label: "Applications" },
    { href: "/dashboard/seeker/profile", label: "Profile & CV" },
    { href: "/jobs", label: "Browse jobs" },
  ],
  employer: [
    { href: "/dashboard/employer", label: "My listings" },
    { href: "/dashboard/employer/post", label: "Post a job" },
    { href: "/dashboard/employer/company", label: "Company profile" },
  ],
  admin: [
    { href: "/admin", label: "Admin" },
    { href: "/jobs", label: "Browse jobs" },
  ],
};

export function DashboardNav({ role }: { role: UserRole }) {
  return (
    <aside className="lg:w-[200px] shrink-0">
      <nav className="flex lg:flex-col gap-4 lg:gap-1.5 text-sm border-b lg:border-b-0 border-pac-line pb-4 lg:pb-0">
        {LINKS[role].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-pac-ink hover:text-pac-orange transition-colors truncate"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

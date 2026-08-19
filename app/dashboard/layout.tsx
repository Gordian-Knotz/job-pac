import { requireUser } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireUser();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col lg:flex-row gap-10">
        <DashboardNav role={profile.role} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

import { requireUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { displayApplicant } from "@/lib/utils";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireUser();

  return (
    <DashboardShell
      role={profile.role}
      name={displayApplicant(profile.full_name, profile.email)}
    >
      {children}
    </DashboardShell>
  );
}

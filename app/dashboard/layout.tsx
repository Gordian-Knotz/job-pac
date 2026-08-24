import { requireUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { ProfileNudge } from "@/components/profile-nudge";
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
      {profile.role === "seeker" && <ProfileNudge profile={profile} />}
      {children}
    </DashboardShell>
  );
}

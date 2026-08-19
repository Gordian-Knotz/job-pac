import type { ApplicationStatus, JobStatus } from "@/types/database";

const APPLICATION_STYLES: Record<ApplicationStatus, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  shortlisted: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  hired: "bg-blue-50 text-blue-700",
};

const JOB_STYLES: Record<JobStatus, string> = {
  draft: "bg-gray-50 text-gray-600",
  pending_review: "bg-yellow-50 text-yellow-700",
  published: "bg-green-50 text-green-700",
  expired: "bg-gray-50 text-gray-500",
  closed: "bg-red-50 text-red-700",
};

const LABELS: Record<string, string> = {
  pending_review: "in review",
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`shrink-0 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${className}`}
    >
      {label}
    </span>
  );
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <Badge
      label={LABELS[status] ?? status}
      className={APPLICATION_STYLES[status] ?? "bg-gray-50 text-gray-700"}
    />
  );
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge
      label={LABELS[status] ?? status}
      className={JOB_STYLES[status] ?? "bg-gray-50 text-gray-700"}
    />
  );
}

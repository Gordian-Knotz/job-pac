import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSalary(min: number | null, max: number | null, currency = "KES") {
  if (!min && !max) return "Salary not disclosed";
  const fmt = (n: number) => new Intl.NumberFormat("en-KE").format(n);
  if (min && max) return `${currency} ${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${currency} ${fmt(min)}`;
  return `Up to ${currency} ${fmt(max!)}`;
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: [number, string][] = [
    [31536000, "y"],
    [2592000, "mo"],
    [86400, "d"],
    [3600, "h"],
    [60, "m"],
  ];
  for (const [secs, label] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count}${label} ago`;
  }
  return "just now";
}

/**
 * jobs.slug is `unique not null`, so callers append a short suffix and retry on
 * a 23505 unique violation rather than trying to guarantee uniqueness here.
 */
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      // NFKD splits accents into combining marks, which are non-alphanumeric,
      // so the filter below removes them. No separate diacritics pass needed.
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "role"
  );
}

export function randomSuffix(length = 5): string {
  return Math.random()
    .toString(36)
    .slice(2, 2 + length);
}

/**
 * Historical applications have no applicant_name (only 14 of 4,355 carried
 * first_name/last_name in the WordPress meta), so fall back to the local part
 * of the email rather than rendering an empty cell.
 */
export function displayApplicant(
  name: string | null,
  email: string | null
): string {
  if (name && name.trim()) return name.trim();
  if (email) return email.split("@")[0];
  return "Unknown applicant";
}

export const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  freelance: "Freelance",
  contract: "Contract",
  internship: "Internship",
};

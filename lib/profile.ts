import type { Profile } from "@/types/database";

export type ProfileCheck = {
  label: string;
  done: boolean;
  /** Why it matters, in the applicant's terms rather than the system's. */
  why: string;
};

/**
 * What a seeker still needs to fill in.
 *
 * Deliberately only the fields that change what an employer sees or how they
 * make contact — bio and LinkedIn are genuinely optional, so including them
 * would show a permanently incomplete profile to someone who has finished.
 * A checklist you cannot finish is noise.
 */
export function profileChecklist(profile: Profile, hasCv: boolean): ProfileCheck[] {
  return [
    {
      label: "Your name",
      done: Boolean(profile.full_name?.trim()),
      why: "Employers see this instead of your email address.",
    },
    {
      label: "CV attached",
      done: hasCv,
      why: "Usually the first thing an employer opens.",
    },
    {
      label: "Phone number",
      done: Boolean(profile.phone?.trim()),
      why: "How most employers here make first contact.",
    },
    {
      label: "Headline",
      done: Boolean(profile.headline?.trim()),
      why: "One line on what you do, shown with your application.",
    },
    {
      label: "Skills",
      done: Boolean(profile.skills?.length),
      why: "Lets us point you at roles that match.",
    },
    {
      label: "Location",
      done: Boolean(profile.address?.trim()),
      why: "Employers use it to judge the commute.",
    },
    {
      label: "Years of experience",
      done: profile.years_experience !== null,
      why: "Lets employers gauge seniority at a glance.",
    },
    {
      label: "Education level",
      done: profile.education_level !== null,
      why: "Some roles filter by minimum education.",
    },
    {
      label: "Industry",
      done: profile.industry_category_id !== null,
      why: "Helps us point you at roles in your field.",
    },
  ];
}

/**
 * The smaller "must-have" subset of profileChecklist that actually gates
 * dashboard features (Saved, Alerts, Applications — see lib/auth.ts). Kept
 * separate from the full 6-item checklist so ProfileNudge's percentage is
 * unaffected: headline/skills/location stay optional nudges, never gates.
 */
export function isProfileGateComplete(profile: Profile, hasCv: boolean): boolean {
  return Boolean(profile.full_name?.trim()) && Boolean(profile.phone?.trim()) && hasCv;
}

export function completeness(checks: ProfileCheck[]): {
  done: number;
  total: number;
  percent: number;
} {
  const done = checks.filter((c) => c.done).length;
  return {
    done,
    total: checks.length,
    percent: Math.round((done / checks.length) * 100),
  };
}

/**
 * Accepts what people actually type for a LinkedIn profile.
 *
 * The field used `type="url"`, so the browser rejected "linkedin.com/in/jane"
 * — which is what most people paste — and silently blocked the whole form.
 * Now it takes text and gets normalised here instead.
 */
export function normaliseLinkedIn(raw: string | null): string | null {
  if (!raw) return null;
  let value = raw.trim().replace(/^@+/, "");
  if (!value) return null;

  // A bare handle, e.g. "jane-doe". Anything with whitespace or punctuation is
  // not a handle — better to store nothing than a link that 404s.
  if (!value.includes("/") && !value.includes(".")) {
    return /^[\w-]+$/.test(value)
      ? `https://www.linkedin.com/in/${value}`
      : null;
  }
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;

  try {
    const url = new URL(value);
    return url.toString();
  } catch {
    return null;
  }
}

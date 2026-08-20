import type {
  ApplicationStatus,
  EmploymentLevel,
  JobStatus,
  JobType,
} from "@/types/database";

/**
 * Every user-facing string lives here (brief §12: no hardcoded copy).
 *
 * Flat and typed rather than a nested i18n tree: the product is single-language
 * today, and a shallow object keeps call sites readable. Swapping this for a
 * real i18n backend later means changing this file's shape, not every component.
 *
 * Status labels are the other half of the vocabulary decision in migration 014.
 * Two states were genuinely missing and were added to the enums; the rest are
 * naming differences and are mapped here, so the database keeps values that
 * policies and seeded rows already reference.
 */

export const site = {
  name: "PAC Jobs",
  domain: "jobs.pac.africa",
  owner: "PAC Africa",
  ownerFull: "Priority Activator Consulting",
} as const;

export const nav = {
  browse: "Browse Jobs",
  post: "Post a Job",
  signIn: "Sign In",
  signOut: "Sign out",
  dashboard: "Dashboard",
  themeToggle: "Switch theme",
  openMenu: "Open menu",
  closeMenu: "Close menu",
} as const;

export const home = {
  headline: "Vetted work, verified employers, across Kenya.",
  sub: "Real roles from employers we have checked. No ghost listings, no recruiter noise.",
  browseCta: "Browse Jobs",
  postCta: "Post a Job",
  latest: "Latest roles",
  viewAll: "View all jobs",
  emptyTitle: "No roles are live right now",
  emptyBody:
    "Every listing is reviewed before it publishes. Nothing has cleared review yet — check back shortly, or post a role if you are hiring.",
} as const;

export const browse = {
  title: "Browse jobs",
  searchLabel: "Job title, skill or company",
  searchPlaceholder: "Job title, skill, or company",
  searchCta: "Search",
  filtersTitle: "Filters",
  filtersCta: "Filters",
  clearAll: "Clear all",
  filteredBy: "Filtered by",
  removeFilter: "Remove filter",
  keyword: "Keyword",
  location: "Location",
  anyLocation: "Anywhere in Kenya",
  category: "Category",
  anyCategory: "All categories",
  employmentType: "Employment type",
  experience: "Experience level",
  postedWithin: "Posted within",
  remoteOnly: "Remote only",
  sortBy: "Sort",
  resultCount: (n: number) => `${n.toLocaleString()} open role${n === 1 ? "" : "s"}`,
  showingRange: (from: number, to: number, total: number) =>
    `Showing ${from}–${to} of ${total.toLocaleString()}`,
  emptyTitle: "No roles match those filters",
  emptyBody: "Try a broader search term, or clear a filter to widen the results.",
  emptyEmployerNudge: "Hiring? Post a role instead.",
  prev: "Previous",
  next: "Next",
} as const;

/**
 * "Salary High to Low" went with salaries.
 *
 * "Most Relevant" is deliberately absent for now rather than present and fake:
 * ranking a full-text match means ordering by ts_rank(fts, query), which
 * PostgREST cannot express — an unordered textSearch returns rows in whatever
 * order Postgres happens to produce. Doing it properly needs a ranking RPC.
 * A sort control that quietly does nothing is worse than one option.
 */
export const sortOptions = [
  { value: "recent", label: "Most Recent" },
  { value: "salary", label: "Highest Pay" },
  { value: "oldest", label: "Oldest First" },
] as const;

export const postedWithinOptions = [
  { value: "1", label: "Today" },
  { value: "3", label: "Last 3 days" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
] as const;

/**
 * No company name, no logo, no verified badge and no salary.
 *
 * The employer behind a role is admin-only information: PAC sits between the
 * applicant and the employer, and naming the employer invites candidates to
 * apply direct. Applications are made to PAC, which is what `postedVia` says on
 * the listing so the absence reads as deliberate rather than as missing data.
 */
export const job = {
  about: "About the role",
  requirements: "Requirements",
  qualifications: "Qualifications",
  related: "Related roles",
  apply: "Apply for this role",
  applyShort: "Apply",
  share: "Share",
  shareCopied: "Link copied",
  report: "Report listing",
  save: "Save role",
  unsave: "Saved",
  postedVia: "Listed by PAC Africa",
  postedPrefix: "Posted",
  closesPrefix: "Closes",
  backToResults: "Back to results",
  allRoles: "All roles",
  notFound: "That role is no longer listed",
} as const;

/** Brief §7 — the auth gate. */
export const gate = {
  employerCannotApply: {
    title: "You are signed in as an employer",
    body: "Applications are for job seekers. This is how the listing looks to one.",
    action: "Back to your dashboard",
  },
  adminViewing: {
    title: "You are signed in as an administrator",
    body: "Applications are for job seekers. This is how the listing looks to one.",
    action: "Back to your dashboard",
  },
  seekerCannotPost: {
    title: "Posting a job needs an employer account",
    body: "Your account is set up for finding work. Employer accounts can publish roles, review applicants and manage a company profile.",
    learn: "Learn about employer accounts",
    dismiss: "Dismiss",
  },
  alreadyApplied: {
    title: "You have applied for this role",
    submittedOn: (date: string) => `Submitted ${date}.`,
    action: "Track your applications",
  },
  applyingAs: "Applying as",
  signInToApplyFaster: "Sign in to apply faster and track it.",
  noAccountNeeded: "You do not need an account. Attach a CV if you have one ready.",
  sent: {
    title: "Application sent",
    bodySignedIn:
      "It is in your dashboard, and you will hear from us by email if the employer responds.",
    bodyGuest: "We'll notify you by email if the employer responds.",
  },
} as const;

/** Labels for enum values. See migration 014 for what changed and what did not. */
export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  pending: "Applied",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  hired: "Hired",
};

export const jobStatusLabels: Record<JobStatus, string> = {
  draft: "Draft",
  pending_review: "In Review",
  published: "Active",
  paused: "Paused",
  expired: "Expired",
  closed: "Closed",
};

export const employmentLevelLabels: Record<EmploymentLevel, string> = {
  entry: "Entry",
  mid: "Mid",
  senior: "Senior",
  // The enum value stays `executive`; renaming it would touch seeded rows and
  // policy text for no gain.
  executive: "Director",
};

export const jobTypeLabels: Record<JobType, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  freelance: "Freelance",
  contract: "Contract",
  internship: "Internship",
};

/** Brief §12: every page needs a working empty, loading and error state. */
export const states = {
  loading: "Loading…",
  errorTitle: "Something went wrong",
  errorBody: "Try again in a moment. If it keeps happening, let us know.",
  retry: "Try again",
  notFoundTitle: "Not found",
  notFoundBody: "That page does not exist, or it has moved.",
  goHome: "Back to jobs",
} as const;

export const cv = {
  open: "Open CV",
  none: "No CV attached",
  pending: "CV pending migration",
  pendingHint:
    "Held in the archive recovered from the previous site — not reachable at its old address since the domain moved.",
  expires: "expires in 5 min",
  onFile: "On file.",
  replace: "Replace CV",
  upload: "Upload CV",
  constraint: "PDF, up to 5MB.",
} as const;

export const footer = {
  rights: (year: number) =>
    `© ${year} ${site.owner}. Connecting Kenyan talent with vetted employers.`,
} as const;

export type UserRole = "seeker" | "employer" | "admin";
// Order matches the enums in Postgres, which are in workflow order so
// `order by status` sorts the way a person reads it. See migration 014.
export type ApplicationStatus =
  | "pending"
  | "under_review"
  | "shortlisted"
  | "rejected"
  | "hired";
export type JobStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "paused"
  | "expired"
  | "closed";
export type JobType = "full_time" | "part_time" | "freelance" | "contract" | "internship";
export type EmploymentLevel = "entry" | "mid" | "senior" | "executive";

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[] | null;
  address: string | null;
  linkedin_url: string | null;
  cv_url: string | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

export type Company = {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  industry: string | null;
  location: string | null;
  size: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export type JobCategory = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  created_at: string;
}

export type JobLocation = {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  created_at: string;
}

export type Job = {
  id: string;
  company_id: string | null;
  posted_by: string | null;
  title: string;
  slug: string;
  description: string;
  requirements: string | null;
  qualifications: string | null;
  category_id: string | null;
  location_id: string | null;
  location_text: string | null;
  job_type: JobType;
  employment_level: EmploymentLevel;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  is_remote: boolean;
  status: JobStatus;
  is_featured: boolean;
  application_deadline: string | null;
  views: number;
  wp_post_id: number | null;
  original_date: string | null;
  created_at: string;
  updated_at: string;
  // joined
  company?: Company;
  category?: JobCategory;
  location?: JobLocation;
}

export type Application = {
  id: string;
  job_id: string | null;
  applicant_id: string | null;
  applicant_name: string | null;
  applicant_email: string;
  applicant_phone: string | null;
  cover_letter: string | null;
  cv_url: string | null;
  status: ApplicationStatus;
  employer_note: string | null;
  wp_post_id: number | null;
  wp_job_title: string | null;
  applied_at: string;
  updated_at: string;
  // joined
  job?: Job;
}

export type SavedJob = {
  id: string;
  profile_id: string;
  job_id: string;
  created_at: string;
}

export type JobAlert = {
  id: string;
  profile_id: string;
  email: string;
  keyword: string | null;
  category_id: string | null;
  location_id: string | null;
  job_type: JobType | null;
  frequency: string;
  is_active: boolean;
  last_sent_at: string | null;
  created_at: string;
}

// Hand-maintained to match schema.sql + migrations/. NOT generated, so any
// schema change needs a matching edit here — or run
// `supabase gen types typescript --project-id khdvagjfonbiezkybpvh`.
/**
 * supabase-js requires every table to carry a `Relationships` key to satisfy its
 * GenericSchema constraint. Omit it and the client silently resolves every table
 * to `never`, so `.update({...})` fails with "not assignable to type 'never'"
 * and even the cookie handlers in lib/supabase/server.ts lose inference.
 * Empty is fine — it only types the embedded-resource helpers.
 */
type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile>;
      companies: Table<Company>;
      job_categories: Table<JobCategory>;
      job_locations: Table<JobLocation>;
      jobs: Table<Job>;
      applications: Table<Application>;
      saved_jobs: Table<SavedJob>;
      job_alerts: Table<JobAlert>;
    };
    Views: Record<string, never>;
    // RPCs added by the migrations. Without these declared, supabase.rpc()
    // calls do not typecheck against this Database generic.
    Functions: {
      stats: {
        Args: Record<string, never>;
        Returns: { live_jobs: number; applications: number; employers: number }[];
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      count_claimable_applications: {
        Args: Record<string, never>;
        Returns: number;
      };
      claim_historical_applications: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
    Enums: {
      user_role: UserRole;
      application_status: ApplicationStatus;
      job_status: JobStatus;
      job_type: JobType;
      employment_level: EmploymentLevel;
    };
    CompositeTypes: Record<string, never>;
  };
}

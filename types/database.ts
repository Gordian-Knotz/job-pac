export type UserRole = "seeker" | "employer" | "admin";
export type ApplicationStatus = "pending" | "shortlisted" | "rejected" | "hired";
export type JobStatus = "draft" | "pending_review" | "published" | "expired" | "closed";
export type JobType = "full_time" | "part_time" | "freelance" | "contract" | "internship";
export type EmploymentLevel = "entry" | "mid" | "senior" | "executive";

export interface Profile {
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

export interface Company {
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

export interface JobCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  created_at: string;
}

export interface JobLocation {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  company_id: string | null;
  posted_by: string | null;
  title: string;
  slug: string;
  description: string;
  requirements: string | null;
  benefits: string | null;
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

export interface Application {
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

// Minimal Supabase Database type — extend as needed for generated types
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      companies: { Row: Company; Insert: Partial<Company>; Update: Partial<Company> };
      job_categories: { Row: JobCategory; Insert: Partial<JobCategory>; Update: Partial<JobCategory> };
      job_locations: { Row: JobLocation; Insert: Partial<JobLocation>; Update: Partial<JobLocation> };
      jobs: { Row: Job; Insert: Partial<Job>; Update: Partial<Job> };
      applications: { Row: Application; Insert: Partial<Application>; Update: Partial<Application> };
    };
  };
}

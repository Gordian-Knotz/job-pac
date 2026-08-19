# jobs.pac.africa — Rebuild

Next.js 15 + Supabase job board, rebuilt to replace the WordPress/Jobmonster install
that was compromised in August 2026. Data migrated from the old DB (4,355 historical
applications, 165 categories, 65 locations preserved).

## Stack
- Next.js 15 (App Router, Server Components)
- Supabase (Postgres + Auth + Storage)
- Tailwind CSS — PAC brand tokens (orange `#E8532E`, Source Serif 4 + IBM Plex Sans)
- TypeScript

## Setup

```bash
npm install
```

`.env.local` is already populated with your Supabase project credentials.

```bash
npm run dev
```

Visit http://localhost:3000

## Before this runs against real data

You must have already run, in order, against your Supabase project's SQL Editor:

1. `schema.sql`
2. `seed_categories.sql`
3. `seed_locations.sql`
4. `seed_applications_01_of_09.sql` through `seed_applications_09_of_09.sql`

(These are in the separate `jobs-pac-africa-migration-v2.tar.gz` package.)

## What's built so far

- [x] Homepage — hero, live stats, featured jobs
- [x] Job listings — search + filter by category/location/type
- [x] Job detail page — full description + inline apply form
- [x] Auth — login, register (seeker/employer role selection)
- [x] Admin dashboard — stats, pending job approvals, recent applications
- [ ] Employer dashboard — post jobs, manage applicants (next)
- [ ] Seeker dashboard — profile, CV upload, application tracking (next)
- [ ] Job approval actions (wire up Approve/Reject buttons to Supabase)
- [ ] Email notifications (Resend integration)
- [ ] CV file upload to Supabase Storage
- [ ] CSV export for admin

## Making yourself an admin

After you sign up through `/auth/register`, run this in Supabase SQL Editor:

```sql
update profiles set role = 'admin' where email = 'your-email@pac.africa';
```

Then visit `/admin`.

## Deploying

Push to GitHub, import into Vercel, add the same env vars from `.env.local`
in Vercel's project settings, point jobs.pac.africa's DNS at Vercel.
"# jobs-pac" 
"# job-pac" 

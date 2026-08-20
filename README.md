# jobs.pac.africa — Rebuild

Next.js 15 + Supabase job board, rebuilt to replace the WordPress/Jobmonster install
that was compromised in August 2026. Data migrated from the old DB (4,355 historical
applications, 165 categories, 65 locations preserved).

## Stack
- Next.js 15 (App Router, Server Components)
- Supabase (Postgres + Auth + Storage)
- Tailwind CSS — PAC brand tokens (orange `#E8532E`, Source Serif 4 + IBM Plex Sans)
- TypeScript



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


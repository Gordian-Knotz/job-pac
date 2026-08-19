# Migrations

Run in numerical order. Every file is idempotent — safe to re-run.

| # | file | what it does | status |
|---|---|---|---|
| 001 | `001_is_admin_and_recursion_fix.sql` | `is_admin()`; rebuild profiles/jobs/companies policies | **applied** |
| 002 | `002_lookup_tables_read.sql` | unlock `job_categories` / `job_locations` | **applied** |
| 003 | `003_profiles_bootstrap.sql` | signup trigger + role whitelist + backfill | **applied** |
| 004 | `004_applications_access.sql` | guest apply, employer visibility, admin | **applied** |
| 005 | `005_public_stats.sql` | `stats()` aggregate RPC for the homepage | **applied** |
| 006 | `006_claim_historical.sql` | claim-by-confirmed-email RPCs | **applied** |
| 007 | `007_storage_cvs.sql` | private `cvs` bucket + policies | **applied** |
| 008 | `008_function_hardening.sql` | `search_path` fix, revoke a stray grant | **not applied** |

## Why these exist

`schema.sql` shipped with four defects that made the database unusable. Measured
against the live project as the `anon` role, before any of this ran:

```
applications   -> 42P17 infinite recursion detected in policy for relation "profiles"
jobs           -> 42P17
companies      -> 42P17
profiles       -> 42P17
job_categories -> OK, 0 rows   (165 exist)
job_locations  -> OK, 0 rows   ( 65 exist)
```

Four of six tables threw at the database layer for every visitor; the other two
silently returned nothing. The homepage swallowed the error and rendered "No live
roles yet", which is why this went unnoticed — nothing in the UI said *error*.

1. **42P17 recursion.** `admins full access profiles` ran
   `exists (select 1 from profiles ...)` in a policy *on* `profiles`. The same
   subquery was copy-pasted into the admin policies on three more tables, so it
   was not contained. Fixed by moving the test into `security definer
   is_admin()` — 001.
2. **RLS on with no policy** on the two lookup tables, courtesy of the
   `ensure_rls` event trigger. A silent lockout — 002.
3. **No INSERT policy on `profiles`**, so the client-side insert in
   `register/page.tsx` was denied and its error never checked. Every signup
   produced an `auth.users` row with no profile — 003. The backfill in 003
   recovered the two existing accounts.
4. **`applicant_id = auth.uid()` on INSERT**, which is `NULL = NULL` → NULL for
   a guest, so the public apply form could never succeed; and employer read
   keyed on `companies.owner_id` while employer write keyed on `posted_by`, so
   jobs missing a `company_id` had invisible applicants — 004.

## What was verified after applying (001–006)

Each was probed by impersonating the actual role (`set role` + a synthetic
`request.jwt.claims`), not from a superuser session where RLS is bypassed:

- All 42P17 errors gone for `anon` and `authenticated`; `is_admin()` returns
  `false` cleanly.
- `job_categories` 165 rows / `job_locations` 65 rows readable by anon; anon
  writes denied (42501).
- Signup trigger: `role: "admin"` supplied in client metadata is **downgraded to
  `seeker`**; `employer` honoured; `full_name` trimmed.
- `anon` sees **0 of 4,355** applications; can insert against a published job;
  denied against a draft (42501); denied when forging `applicant_id` (42501).
- Employer A sees and updates only their own applicants; employer B sees 0 and
  their update matches 0 rows.
- Claim flow: a **confirmed** address claimed exactly its 6 rows and re-claiming
  added 0; an **unconfirmed** address with 6 matching rows counted 0 and claimed
  0.
- `stats()` as anon returns `applications=4355` while row reads still return 0.

All probe fixtures were removed. `applications` ends at 4,355 rows, all
unclaimed, and `auth.users` at 2.

## After 007

Verified by impersonating each role, then cleaned up:

- `cvs` bucket is private, capped at 5 MB, and restricted to `application/pdf`
  at the storage layer — not just in the form.
- `anon` may INSERT into the bucket (guests apply) and has no read, list,
  update or delete.
- A published job is visible to a signed-out visitor, including its joined
  employer and category; a `draft` or `closed` job is not.
- A guest application against a published job is accepted.

`it@pac.africa` is now confirmed and holds `role = 'admin'`.

## Still open

- **`008` is not applied.** It pins `search_path` on `update_updated_at` and
  revokes a stray EXECUTE grant. Neither is urgent — no behaviour depends on it.
- Two dashboard toggles, listed at the bottom of `008`: keep email confirmation
  on (migration 006 depends on it), and enable leaked-password protection.
- The recovered WordPress CVs still need uploading into the `cvs` bucket, with
  `applications.cv_url` rewritten from the dead `https://jobs.pac.africa/...`
  URLs to storage object paths. Needs `SUPABASE_SERVICE_ROLE_KEY`.

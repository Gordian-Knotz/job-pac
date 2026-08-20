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
| 008 | `008_function_hardening.sql` | `search_path` fix, revoke a stray grant | **applied** |
| 009 | `009_storage_cvs_widen.sql` | 60 MB cap, accept doc/docx for the archive | **applied** |
| 010 | `010_function_grants.sql` | take `EXECUTE` off `anon` where unneeded | **applied** |
| 011 | `011_stats_not_public.sql` | revoke `stats()` from `anon` — counts are off the hero | **applied** |
| 012 | `012_job_publish_and_cv_access_guards.sql` | publish bypass, company impersonation, CV read path | **applied** |
| 013 | `013_tighten_cvs_and_dedupe_applications.sql` | cvs back to 5 MB/PDF, one application per job+email | **applied** |

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

## After 008–010

- `update_updated_at` now has `search_path = ''`; its trigger still fires
  (verified by touching a row and watching `updated_at` advance).
- `rls_auto_enable` is no longer executable by `anon` or `authenticated`. The
  first attempt failed silently: it revoked the named roles but not `PUBLIC`,
  which is where the grant actually came from.
- **`anon` now holds `EXECUTE` on `stats()` and nothing else.** Migrations
  001/005/006 had revoked `PUBLIC` and granted the roles that needed it, which
  looked correct but wasn't — Supabase's `ALTER DEFAULT PRIVILEGES` had already
  attached an *explicit* `anon` grant to every new function, so revoking PUBLIC
  never removed it. No exploit: each function returns early when `auth.uid()` is
  null. Closed in `010`.
- `handle_new_user`, `update_updated_at` and `guard_company_verified` are
  trigger-only and unreachable over the API. Their triggers still work —
  Postgres checks `EXECUTE` when a trigger is created, not when it fires.
- `guard_company_verified` re-verified against the real company owner (not a
  random uuid, which RLS rejects before the trigger is reached): an employer
  gets `verified may only be changed by an admin`, while ordinary edits pass.
- `cvs` bucket: private, 60 MB, pdf + doc + docx.

## After 011–016

- `stats()` revoked from `anon`, then the landing-page counts removed. **`anon`
  could execute nothing in `public` at this point** — 017 and 023 each added one
  back, deliberately; see below.
- 012 closed an employer publish-bypass: `guard_job_status()` made every route
  into `published` admin-only, and the `company_id` predicate in the jobs
  policy was constrained so an employer could not attach a listing to someone
  else's company.
- 013 put `cvs` back to 5 MB PDF-only once R2 held the archive, and added a
  partial unique index so the same address cannot be filed against the same
  listing twice. The 4,355 archive rows have `job_id` NULL and are excluded.
- 015 renamed `benefits` → `qualifications`, matching a product decision.
- 016 dropped `companies_select_public`. The employer behind a role became
  admin-only information — which 017 then depended on without noticing, and 023
  had to repair.

## After 017–023 (the dashboards)

Four things the brief's dashboards needed and the schema lacked (017), plus what
building on them exposed.

- **`application_events` + `log_application_status()`** — the drawer's history.
  Written by trigger, not by the app, so it is complete even for a change made
  through the API or a SQL console.
- **Suspension** (`suspended_at` on `profiles` and `companies`) started as a
  label. 022 made it bite: a suspended seeker cannot insert an application and a
  suspended employer cannot insert or update a listing, both by trigger, so the
  refusal holds against a direct API call rather than only against the UI.
- **023 is a fix, and the most instructive item here.** 017's suspension check
  lived inside `jobs_select_published` as a subquery against `companies`. A
  policy subquery runs with the **caller's** privileges, and 016 had just removed
  public read on `companies` — so for `anon` it returned zero rows regardless,
  `not exists` was always true, and a suspended employer's listings stayed
  public. The check now lives in `company_suspended()`, a `security definer`
  function returning one boolean.

  **A policy predicate must not depend on RLS the caller does not have.**
- **019 + 021 reopened two doors 012 had closed too far.** `approved_at` is
  stamped on publish and cleared by any non-admin edit to reviewed content, which
  lets an employer resume a listing they paused without re-review while keeping
  "nothing public without review" true. 021 lets an employer insert a `draft`,
  which the post form's save-as-draft needs; `draft` is not publicly visible.
- **020 exists because `profiles` is row-level.** The inbox shows an applicant's
  headline and avatar, both on `profiles`, whose policy is own-row-or-admin.
  Widening it would have handed over phone, address, bio, LinkedIn and
  `cv_url` too. `applicant_cards(uuid[])` returns those two columns, only for
  applications on jobs the caller owns, and takes application ids rather than a
  person — so there is no way to ask it about someone.
- **018 added two buckets.** `avatars` is private and read-scoped like a CV;
  `logos` is public because a corporate mark is branding. Both key their
  policies on the first path segment rather than on `storage.objects.owner`,
  which is NULL for service-role writes — the trap 007 hit with the CV archive.

### Verified by probe, as the real roles

Each of these was run with `set_config('role', …)` plus synthetic
`request.jwt.claims`, never from a superuser session:

| behaviour | result |
|---|---|
| employer inserts a draft | stays `draft`, `approved_at` null |
| employer publishes their own draft | blocked — "only an administrator can publish" |
| admin publishes | `approved_at` stamped |
| employer pauses then resumes | allowed |
| employer edits the title | `approved_at` cleared |
| employer resumes after editing | blocked — "edited since it was approved" |
| guest application | one `application_events` row written |
| employer moves it twice | history reads `new→pending, pending→under_review, under_review→shortlisted` |
| employer suspends another account | 0 rows — RLS never reaches the trigger |
| employer suspends their own company | blocked by trigger |
| suspended employer clears their own suspension | blocked by trigger; suspension survives |
| suspended seeker applies | blocked — "this account is suspended" |
| anon views a suspended employer's listing | 0 rows |
| after reinstating | 1 row |
| employer requests 2 applicant cards, owns 1 | gets 1 |
| applicant requests their own 2 | gets 2 |
| admin requests both | gets 2 |

Three probe mistakes of my own, recorded because they each read as a security
hole and were not:

1. `insert … returning` **as `anon`** fails with "new row violates row-level
   security policy" — `RETURNING` needs a SELECT policy, and a guest has none.
   The real apply form does a bare insert, so it works. The error message names
   the wrong cause.
2. An employer updating another user's row reports **success with 0 rows
   affected**. RLS denies by matching nothing, so asserting on "no error" reads a
   denial as a bypass. Assert on `row_count`.
3. Setting `suspended_at` from null **to null** does not trip the guard,
   because `is distinct from` is false. A no-op is not a bypass — make the
   values actually differ.

## After 024–025 (closing the write surface, and what that review found)

**024** removed the anonymous write surface. `applications_insert_public` (004)
granted INSERT to `anon` because the apply form ran in the browser, which made
`POST /rest/v1/applications` an open, unauthenticated write endpoint on the most
sensitive table here — and one nothing at the edge could protect, because the
request goes to Supabase and never reaches Vercel. Storage was the same:
`cvs_insert` let `anon` upload. Both are gone. Signed-in applicants now insert
under a policy; guests go through a server action that writes with the service
role via `submit_guest_application()`, which fixes the column list and forces
`applicant_id` to null.

**025 is the important one, and it did not come from planned work.** A security
review of 024 found a privilege escalation that had been live since migration
001:

> `profiles_update` was `using (auth.uid() = id or is_admin())` with the same
> WITH CHECK. That constrains the **row** and RLS has no column granularity, so
> any registered user could send
>
>     PATCH /rest/v1/profiles?id=eq.<own-uid>   {"role":"admin"}
>
> with the public anon key and their own token. `handle_new_user` (003)
> whitelists the role supplied at *signup*, so the insert was covered and the
> update was not.

Verified against the live database before fixing: a seeker promoted itself and
read **4,355 of 4,356** application rows. That unlocks every admin policy,
`cvs_select_admin`, the publish bypass in `guard_job_status`, and all of
`/admin`. It is the most serious defect found in this rebuild.

`guard_profile_columns()` now blocks non-admin changes to `role` and `email`,
and confines `company_id` to a company the caller owns.

**Why a trigger and not `revoke update (role)`.** The column revoke looks
tighter and is wrong here: Supabase admins *are* the `authenticated` role, so a
column privilege cannot tell them apart from a seeker, and revoking the column
would also stop an admin changing a role or suspending an account. Column
privileges cannot see who is asking; a trigger calling `is_admin()` can.

025 also tightened two things the same review surfaced:

- `applications_insert_own` constrained `status` to `pending` and added the
  seeker-only gate the application code had assumed was already there — without
  it any authenticated account, including an employer, could POST an application
  already marked `hired`.
- `cvs_select_employer` (007) matched on `a.cv_url = storage.objects.name` with
  no constraint on who wrote that row, so an employer could insert an
  application against their own job with `cv_url` set to a path they had seen
  elsewhere and gain indefinite read on it — the shape 012 closed for applicants
  and left open here. Rows the caller filed themselves are now excluded.

### Verified by probe, after 025

| behaviour | result |
|---|---|
| seeker sets own `role = 'admin'` | blocked |
| seeker rewrites own `email` | blocked |
| seeker points `company_id` at another company | blocked |
| seeker edits name/phone/headline | still works |
| insert an application with `status = 'hired'` | blocked |
| employer files an application | blocked |
| seeker files their own application | still works |
| admin changes someone's role | still works |
| `anon` inserts an application | permission denied for table |
| `anon` calls `submit_guest_application` | permission denied for function |
| `anon` uploads to `cvs` | RLS violation |
| `service_role` writes a guest application | 1 row |

### Two lessons worth keeping

1. **RLS is row-level. It says nothing about columns.** Every policy of the form
   `auth.uid() = id` on a table that holds a privilege column needs a trigger
   beside it. This one shipped as part of the migration that *fixed* the RLS
   recursion, and survived a prior security review.
2. **A comment asserting an invariant is not the invariant.** `app/jobs/actions.ts`
   claimed a signed-in applicant's address "is never read from the form", which
   was true and beside the point: it was read from `profiles.email`, which the
   same user could rewrite. It now comes from `auth.users` via the session.

## Still open

- **Leaked-password protection** is still off (Supabase → Auth → Policies). The
  only advisor finding that is not a deliberate design choice.
- **Keep email confirmation on.** Migration 006 treats a confirmed address as
  proof of ownership, so turning it off would make the claim flow an
  account-takeover path onto a decade of other people's contact details.
- **`types/database.ts` is hand-maintained** across 23 migrations. Replace it
  with `supabase gen types typescript --project-id khdvagjfonbiezkybpvh`.
- **No automated assertion of any of the above.** The probe table is a snapshot
  of one afternoon, not a regression test.

### Resolved

- The CV archive is migrated: 3,936 rows repointed to R2, 0 failures, 1,214 MB.
  178 rows remain unrecoverable — they reference 2015–2019 uploads and the
  recovered archive starts 2023-04-01.
- The legacy `https://jobs.pac.africa/wp-content/...` URLs do **not** resolve.
  That was recorded here as "they do still resolve", which was wrong: the domain
  moved to Vercel, so those paths hit Next.js and 404. Anything still holding one
  renders as "pending migration" rather than as a dead link.

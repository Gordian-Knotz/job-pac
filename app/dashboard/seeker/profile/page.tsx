import { Check } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { signMyProfileCv } from "@/lib/cv-actions";
import { CV_ACCEPT, CV_MAX_BYTES, cvStatus } from "@/lib/cv";
import { avatarUrl, IMAGE_ACCEPT } from "@/lib/avatar";
import { CvLink } from "@/components/cv-link";
import { PageHead } from "@/components/dashboard-shell";
import { Avatar, Flash } from "@/components/dashboard-ui";
import { completeness, profileChecklist } from "@/lib/profile";
import { cv as cvCopy, dash } from "@/lib/content";
import { updateProfile, uploadAvatar, uploadCv } from "../actions";

export default async function SeekerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; cv?: string; avatar?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireProfile("seeker");
  const params = await searchParams;

  const avatarSrc = await avatarUrl(supabase, profile.avatar_url);
  const cvSt = cvStatus(profile.cv_url);
  const hasUsableCv = cvSt === "ready";

  const checks = profileChecklist(profile, hasUsableCv);
  const progress = completeness(checks);
  const outstanding = checks.filter((c) => !c.done);

  return (
    <div>
      <PageHead
        eyebrow="Your details"
        title={dash.seeker.profileTitle}
        sub={dash.seeker.profileSub}
      />

      <Flash
        error={params.error}
        success={
          params.error
            ? null
            : params.cv
              ? "CV uploaded."
              : params.avatar
                ? "Photo updated."
                : params.saved
                  ? "Profile saved."
                  : null
        }
      />

      {/* COMPLETENESS -------------------------------------------------
          Named against what an employer sees, not against database columns,
          and only listing fields a seeker can actually finish. */}
      <section className="clay mb-8 p-6">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-lg font-600 text-ink">
            {progress.percent === 100 ? "Your profile is complete" : "Finish your profile"}
          </h2>
          <span className="font-mono text-xs text-muted">
            {progress.done}/{progress.total}
          </span>
        </div>

        <div
          className="clay-inset h-1.5 overflow-hidden rounded-pill"
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completeness"
        >
          <div
            className="h-full rounded-pill bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        {outstanding.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {outstanding.map((check) => (
              <li key={check.label} className="text-sm">
                <span className="font-500 text-ink">{check.label}</span>
                <span className="text-muted"> — {check.why}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">
            Nothing outstanding. Applications will carry all of this across.
          </p>
        )}
      </section>

      {/* PHOTO ------------------------------------------------------- */}
      <section className="clay mb-8 p-6">
        <h2 className="font-display text-lg font-600 text-ink">Photo</h2>
        <p className="mb-4 mt-1 max-w-lg text-sm text-muted">
          Optional. Shown to employers you have applied to, alongside your name — nowhere
          public, and never on a listing.
        </p>
        <form action={uploadAvatar} className="flex flex-wrap items-center gap-4">
          <Avatar
            name={profile.full_name}
            email={profile.email}
            src={avatarSrc}
            size={56}
          />
          <label htmlFor="avatar" className="sr-only">
            Choose a photo
          </label>
          <input
            id="avatar"
            type="file"
            name="avatar"
            accept={IMAGE_ACCEPT}
            required
            className="min-w-0 flex-1 text-sm text-ink file:mr-3 file:cursor-pointer file:rounded-card file:border file:border-line file:bg-surface-raised file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:border-accent"
          />
          <button type="submit" className="btn-secondary shrink-0">
            {profile.avatar_url ? "Replace photo" : "Upload photo"}
          </button>
        </form>
        <p className="mt-2 text-xs text-muted">JPEG, PNG or WebP, up to 2MB.</p>
      </section>

      {/* CV ---------------------------------------------------------- */}
      <section className="clay mb-8 p-6">
        <h2 className="font-display text-lg font-600 text-ink">Curriculum vitae</h2>
        <p className="mb-4 mt-1 text-sm text-muted">{cvCopy.constraint}</p>

        {cvSt === "legacy" && (
          <p className="mb-4 rounded-card border border-line px-4 py-3 text-sm text-muted">
            We hold a CV for you from the previous version of this site, but it is not
            readable yet while we move those files across. Uploading it again here is the
            quickest way to have it attached to your account.
          </p>
        )}

        {hasUsableCv && (
          <p className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <Check className="h-4 w-4 shrink-0 text-accent-text" aria-hidden />
            <span className="text-ink">{cvCopy.onFile}</span>
            <CvLink status={cvSt} onOpen={signMyProfileCv} compact />
          </p>
        )}

        <form action={uploadCv} className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="cv" className="sr-only">
            Choose a CV to upload
          </label>
          <input
            id="cv"
            type="file"
            name="cv"
            accept={CV_ACCEPT}
            required
            className="min-w-0 flex-1 text-sm text-ink file:mr-3 file:cursor-pointer file:rounded-card file:border file:border-line file:bg-surface-raised file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:border-accent"
          />
          <button type="submit" className="btn-secondary shrink-0">
            {hasUsableCv ? cvCopy.replace : cvCopy.upload}
          </button>
        </form>
        <p className="mt-2 text-xs text-muted">
          Maximum {Math.round(CV_MAX_BYTES / (1024 * 1024))}MB. Only you, PAC Africa, and
          employers you apply to can open it.
        </p>
      </section>

      {/* DETAILS ----------------------------------------------------- */}
      <form action={updateProfile} className="clay max-w-2xl space-y-5 p-6">
        <Field
          label="Full name"
          name="full_name"
          defaultValue={profile.full_name}
          hint="Employers see this instead of your email address."
        />
        <Field
          label="Headline"
          name="headline"
          defaultValue={profile.headline}
          placeholder="e.g. Finance graduate seeking entry-level roles"
        />

        <div>
          <label htmlFor="bio" className="eyebrow mb-2 block">
            About you
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={5}
            defaultValue={profile.bio ?? ""}
            className="field resize-y"
          />
        </div>

        <div>
          <label htmlFor="skills" className="eyebrow mb-2 block">
            Skills
          </label>
          <input
            id="skills"
            name="skills"
            defaultValue={profile.skills?.join(", ") ?? ""}
            placeholder="Comma separated — e.g. Excel, QuickBooks, IFRS"
            className="field"
          />
          {/* Echoing them back is how someone can tell the commas split the way
              they expected, without saving first. */}
          {profile.skills && profile.skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-pill bg-surface-raised px-2.5 py-1 text-xs text-ink"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        <Field label="Phone" name="phone" defaultValue={profile.phone} />
        <Field
          label="Location"
          name="address"
          defaultValue={profile.address}
          placeholder="e.g. Nairobi"
        />
        <Field
          label="LinkedIn"
          name="linkedin_url"
          defaultValue={profile.linkedin_url}
          placeholder="linkedin.com/in/your-name"
          hint="A full link or just your handle — both work."
        />

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <button type="submit" className="btn-primary">
            {dash.common.save}
          </button>
          <span className="text-xs text-muted">Signed in as {profile.email}</span>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  defaultValue: string | null;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="eyebrow mb-2 block">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        aria-describedby={hint ? `${name}-hint` : undefined}
        className="field"
      />
      {hint && (
        <p id={`${name}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

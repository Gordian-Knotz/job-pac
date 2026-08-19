import Link from "next/link";
import { Check } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { cvLink } from "@/lib/cv-access";
import { CV_ACCEPT } from "@/lib/cv";
import { CvLink } from "@/components/cv-link";
import { completeness, profileChecklist } from "@/lib/profile";
import { updateProfile, uploadCv } from "../actions";

export default async function SeekerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; cv?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireProfile("seeker");
  const params = await searchParams;

  const cv = await cvLink(supabase, profile.cv_url);
  const hasUsableCv = cv.kind === "supabase" || cv.kind === "r2";

  const checks = profileChecklist(profile, hasUsableCv);
  const progress = completeness(checks);
  const outstanding = checks.filter((c) => !c.done);

  return (
    <div>
      <span className="eyebrow">Your details</span>
      <h1 className="font-display text-3xl font-700 text-pac-ink mt-2 mb-2">
        Profile &amp; CV
      </h1>
      <p className="text-sm text-pac-muted mb-8 max-w-lg">
        These details fill in your applications automatically, so you only enter
        them once.
      </p>

      {params.error && (
        <p className="mb-6 text-sm text-red-600 border border-red-200 bg-red-50 rounded-card px-4 py-3">
          {params.error}
        </p>
      )}
      {(params.saved || params.cv) && !params.error && (
        <p className="mb-6 text-sm text-green-700 border border-green-200 bg-green-50 rounded-card px-4 py-3">
          {params.cv ? "CV uploaded." : "Profile saved."}
        </p>
      )}

      {/* COMPLETENESS -------------------------------------------------
          Named against what an employer sees, not against database columns,
          and only listing fields a seeker can actually finish. */}
      <section className="mb-10 rounded-card border border-pac-line bg-white p-6 shadow-stamp">
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <h2 className="font-display text-lg font-600 text-pac-ink">
            {progress.percent === 100
              ? "Your profile is complete"
              : "Finish your profile"}
          </h2>
          <span className="font-mono text-xs text-pac-muted">
            {progress.done}/{progress.total}
          </span>
        </div>

        <div
          className="h-1.5 rounded-full bg-pac-stone overflow-hidden"
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completeness"
        >
          <div
            className="h-full bg-pac-orange transition-[width] duration-500 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        {outstanding.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {outstanding.map((check) => (
              <li key={check.label} className="text-sm">
                <span className="text-pac-ink font-medium">{check.label}</span>
                <span className="text-pac-muted"> — {check.why}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-pac-muted">
            Nothing outstanding. Applications will carry all of this across.
          </p>
        )}
      </section>

      {/* CV ---------------------------------------------------------- */}
      <section className="mb-10 rounded-card border border-pac-line bg-white p-6 shadow-stamp">
        <h2 className="font-display text-lg font-600 text-pac-ink mb-1">
          Curriculum vitae
        </h2>
        <p className="text-sm text-pac-muted mb-4">PDF, up to 5MB.</p>

        {cv.kind === "legacy" && (
          <p className="mb-4 text-sm text-pac-muted border border-pac-line rounded-card px-4 py-3">
            We hold a CV for you from the previous version of this site, but it
            is not readable yet while we move those files across. Uploading it
            again here is the quickest way to have it attached to your account.
          </p>
        )}

        {hasUsableCv && (
          <p className="mb-4 flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-pac-orange-dark shrink-0" aria-hidden />
            <span className="text-pac-ink">On file.</span>
            <CvLink value={cv} compact />
          </p>
        )}

        <form action={uploadCv} className="flex flex-col sm:flex-row gap-3">
          <label htmlFor="cv" className="sr-only">
            Choose a CV to upload
          </label>
          <input
            id="cv"
            type="file"
            name="cv"
            accept={CV_ACCEPT}
            required
            className="flex-1 text-sm text-pac-ink file:mr-3 file:px-3 file:py-2 file:rounded-card file:border file:border-pac-line file:bg-pac-stone file:text-pac-ink file:text-sm file:font-medium hover:file:border-pac-orange file:cursor-pointer"
          />
          <button type="submit" className="btn-secondary shrink-0">
            {hasUsableCv ? "Replace CV" : "Upload CV"}
          </button>
        </form>
      </section>

      {/* DETAILS ----------------------------------------------------- */}
      <form action={updateProfile} className="space-y-4 max-w-xl">
        <Field
          label="Full name"
          name="full_name"
          defaultValue={profile.full_name}
          hint="Shown to employers on your applications."
        />
        <Field
          label="Headline"
          name="headline"
          defaultValue={profile.headline}
          placeholder="e.g. Finance graduate seeking entry-level roles"
        />

        <div>
          <label htmlFor="bio" className="eyebrow block mb-2">
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
          <label htmlFor="skills" className="eyebrow block mb-2">
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
            <div className="flex flex-wrap gap-1.5 mt-2">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-pac-stone px-2.5 py-1 text-xs text-pac-ink"
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

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button type="submit" className="btn-primary">
            Save profile
          </button>
          <span className="text-xs text-pac-muted">
            Signed in as {profile.email}
          </span>
        </div>
      </form>

      <p className="text-sm text-pac-muted mt-10">
        <Link href="/dashboard/seeker" className="text-pac-orange-dark hover:underline">
          Back to your applications
        </Link>
      </p>
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
      <label htmlFor={name} className="eyebrow block mb-2">
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
        <p id={`${name}-hint`} className="text-xs text-pac-muted mt-1.5">
          {hint}
        </p>
      )}
    </div>
  );
}

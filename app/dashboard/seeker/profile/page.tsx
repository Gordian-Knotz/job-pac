import { requireProfile } from "@/lib/auth";
import { cvLink, CV_ACCEPT } from "@/lib/supabase/storage";
import { CvLink } from "@/components/cv-link";
import { updateProfile, uploadCv } from "../actions";

const inputClass =
  "w-full px-3 py-2.5 rounded-card border border-pac-line text-sm focus:border-pac-orange outline-none bg-white";

export default async function SeekerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; cv?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireProfile("seeker");
  const params = await searchParams;

  const cv = await cvLink(supabase, profile.cv_url);

  return (
    <div>
      <span className="eyebrow">Your details</span>
      <h1 className="font-display text-3xl font-700 text-pac-ink mt-2 mb-8">
        Profile &amp; CV
      </h1>

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

      {/* CV ------------------------------------------------------------ */}
      <section className="mb-10 rounded-card border border-pac-line bg-white p-6 shadow-stamp">
        <h2 className="font-display text-lg font-600 text-pac-ink mb-1">
          Curriculum vitae
        </h2>
        <p className="text-sm text-pac-muted mb-4">PDF, up to 5MB.</p>

        {cv.kind === "legacy" && (
          <p className="mb-4 text-sm text-pac-muted border border-pac-line rounded-card px-4 py-3">
            Your CV on file is still held on the previous version of this site.
            You can open it below — uploading it again here keeps it with your
            account.
          </p>
        )}

        {cv.kind !== "none" && (
          <p className="mb-4 text-sm">
            <CvLink value={cv} />
          </p>
        )}

        <form action={uploadCv} className="flex flex-col sm:flex-row gap-3">
          <input
            type="file"
            name="cv"
            accept={CV_ACCEPT}
            required
            className="flex-1 text-sm text-pac-ink file:mr-3 file:px-3 file:py-2 file:rounded-card file:border file:border-pac-line file:bg-pac-stone file:text-pac-ink file:text-sm file:font-medium hover:file:border-pac-orange file:cursor-pointer"
          />
          <button
            type="submit"
            className="bg-pac-ink text-pac-paper px-4 py-2.5 rounded-card text-sm font-medium hover:bg-pac-orange transition-colors shrink-0"
          >
            {cv.kind === "storage" ? "Replace CV" : "Upload CV"}
          </button>
        </form>
      </section>

      {/* DETAILS ------------------------------------------------------- */}
      <form action={updateProfile} className="space-y-4 max-w-xl">
        <Field label="Full name" name="full_name" defaultValue={profile.full_name} />
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
            className={`${inputClass} resize-none`}
          />
        </div>
        <Field
          label="Skills"
          name="skills"
          defaultValue={profile.skills?.join(", ") ?? null}
          placeholder="Comma separated — e.g. Excel, QuickBooks, IFRS"
        />
        <Field label="Phone" name="phone" defaultValue={profile.phone} />
        <Field label="Location" name="address" defaultValue={profile.address} />
        <Field
          label="LinkedIn"
          name="linkedin_url"
          type="url"
          defaultValue={profile.linkedin_url}
          placeholder="https://linkedin.com/in/…"
        />

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            className="bg-pac-orange text-white px-5 py-2.5 rounded-card text-sm font-medium hover:bg-pac-orange-dark transition-colors"
          >
            Save profile
          </button>
          <span className="text-xs text-pac-muted">
            {profile.email} — email changes are not supported yet
          </span>
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
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string | null;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="eyebrow block mb-2">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

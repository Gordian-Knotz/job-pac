import Link from "next/link";
import { Download, Shield, Trash2 } from "lucide-react";
import { Flash } from "@/components/dashboard-ui";
import { dash, site } from "@/lib/content";
import { roleLabel } from "@/lib/dashboard-nav";
import { changePassword } from "@/app/dashboard/settings-actions";
import type { Profile } from "@/types/database";

/**
 * Settings, shared by all three roles.
 *
 * Only things that actually work are on here. There is no email-notification
 * toggle, because nothing sends email yet, and a switch that changes nothing is
 * worse than an absence — it makes a promise the product does not keep.
 *
 * The data section exists because this product holds CVs and contact details for
 * thousands of people, and the Kenya Data Protection Act 2019 gives them the
 * right to a copy and to erasure. Export is a route handler; deletion is a
 * mailed request, because it needs a human to decide what an employer must keep.
 */
export function SettingsPanel({
  profile,
  updated,
  error,
  exportHref,
}: {
  profile: Profile;
  updated?: string;
  error?: string;
  /** Omitted for admins, whose own data is not the point of an export. */
  exportHref?: string;
}) {
  return (
    <div className="max-w-2xl space-y-6">
      <Flash
        error={error}
        success={updated === "password" ? dash.settings.passwordChanged : null}
      />

      {/* ACCOUNT ------------------------------------------------------ */}
      <section className="clay p-6">
        <h2 className="font-display text-lg font-600 text-ink">
          {dash.settings.accountTitle}
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="eyebrow">{dash.settings.email}</dt>
            <dd className="mt-1 text-ink">{profile.email}</dd>
            <dd className="mt-1 text-xs text-muted">{dash.settings.emailHint}</dd>
          </div>
          <div>
            <dt className="eyebrow">{dash.settings.role}</dt>
            <dd className="mt-1 text-ink">{roleLabel[profile.role]}</dd>
          </div>
          <div>
            <dt className="eyebrow">{dash.settings.joined}</dt>
            <dd className="mt-1 text-ink">
              {new Date(profile.created_at).toLocaleDateString("en-KE", {
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
        </dl>
      </section>

      {/* PASSWORD ---------------------------------------------------- */}
      <section className="clay p-6">
        <h2 className="font-display text-lg font-600 text-ink">
          {dash.settings.passwordTitle}
        </h2>
        <p className="mt-1 text-sm text-muted">{dash.settings.passwordHint}</p>
        <form action={changePassword} className="mt-4 space-y-4">
          <div>
            <label htmlFor="password" className="eyebrow mb-2 block">
              {dash.settings.passwordLabel}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              className="field"
            />
          </div>
          <div>
            <label htmlFor="password_confirm" className="eyebrow mb-2 block">
              {dash.settings.passwordConfirmLabel}
            </label>
            <input
              id="password_confirm"
              name="password_confirm"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              className="field"
            />
          </div>
          <button type="submit" className="btn-primary">
            {dash.settings.passwordCta}
          </button>
        </form>
      </section>

      {/* DATA -------------------------------------------------------- */}
      <section className="clay p-6">
        <h2 className="font-display text-lg font-600 text-ink">
          {dash.settings.dataTitle}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {dash.settings.dataBody}
        </p>

        <div className="mt-5 space-y-4">
          {exportHref && (
            <div>
              <a href={exportHref} className="btn-secondary" download>
                <Download className="h-4 w-4" aria-hidden />
                {dash.settings.dataExport}
              </a>
              <p className="mt-1.5 text-xs text-muted">{dash.settings.dataExportHint}</p>
            </div>
          )}

          <div>
            <a
              href={`mailto:it@pac.africa?subject=${encodeURIComponent(
                "Data deletion request"
              )}&body=${encodeURIComponent(
                `Please delete the data held for ${profile.email}.`
              )}`}
              className="btn-ghost border-line"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {dash.settings.dataDelete}
            </a>
            <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-muted">
              {dash.settings.dataDeleteHint}
            </p>
          </div>

          <p className="pt-1 text-sm">
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1.5 text-accent-text transition-opacity duration-150 hover:opacity-70"
            >
              <Shield className="h-3.5 w-3.5" aria-hidden />
              {dash.settings.privacy}
            </Link>
          </p>
        </div>
      </section>

      {/* SIGN OUT ---------------------------------------------------- */}
      <section className="clay p-6">
        <h2 className="font-display text-lg font-600 text-ink">
          {dash.settings.signOutTitle}
        </h2>
        <form action="/auth/signout" method="post" className="mt-4">
          <button type="submit" className="btn-secondary">
            {dash.settings.signOut}
          </button>
        </form>
        <p className="mt-3 text-xs text-muted">
          {site.name} · {site.domain}
        </p>
      </section>
    </div>
  );
}

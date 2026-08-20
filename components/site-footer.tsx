import Link from "next/link";
import { Logo } from "@/components/logo";
import { footer, nav, site } from "@/lib/content";

/**
 * Social links and a phone number don't exist yet — no real accounts or
 * support line to point to. Rendered as inert placeholders rather than
 * either omitting them or wiring up dead `href="#"` anchors: no `href` at
 * all, so nothing crawls into or tab-stops onto a target that goes nowhere.
 * Swap `PLACEHOLDER_SOCIALS` for real hrefs (and the phone span for a real
 * `tel:` link) the day these exist.
 */
const PLACEHOLDER_SOCIALS = ["LinkedIn", "X"];

export function SiteFooter() {
  return (
    <footer className="mt-24 px-4 pb-6">
      <div className="clay mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Logo height={42} className="mb-3" />
            <p className="text-sm text-muted">{footer.rights(new Date().getFullYear())}</p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Link
              href="/jobs"
              className="text-muted transition-colors duration-150 ease-out hover:text-ink"
            >
              {nav.browse}
            </Link>
            <Link
              href="/employers"
              className="text-muted transition-colors duration-150 ease-out hover:text-ink"
            >
              For employers
            </Link>
            {/* Required to be reachable from every page — we hold CVs. */}
            <Link
              href="/privacy"
              className="text-muted transition-colors duration-150 ease-out hover:text-ink"
            >
              Data &amp; cookies
            </Link>
            <Link
              href="/terms"
              className="text-muted transition-colors duration-150 ease-out hover:text-ink"
            >
              Terms of service
            </Link>
          </nav>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-line pt-5 text-xs text-faint">
          <a
            href="mailto:it@pac.africa"
            className="text-muted transition-colors duration-150 ease-out hover:text-ink"
          >
            it@pac.africa
          </a>
          <div className="flex items-center gap-x-4">
            <span>Phone — coming soon</span>
            {PLACEHOLDER_SOCIALS.map((label) => (
              <span key={label}>{label} — coming soon</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { Logo } from "@/components/logo";
import { footer, nav, site } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="mt-24 px-4 pb-6">
      <div className="clay mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between">
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
        </nav>
      </div>
    </footer>
  );
}

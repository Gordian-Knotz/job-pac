import Link from "next/link";
import Image from "next/image";
import { footer, nav, site } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="mt-24 px-4 pb-6">
      <div className="clay mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between">
        <div>
          <Image
            src="/pac-logo.png"
            alt={site.owner}
            width={591}
            height={221}
            className="mb-3 h-9 w-auto"
          />
          <p className="text-sm text-muted">{footer.rights(new Date().getFullYear())}</p>
        </div>

        <nav className="flex items-center gap-5 text-sm">
          <Link
            href="/jobs"
            className="text-muted transition-colors duration-150 ease-out hover:text-ink"
          >
            {nav.browse}
          </Link>
          <Link
            href="/auth/signup"
            className="text-muted transition-colors duration-150 ease-out hover:text-ink"
          >
            {nav.post}
          </Link>
        </nav>
      </div>
    </footer>
  );
}

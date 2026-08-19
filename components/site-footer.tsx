import Link from "next/link";
import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="border-t border-pac-line mt-24">
      <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row md:items-center justify-between gap-6 text-sm text-pac-muted">
        <div>
          {/* Larger here than in the header, where the strapline would be
              illegible at nav height. */}
          <Image
            src="/pac-logo.png"
            alt="PAC Africa — Priority Activator Consulting"
            width={591}
            height={221}
            className="h-10 w-auto mb-3"
          />
          <p>
            &copy; {new Date().getFullYear()} PAC Africa. Connecting Kenyan
            talent with vetted employers since 2014.
          </p>
        </div>

        <nav className="flex items-center gap-6">
          <Link href="/jobs" className="hover:text-pac-orange-dark transition-colors">
            Browse jobs
          </Link>
          <Link
            href="/auth/register"
            className="hover:text-pac-orange-dark transition-colors"
          >
            Post a job
          </Link>
        </nav>
      </div>
    </footer>
  );
}

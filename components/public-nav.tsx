"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme";
import { nav, site } from "@/lib/content";

export type NavLinks = {
  /** Resolved on the server so the gate never flashes the wrong destination. */
  postHref: string;
  dashboardHref: string | null;
  signedIn: boolean;
};

export function PublicNav({ postHref, dashboardHref, signedIn }: NavLinks) {
  const { scrollY } = useScroll();
  const [compact, setCompact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Brief §2: compress past 60px.
  useMotionValueEvent(scrollY, "change", (y) => setCompact(y > 60));

  // Close on route change — otherwise the overlay survives navigation.
  useEffect(() => setMenuOpen(false), [pathname]);

  // A full-screen overlay must not leave the page behind it scrollable.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 px-4 pt-4">
        <motion.div
          // Height and shadow are the whole scroll effect. Animating them via
          // Framer keeps it interruptible if the user scrolls back up mid-way.
          animate={{
            paddingTop: compact ? 8 : 14,
            paddingBottom: compact ? 8 : 14,
          }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className={`clay translucent mx-auto flex max-w-6xl items-center gap-3 px-4
                      transition-[box-shadow,background-color] duration-300 ease-out
                      ${compact ? "shadow-clay-lifted bg-surface/80 backdrop-blur-xl" : ""}`}
        >
          <Link
            href="/"
            className="flex shrink-0 items-center gap-3"
            aria-label={`${site.name} home`}
          >
            <Image
              src="/pac-logo.png"
              alt={site.owner}
              width={591}
              height={221}
              priority
              className="h-7 w-auto"
            />
            <span className="hidden h-5 w-px bg-line sm:block" aria-hidden />
            <span className="eyebrow hidden sm:block">Jobs</span>
          </Link>

          <div className="ml-auto hidden items-center gap-1.5 md:flex">
            <Link href="/jobs" className="btn-ghost">
              {nav.browse}
            </Link>
            <Link href={postHref} className="btn-primary">
              {nav.post}
            </Link>
            {signedIn && dashboardHref ? (
              <>
                <Link href={dashboardHref} className="btn-ghost">
                  {nav.dashboard}
                </Link>
                <form action="/auth/signout" method="post">
                  <button type="submit" className="btn-ghost">
                    {nav.signOut}
                  </button>
                </form>
              </>
            ) : (
              <Link href="/auth/login" className="btn-ghost text-xs">
                {nav.signIn}
              </Link>
            )}
            <ThemeToggle className="ml-1" />
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={nav.openMenu}
            aria-expanded={menuOpen}
            className="press ml-auto grid h-9 w-9 place-items-center rounded-pill text-ink md:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </motion.div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-xl md:hidden"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              className="flex h-full flex-col p-6"
            >
              <div className="flex items-center justify-between">
                <Image
                  src="/pac-logo.png"
                  alt={site.owner}
                  width={591}
                  height={221}
                  className="h-7 w-auto"
                />
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label={nav.closeMenu}
                  className="press grid h-10 w-10 place-items-center rounded-pill text-ink"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>

              {/* Generous tap targets, per the brief. */}
              <nav className="mt-10 flex flex-col gap-2">
                <Link href="/jobs" className="clay px-5 py-4 text-lg text-ink">
                  {nav.browse}
                </Link>
                <Link href={postHref} className="clay px-5 py-4 text-lg text-accent-text">
                  {nav.post}
                </Link>
                {signedIn && dashboardHref ? (
                  <>
                    <Link href={dashboardHref} className="clay px-5 py-4 text-lg text-ink">
                      {nav.dashboard}
                    </Link>
                    <form action="/auth/signout" method="post">
                      <button type="submit" className="clay w-full px-5 py-4 text-left text-lg text-muted">
                        {nav.signOut}
                      </button>
                    </form>
                  </>
                ) : (
                  <Link href="/auth/login" className="clay px-5 py-4 text-lg text-ink">
                    {nav.signIn}
                  </Link>
                )}
              </nav>

              <div className="mt-auto flex items-center justify-between pt-8">
                <span className="eyebrow">{nav.themeToggle}</span>
                <ThemeToggle />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

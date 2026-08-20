import type { Metadata } from "next";
import { Source_Serif_4, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WebAnalytics } from "@/components/web-analytics";
import { AmbientBackground } from "@/components/ambient-background";
import { ThemeProvider } from "@/components/theme";
import { site } from "@/lib/content";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-source-serif",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: `Jobs | ${site.owner}`,
  description: "Vetted opportunities across Kenya and East Africa — from PAC Africa.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning is required by next-themes: it writes the theme
    // class onto <html> before paint, which the server render cannot predict.
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sourceSerif.variable} ${plexSans.variable} ${plexMono.variable} font-body antialiased`}
      >
        <ThemeProvider>
          <AmbientBackground />
          <SiteHeader />
          <main className="min-h-screen">{children}</main>
          <SiteFooter />
          <WebAnalytics />
        </ThemeProvider>
      </body>
    </html>
  );
}

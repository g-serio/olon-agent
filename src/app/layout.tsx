import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

/* Font stack mirrors jsonpages-platform exactly:
   - Sans:    Geist     (body, UI)
   - Mono:    Geist Mono (code, monospaced numbers)
   - Display: Merriweather Variable (loaded via @fontsource in globals.css)

   Source: JPS uses next/font/google's Geist exports (Next 16+).
   OlonAgent is still on Next 14.2.5 which doesn't ship Geist via
   next/font/google, so we use the standalone `geist` package — it
   exposes the same CSS variable names (--font-geist-sans /
   --font-geist-mono) so globals.css token bridge works unchanged. */

export const metadata: Metadata = {
  title: "OlonAgent — Tenant generator",
  description:
    "Two-agent pipeline that turns your design system into a working OlonJS v1.6 tenant.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}

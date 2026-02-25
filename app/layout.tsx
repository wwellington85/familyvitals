import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";

export const metadata = {
  title: "FamilyVitals",
  description: "Personal + family health hub",
  appleWebApp: {
    capable: true,
    title: "FamilyVitals",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1b756b"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PwaRegister />
        <header className="border-b border-border bg-card/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
            <Link href="/profiles" className="text-xl font-semibold tracking-tight">
              FamilyVitals
            </Link>
            <nav className="hidden text-sm text-muted-foreground md:block">All data is profile-scoped and timeline-based.</nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">{children}</main>
      </body>
    </html>
  );
}

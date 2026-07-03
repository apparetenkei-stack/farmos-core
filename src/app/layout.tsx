import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "FarmOS Core",
  description: "Crop Cycle Read-only UI Foundation"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="site-shell">
          <header className="site-header">
            <nav aria-label="Primary navigation">
              <Link href="/">FarmOS Core</Link>
              <Link href="/crop-cycles">Crop Cycles</Link>
            </nav>
          </header>
          <main>{children}</main>
          <footer className="site-footer">
            Day22 Crop Cycle Read-only UI Foundation / No write routes / No mutation UI
          </footer>
        </div>
      </body>
    </html>
  );
}

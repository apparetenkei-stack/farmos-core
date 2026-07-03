import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "FarmOS Core",
  description: "Local FarmOS Core read-only UI foundation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <header>
          <nav>
            <Link href="/">FarmOS Core</Link>
            {" | "}
            <Link href="/crop-cycles">Crop Cycles</Link>
            {" | "}
            <Link href="/proposals">AI Proposal Inbox</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}

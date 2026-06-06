import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "SEA Ops Agent",
  description: "Autonomous marketplace operations command center for SEA sellers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <Link className="brand" href="/">
              <span className="brandMark">SEA</span>
              <span>
                <strong>Ops Agent</strong>
                <small>Marketplace command center</small>
              </span>
            </Link>
            <nav className="nav">
              <Link href="/">Issues</Link>
              <Link href="/approvals">Approvals</Link>
            </nav>
            <div className="sidebarNote">
              Exception-first workflow across Shopee, Lazada, TikTok Shop, WhatsApp, couriers, suppliers, and ads.
            </div>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}

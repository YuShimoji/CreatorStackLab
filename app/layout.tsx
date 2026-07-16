import type { Metadata } from "next";
import Link from "next/link";
import { MyStackProvider } from "../components/MyStackProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://creator-stack-lab.thankyoukass.chatgpt.site"),
  title: {
    default: "Creator Stack Lab｜制作環境の適合性を確認",
    template: "%s｜Creator Stack Lab",
  },
  description: "制作ソフトの権利・出力条件と、配信・録音機材の構成適合を、公式情報と検証状態から確認するデータベース。",
  openGraph: {
    title: "Creator Stack Lab",
    description: "作ったものを使えるか。手元の構成で動くか。公式情報と検証状態から確認する。",
    type: "website",
    locale: "ja_JP",
  },
  twitter: { card: "summary", title: "Creator Stack Lab" },
  alternates: { canonical: "/" },
  robots: { index: false, follow: false },
};

const navItems = [
  ["今日", "/status"],
  ["My Stack", "/my-stack"],
  ["ソフト適合", "/softwares"],
  ["構成適合", "/setups"],
  ["比較", "/compare"],
  ["変更", "/changes"],
  ["検証方針", "/policy"],
] as const;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <MyStackProvider>
        <a className="skip-link" href="#main-content">本文へ移動</a>
        <header className="site-header">
          <div className="header-inner">
            <Link className="brand" href="/" aria-label="Creator Stack Lab ホーム">
              <span className="brand-mark" aria-hidden="true">CS</span>
              <span><strong>Creator Stack Lab</strong><small>制作スタック適合台帳</small></span>
            </Link>
            <nav className="global-nav" aria-label="主要ナビゲーション">
              {navItems.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
            </nav>
          </div>
        </header>
        <main id="main-content">{children}</main>
        <footer className="site-footer">
          <div className="footer-inner">
            <p><strong>Creator Stack Lab</strong> — 推測を結論にせず、条件と未知を保存する。</p>
            <p>このサイトは法的助言ではありません。重要な利用前には原文と提供元へ再確認してください。</p>
          </div>
        </footer>
        </MyStackProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { SetupExplorer } from "../../components/SetupExplorer";

export const metadata: Metadata = {
  title: "構成適合一覧",
  description: "端末、OS、配信・録音アプリ、オーディオインターフェース、給電を具体的な接続経路として確認。",
  alternates: { canonical: "/setups" },
};

export default async function SetupListPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const one = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  return (
    <div className="section-shell page-shell">
      <header className="page-intro"><p className="section-kicker">DEVICE & SIGNAL PATH</p><h1>構成適合</h1><p>対応製品という曖昧な単位ではなく、端末から配信・録音アプリへ届く経路を読み解きます。</p></header>
      <SetupExplorer initial={{ q: one("q"), purpose: one("purpose"), device: one("device"), os: one("os"), app: one("app"), interface: one("interface"), power: one("power"), stereo: one("stereo"), loopback: one("loopback"), evidence: one("evidence"), verdict: one("verdict") }} />
    </div>
  );
}

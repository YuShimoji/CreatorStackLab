import type { Metadata } from "next";
import { SoftwareExplorer } from "../../components/SoftwareExplorer";

export const metadata: Metadata = {
  title: "ソフト適合一覧",
  description: "動画編集ソフトと日本語TTSの商用利用、帰属表示、納品、組み込み、出力形式を用途別に確認。",
  alternates: { canonical: "/softwares" },
};

export default async function SoftwareListPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const one = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  return (
    <div className="section-shell page-shell">
      <header className="page-intro"><p className="section-kicker">RIGHTS & OUTPUT</p><h1>ソフト適合</h1><p>「何が一番良いか」ではなく、あなたの用途でどの条件を満たせば使えるかを確認します。</p></header>
      <SoftwareExplorer initial={{ q: one("q"), category: one("category"), platform: one("platform"), purpose: one("purpose"), verdict: one("verdict"), attribution: one("attribution"), format: one("format"), evidence: one("evidence") }} />
    </div>
  );
}

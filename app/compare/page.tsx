import type { Metadata } from "next";
import { CompareClient } from "../../components/CompareClient";

export const metadata: Metadata = { title: "ソフト適合を比較", description: "2〜3件のソフトウェアを、商用利用・帰属表示・納品・組み込み・出力形式・証拠種別で比較。", alternates: { canonical: "/compare" } };

export default async function ComparePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).ids;
  const initialIds = typeof raw === "string" ? raw.split(",").filter(Boolean) : [];
  return <div className="section-shell page-shell"><header className="page-intro"><p className="section-kicker">COMPARE CONDITIONS</p><h1>ソフト適合を比較</h1><p>点数や順位ではなく、用途ごとの許諾と納品条件を同じ軸で見比べます。</p></header><CompareClient initialIds={initialIds} /></div>;
}

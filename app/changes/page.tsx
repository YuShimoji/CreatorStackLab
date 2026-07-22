import type { Metadata } from "next";
import { ChangeRadar } from "../../components/ChangeRadar";

export const metadata: Metadata = { title: "変更レーダー", description: "価格、利用条件、対応OS、機能、サポート終了などの変更を履歴として確認します。", alternates: { canonical: "/changes" } };

export default function ChangesPage() {
  return <div className="section-shell page-shell"><header className="page-intro"><p className="section-kicker">CHANGE RADAR</p><h1>変更レーダー</h1><p>変更前、変更後、制作への影響、根拠を一件ずつ記録します。</p></header><ChangeRadar /></div>;
}

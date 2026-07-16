import type { Metadata } from "next";
import { StatusDashboard } from "../../components/StatusDashboard";

export const metadata: Metadata = { title: "今日の制作環境", description: "My Stackの状態、情報鮮度、重要変更をまとめて確認します。", alternates: { canonical: "/status" } };

export default function StatusPage() {
  return <div className="section-shell status-shell"><StatusDashboard /></div>;
}

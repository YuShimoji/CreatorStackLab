import type { Metadata } from "next";
import { MyStackClient } from "../../components/MyStackClient";

export const metadata: Metadata = { title: "My Stack", description: "このブラウザに保存した制作ソフトと機材構成を確認します。", alternates: { canonical: "/my-stack" } };

export default function MyStackPage() {
  return <div className="section-shell page-shell"><header className="page-intro"><p className="section-kicker">LOCAL WORKSPACE</p><h1>My Stack</h1><p>購入済み・利用中・検討中の制作環境を、このブラウザだけに保存します。アカウントやクラウド同期は使いません。</p></header><MyStackClient /></div>;
}

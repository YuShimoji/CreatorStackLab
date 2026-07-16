import type { Metadata } from "next";
import { VerdictBadge } from "../../components/Badges";

export const metadata: Metadata = { title: "検証方針・運営ポリシー", description: "Creator Stack Labの判定状態、証拠階層、実機検証、出典、訂正、広告・スポンサー方針。", alternates: { canonical: "/policy" } };

const evidenceRows = [
  ["実機検証済み", "記載の端末・OS・アプリ・機材・接続順で再現し、入力・出力・監視を記録した状態。"],
  ["公式情報確認済み・実機未検証", "メーカー、開発元、公式規約、公式マニュアルで確認したが、当サイトでは物理構成を再現していない状態。"],
  ["再現可能な第三者報告", "構成、バージョン、手順、結果が追試できる粒度で示された報告。公式情報とは別階層で扱う。"],
  ["未確認", "根拠がない、古い、対象アプリまで届かない等の理由で結論を保留している状態。"],
];

export default function PolicyPage() {
  return (
    <div className="section-shell page-shell policy-page">
      <header className="page-intro"><p className="section-kicker">VERIFICATION POLICY</p><h1>検証方針・運営ポリシー</h1><p>結論を強く見せるより、何を確認し、何が未確認かを読める状態にします。</p></header>
      <section className="policy-section"><h2>判定状態</h2><div className="policy-status-grid"><div><VerdictBadge verdict="適合" /><p>対象用途と構成について、確認範囲では追加条件なしに成立。</p></div><div><VerdictBadge verdict="条件付き適合" /><p>プラン、クレジット、接続、給電、設定等の条件を満たせば成立。</p></div><div><VerdictBadge verdict="不適合" /><p>対象経路では成立しない一次情報または再現結果がある。</p></div><div><VerdictBadge verdict="未確認" /><p>根拠不足。情報がないことを不適合に置き換えない。</p></div></div></section>
      <section className="policy-section"><h2>証拠種別</h2><div className="evidence-table">{evidenceRows.map(([label, description]) => <div key={label}><strong>{label}</strong><p>{description}</p></div>)}</div></section>
      <section className="policy-section"><h2>実機検証プロトコル</h2><ol className="protocol-list"><li><span>01</span><div><h3>構成を固定する</h3><p>端末、OS、アプリ版、オーディオI/F、マイク、ケーブル、アダプター、給電を記録します。</p></div></li><li><span>02</span><div><h3>経路を段階確認する</h3><p>入力認識、チャンネル、ステレオ／モノラル、モニター、ループバック、録音・配信先を順に確認します。</p></div></li><li><span>03</span><div><h3>条件と失敗を保存する</h3><p>成功だけでなく、成立しなかった設定と回避策、再現手順を記録します。</p></div></li><li><span>04</span><div><h3>時点を明示する</h3><p>確認日とバージョンを保存し、更新後は再検証前の結果を「現行確認済み」と扱いません。</p></div></li></ol></section>
      <section className="policy-section two-policy-columns"><div><h2>出典・訂正</h2><ul><li>メーカー、開発元、公式規約、公式マニュアルを優先します。</li><li>検索スニペットだけを根拠にせず、原文URLと確認日を保存します。</li><li>規約本文は転載せず、判断に必要な要点を要約します。</li><li>誤りを確認した場合は、判定・出典・変更履歴を同時に訂正します。</li></ul></div><div><h2>広告・提供・スポンサー</h2><ul><li>初版には広告、アフィリエイト、スポンサー表示はありません。</li><li>導入時は公式情報・公式販売・小売・アフィリエイトをデータ上で区別します。</li><li>提供品やスポンサーがある場合は、対象レコードと方針ページの双方で明示します。</li><li>収益の有無で判定順位や結論を変えません。</li></ul></div></section>
      <section className="legal-note"><h2>このサイトがしないこと</h2><p>本サイトは法的助言、契約解釈の保証、機材メーカーによる動作保証の代替ではありません。未確認情報を断定せず、重要な公開・納品・購入の前には、最新の原文と提供元へ再確認してください。</p></section>
    </div>
  );
}

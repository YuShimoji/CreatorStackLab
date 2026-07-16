"use client";

import Link from "next/link";
import { listCatalog, listChanges, listStatuses } from "../data/repository";
import type { ServiceStatus } from "../data/models";
import { useMyStack } from "./MyStackProvider";

const statusLabels: Record<ServiceStatus, string> = {
  operational: "正常", degraded: "性能低下", partial_outage: "一部停止", major_outage: "重大停止", maintenance: "メンテナンス", unknown: "不明",
};
const sourceLabels = { official_live: "公式ライブ", official_document: "公式文書", sample: "表示サンプル" } as const;

export function StatusDashboard() {
  const { ids, ready, previousVisit } = useMyStack();
  if (!ready) return <><section className="today-hero"><div><p className="section-kicker">CREATOR STACK OBSERVATORY</p><h1>今日の制作環境</h1><p>このブラウザのMy Stackを読み込んでいます。</p></div></section><div className="empty-state compact-empty" aria-live="polite"><span aria-hidden="true">…</span><h2>保存内容を確認中</h2><p>読み込みが終わるまで、状態を正常・異常のどちらにも数えません。</p></div></>;
  const catalog = listCatalog().filter((item) => ids.includes(item.id));
  const statuses = listStatuses().filter((item) => ids.includes(item.catalogId) && item.sourceMode !== "sample");
  const changes = listChanges().filter((item) => ids.includes(item.catalogId));
  const unknown = statuses.filter((item) => item.status === "unknown").length + catalog.filter((item) => !statuses.some((status) => status.catalogId === item.id)).length;
  const attention = statuses.filter((item) => ["degraded", "partial_outage", "major_outage", "maintenance"].includes(item.status)).length;
  const normal = statuses.filter((item) => item.status === "operational").length;
  const overdue = catalog.filter((item) => item.recheckAt < "2026-07-16").length;
  const sinceVisit = previousVisit ? changes.filter((item) => item.detectedAt > previousVisit.slice(0, 10)).length : changes.length;
  const visibleStatuses = listStatuses().filter((item) => ids.includes(item.catalogId) || item.sourceMode === "sample");
  const visibleChanges = changes.length ? changes : listChanges().slice(0, 3);

  return (
    <>
      <section className="today-hero" aria-labelledby="today-heading">
        <div><p className="section-kicker">CREATOR STACK OBSERVATORY</p><h1 id="today-heading">今日の制作環境</h1><p>{ready && ids.length ? `${ids.length}件のMy Stackを、状態・鮮度・変更で見ています。` : "My Stackを登録すると、購入後の確認対象だけに絞れます。"}</p></div>
        <div className="today-meta"><span>LAST CHECKED</span><time dateTime="2026-07-16">2026-07-16</time><small>ライブ状態の自動取得なし</small></div>
      </section>
      <section className="metric-grid" aria-label="今日の要約">
        <article><span>NORMAL / NO CHANGE</span><strong>{normal}</strong><p>公式ライブで正常確認</p></article>
        <article className={attention ? "metric-attention" : ""}><span>ATTENTION</span><strong>{attention}</strong><p>性能低下・停止・メンテ</p></article>
        <article className={unknown ? "metric-unknown" : ""}><span>UNKNOWN</span><strong>{unknown}</strong><p>ライブ状態を断定できない</p></article>
        <article><span>FRESHNESS OVERDUE</span><strong>{overdue}</strong><p>再確認期限を超過</p></article>
        <article><span>CHANGES SINCE VISIT</span><strong>{sinceVisit}</strong><p>{previousVisit ? `前回 ${previousVisit.slice(0, 10)}` : "初回の基準値"}</p></article>
      </section>
      {!ids.length && ready && <aside className="scope-note stack-nudge"><strong>My Stackが空です。</strong><p>下の変更は全体サンプルです。<Link href="/softwares">検索から追加</Link>すると自分の制作環境だけに絞れます。</p></aside>}
      <section className="observatory-section" aria-labelledby="important-heading"><div className="section-heading"><div><p className="section-kicker">IMPORTANT CHANGES</p><h2 id="important-heading">影響の大きい変更</h2></div><Link className="text-link" href="/changes">変更レーダーをすべて見る →</Link></div>
        <div className="change-list">{visibleChanges.map((item) => <article key={item.id} className={`change-row severity-${item.severity}`}><div><span>{item.type}</span><h3>{item.subject}</h3></div><p>{item.impact}</p><time dateTime={item.changedAt}>{item.changedAt}</time></article>)}</div>
      </section>
      <section className="observatory-section" aria-labelledby="status-heading"><div className="section-heading"><div><p className="section-kicker">CURRENT STATE</p><h2 id="status-heading">状態と出典</h2></div><p>「不明」は障害ではなく、現在状態を安全に断定できないという意味です。</p></div>
        {visibleStatuses.length ? <div className="status-grid">{visibleStatuses.map((item) => <article key={item.id} className={`status-card status-${item.status}`}><div className="card-topline"><span className="record-type">{sourceLabels[item.sourceMode]}</span><strong>{statusLabels[item.status]}</strong></div><h3>{item.subject}</h3><p>{item.impactedFeature}</p><small>{item.note}</small><div className="evidence-line"><a href={item.source.url}>{item.source.label}</a><time dateTime={item.checkedAt}>確認 {item.checkedAt}</time></div></article>)}</div> : <div className="empty-state compact-empty"><span aria-hidden="true">—</span><h2>登録項目の状態ソースはまだありません</h2><p>未接続を正常とは扱いません。My Stackの詳細と変更履歴は引き続き確認できます。</p></div>}
      </section>
    </>
  );
}

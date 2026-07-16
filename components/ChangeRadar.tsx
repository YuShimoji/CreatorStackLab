"use client";

import Link from "next/link";
import { useState } from "react";
import { findCatalogItem, listChanges } from "../data/repository";
import type { ObservationChangeView } from "../data/models";
import { useMyStack } from "./MyStackProvider";
import { useObservationSnapshot } from "./useObservationSnapshot";

const typeLabels: Record<string, string> = { feature_added: "機能追加", service_ended: "サービス終了", supported_os: "対応OS", pricing: "価格", plan: "プラン", commercial_terms: "商用条件", attribution: "表示条件", output_format: "出力形式", api_limit: "API制限", feature_removed: "機能削除", support_ended: "サポート終了", compatibility: "互換性" };
const reviewLabels: Record<ObservationChangeView["reviewStatus"], string> = { auto_applied: "機械可読事実・自動反映", pending: "要レビュー・未反映", approved: "レビュー承認済み", rejected: "レビュー却下", superseded: "後続変更で置換" };

export function ChangeRadar() {
  const { ids } = useMyStack();
  const { snapshot, loading, error } = useObservationSnapshot();
  const [onlyMine, setOnlyMine] = useState(false);
  const records = listChanges().filter((item) => !onlyMine || ids.includes(item.catalogId));
  const actualChanges = (snapshot?.changes ?? []).filter((item) => !onlyMine || ids.includes(item.entityId));
  const failures = (snapshot?.sources ?? []).filter((item) => item.status === "fetch_failed" && (!onlyMine || ids.includes(item.entityId)));

  return <>
    <div className="radar-toolbar"><label><input type="checkbox" checked={onlyMine} onChange={(event) => setOnlyMine(event.target.checked)} /> My Stackに関係する変更だけ</label><span>実観測 {actualChanges.length}件 ・ 登録文書 {records.length}件</span></div>
    <div className="source-layer-legend" aria-label="変更レイヤーの凡例"><span>実観測：D1の差分</span><span>公式文書：登録済み事実</span><span>表示サンプル：0件・集計外</span><span>取得失敗：サービス障害と分離</span></div>

    <section className="radar-section" aria-labelledby="actual-change-heading">
      <div className="section-heading"><div><p className="section-kicker">REAL OBSERVATION CHANGES</p><h2 id="actual-change-heading">実観測で検出した変化</h2></div><p>同じ hash、304、同じ前後組合せは重複イベントにしません。</p></div>
      {error && <aside className="observation-alert"><strong>実観測を取得できません。</strong><p>{error}</p></aside>}
      {failures.map((source) => <aside className="observation-alert" key={source.id}><strong>{source.title}：取得失敗</strong><p>最後に成功した値は保持しています。提供サービスの停止や不適合とは判定していません。</p></aside>)}
      {actualChanges.length ? <div className="radar-list">{actualChanges.map((item) => <ActualChangeCard item={item} key={item.id} />)}</div> : <div className="empty-state compact-empty"><span aria-hidden="true">{loading ? "…" : "0"}</span><h2>{loading ? "実観測を読み込んでいます" : "意味のある実変更は未検出です"}</h2><p>初回取得は基準値として保存し、変更イベントにはしません。</p></div>}
    </section>

    <section className="radar-section" aria-labelledby="registered-change-heading">
      <div className="section-heading"><div><p className="section-kicker">REGISTERED OFFICIAL DOCUMENTS</p><h2 id="registered-change-heading">登録済みの公式変更</h2></div><p>調査時点で公式文書から確認した履歴です。実観測件数とは別に数えます。</p></div>
      {records.length ? <div className="radar-list">{records.map((item) => <article key={item.id} className={`radar-card severity-${item.severity}`}>
        <header><div><span className="record-type">公式文書 ・ {typeLabels[item.type] ?? item.type} ・ {item.severity.toUpperCase()}</span><h2>{item.subject}</h2></div><time dateTime={item.changedAt}>{item.changedAt}</time></header>
        <dl className="before-after"><div><dt>変更前</dt><dd>{item.before}</dd></div><div><dt>変更後</dt><dd>{item.after}</dd></div></dl>
        <p className="change-impact"><strong>制作への影響</strong>{item.impact}</p>
        <footer><span>{item.confirmation === "confirmed" ? "公式文書で確認" : "要レビュー"}</span><a href={item.source.url} target="_blank" rel="noopener noreferrer">{item.source.label} ↗</a><Link href={item.historyHref}>対象の履歴へ →</Link></footer>
      </article>)}</div> : <div className="empty-state"><span aria-hidden="true">0</span><h2>該当する変更はありません</h2><p>My Stackへ項目を追加するか、絞り込みを解除してください。</p></div>}
    </section>
  </>;
}

function ActualChangeCard({ item }: { item: ObservationChangeView }) {
  const catalog = findCatalogItem(item.entityId);
  const pending = item.reviewStatus === "pending";
  return <article className={`radar-card ${pending ? "severity-high" : "severity-medium"}`}>
    <header><div><span className="record-type">実観測 ・ {reviewLabels[item.reviewStatus]}</span><h2>{item.sourceTitle}</h2></div><time dateTime={item.detectedAt}>{formatMoment(item.detectedAt)}</time></header>
    <dl className="before-after"><div><dt>変更前</dt><dd>{summarizeValues(item.previousValues)}</dd></div><div><dt>変更後</dt><dd>{summarizeValues(item.newValues)}</dd></div></dl>
    <p className="change-impact"><strong>扱い</strong>{pending ? "規約・商用条件の意味は未反映です。公式原文の人手確認が必要です。" : `公式の機械可読事実として反映しました（${item.materiality}）。Catalogの適合判定は変更していません。`}</p>
    <footer><span>{reviewLabels[item.reviewStatus]}</span><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">公式ソース ↗</a>{catalog && <Link href={`${catalog.href}#history`}>対象の履歴へ →</Link>}</footer>
  </article>;
}

function summarizeValues(values: Record<string, unknown>) {
  return Object.entries(values).map(([key, value]) => {
    const shown = typeof value === "string" && key.toLowerCase().includes("hash") ? `${value.slice(0, 12)}…` : String(value ?? "未設定");
    return `${key}: ${shown}`;
  }).join(" / ") || "記録なし";
}

function formatMoment(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(value));
}

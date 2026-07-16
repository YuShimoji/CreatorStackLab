"use client";

import Link from "next/link";
import { useState } from "react";
import { listChanges } from "../data/repository";
import { useMyStack } from "./MyStackProvider";

const typeLabels: Record<string, string> = { feature_added: "機能追加", service_ended: "サービス終了", supported_os: "対応OS", pricing: "価格", plan: "プラン", commercial_terms: "商用条件", attribution: "表示条件", output_format: "出力形式", api_limit: "API制限", feature_removed: "機能削除", support_ended: "サポート終了", compatibility: "互換性" };

export function ChangeRadar() {
  const { ids } = useMyStack();
  const [onlyMine, setOnlyMine] = useState(false);
  const records = listChanges().filter((item) => !onlyMine || ids.includes(item.catalogId));
  return <>
    <div className="radar-toolbar"><label><input type="checkbox" checked={onlyMine} onChange={(event) => setOnlyMine(event.target.checked)} /> My Stackに関係する変更だけ</label><span>{records.length}件</span></div>
    {records.length ? <div className="radar-list">{records.map((item) => <article key={item.id} className={`radar-card severity-${item.severity}`}>
      <header><div><span className="record-type">{typeLabels[item.type] ?? item.type} ・ {item.severity.toUpperCase()}</span><h2>{item.subject}</h2></div><time dateTime={item.changedAt}>{item.changedAt}</time></header>
      <dl className="before-after"><div><dt>変更前</dt><dd>{item.before}</dd></div><div><dt>変更後</dt><dd>{item.after}</dd></div></dl>
      <p className="change-impact"><strong>制作への影響</strong>{item.impact}</p>
      <footer><span>{item.confirmation === "confirmed" ? "公式文書で確認" : "要レビュー"}</span><a href={item.source.url} target="_blank" rel="noopener noreferrer">{item.source.label} ↗</a><Link href={item.historyHref}>対象の履歴へ →</Link></footer>
    </article>)}</div> : <div className="empty-state"><span aria-hidden="true">0</span><h2>該当する変更はありません</h2><p>My Stackへ項目を追加するか、絞り込みを解除してください。</p></div>}
  </>;
}

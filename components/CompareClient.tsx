"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listSoftware } from "../data/repository";
import type { SoftwareRecord, UseCaseVerdict } from "../data/models";
import { EvidenceBadge, VerdictBadge } from "./Badges";

type RowValue = string | UseCaseVerdict;
type CompareRow = { label: string; value: (record: SoftwareRecord) => RowValue };

const rows: CompareRow[] = [
  { label: "商用利用", value: (record) => record.commercialUseStatus },
  { label: "帰属表示", value: (record) => record.attributionRequirement },
  { label: "クライアント納品", value: (record) => record.clientDeliveryStatus },
  { label: "ゲーム組み込み", value: (record) => record.gameEmbeddingStatus },
  { label: "主な出力形式", value: (record) => record.outputFormats.join(" / ") },
  { label: "オフライン利用", value: (record) => record.offlineAvailability },
  { label: "プロジェクト移行性", value: (record) => record.projectPortability },
  { label: "最終確認日", value: (record) => record.verifiedAt },
  { label: "証拠種別", value: (record) => record.evidenceType },
];
const softwareRecords = listSoftware();

function normalized(value: RowValue) { return typeof value === "string" ? value : `${value.verdict}:${value.note}`; }
function Value({ value, evidence }: { value: RowValue; evidence?: boolean }) {
  if (typeof value === "string") return evidence ? <EvidenceBadge evidence={value as SoftwareRecord["evidenceType"]} /> : <>{value}</>;
  return <><VerdictBadge verdict={value.verdict} /><p>{value.note}</p></>;
}

export function CompareClient({ initialIds }: { initialIds: string[] }) {
  const validInitial = initialIds.filter((id) => softwareRecords.some((record) => record.id === id)).slice(0, 3);
  const [selected, setSelected] = useState<string[]>(validInitial);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  useEffect(() => { const params = new URLSearchParams(); if (selected.length) params.set("ids", selected.join(",")); window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`); }, [selected]);
  const records = selected.map((id) => softwareRecords.find((record) => record.id === id)!).filter(Boolean);
  const visibleRows = differencesOnly && records.length > 1 ? rows.filter((row) => new Set(records.map((record) => normalized(row.value(record)))).size > 1) : rows;
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);

  return <>
    <section className="compare-picker" aria-labelledby="compare-picker-heading">
      <div><h2 id="compare-picker-heading">比較するソフトを2〜3件選択</h2><p>選択中 {selected.length} / 3件。点数ではなく、条件の差を比較します。</p></div>
      <button type="button" onClick={() => setSelected([])} disabled={!selected.length}>すべて解除</button>
      <div className="compare-options">{softwareRecords.map((record) => { const checked = selected.includes(record.id); return <label key={record.id} className={checked ? "is-selected" : ""}><input type="checkbox" checked={checked} disabled={!checked && selected.length >= 3} onChange={() => toggle(record.id)} /><span><strong>{record.name}</strong><small>{record.category}</small></span><VerdictBadge verdict={record.verdict} /></label>; })}</div>
    </section>
    {records.length ? <section className="comparison-area" aria-labelledby="comparison-heading">
      <div className="section-heading compare-heading"><div><p className="section-kicker">SIDE BY SIDE</p><h2 id="comparison-heading">比較結果</h2></div><label className="difference-toggle"><input type="checkbox" checked={differencesOnly} onChange={(event) => setDifferencesOnly(event.target.checked)} /> 差分だけ表示</label></div>
      <div className="table-scroll" tabIndex={0} aria-label="ソフト適合比較表"><table className="comparison-table"><thead><tr><th scope="col">比較項目</th>{records.map((record) => <th scope="col" key={record.id}><Link href={`/softwares/${record.slug}`}>{record.name}</Link><button type="button" onClick={() => toggle(record.id)} aria-label={`${record.name}を比較から外す`}>× 外す</button></th>)}</tr></thead><tbody>{visibleRows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th>{records.map((record) => <td key={record.id}><Value value={row.value(record)} evidence={row.label === "証拠種別"} /></td>)}</tr>)}</tbody></table></div>
      <div className="mobile-comparison" data-testid="mobile-comparison">{visibleRows.map((row) => <section className="mobile-compare-field" key={row.label}><h3>{row.label}</h3>{records.map((record) => <article key={record.id}><h4><Link href={`/softwares/${record.slug}`}>{record.name}</Link></h4><div><Value value={row.value(record)} evidence={row.label === "証拠種別"} /></div></article>)}</section>)}</div>
    </section> : <div className="empty-state compact-empty"><span aria-hidden="true">—</span><h2>比較対象を選んでください</h2><p>上の候補から2〜3件選ぶと、条件が同じ項目単位で並びます。</p></div>}
  </>;
}

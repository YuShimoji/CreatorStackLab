"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { softwareRecords } from "../data/software";
import { EvidenceBadge, VerdictBadge } from "./Badges";

export function CompareClient({ initialIds }: { initialIds: string[] }) {
  const validInitial = initialIds.filter((id) => softwareRecords.some((record) => record.id === id)).slice(0, 3);
  const [selected, setSelected] = useState<string[]>(validInitial);
  useEffect(() => { const params = new URLSearchParams(); if (selected.length) params.set("ids", selected.join(",")); window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`); }, [selected]);
  const records = selected.map((id) => softwareRecords.find((record) => record.id === id)!).filter(Boolean);
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);
  const rows = [
    ["商用利用", (id: string) => softwareRecords.find((r) => r.id === id)!.commercialUseStatus],
    ["帰属表示", (id: string) => softwareRecords.find((r) => r.id === id)!.attributionRequirement],
    ["クライアント納品", (id: string) => softwareRecords.find((r) => r.id === id)!.clientDeliveryStatus],
    ["ゲーム組み込み", (id: string) => softwareRecords.find((r) => r.id === id)!.gameEmbeddingStatus],
    ["主な出力形式", (id: string) => softwareRecords.find((r) => r.id === id)!.outputFormats.join(" / ")],
    ["オフライン利用", (id: string) => softwareRecords.find((r) => r.id === id)!.offlineAvailability],
    ["プロジェクト移行性", (id: string) => softwareRecords.find((r) => r.id === id)!.projectPortability],
    ["最終確認日", (id: string) => softwareRecords.find((r) => r.id === id)!.verifiedAt],
    ["証拠種別", (id: string) => softwareRecords.find((r) => r.id === id)!.evidenceType],
  ] as const;
  return (
    <>
      <section className="compare-picker" aria-labelledby="compare-picker-heading"><div><h2 id="compare-picker-heading">比較するソフトを2〜3件選択</h2><p>選択中 {selected.length} / 3件。項目の優劣ではなく、条件の差を比較します。</p></div><button type="button" onClick={() => setSelected([])} disabled={!selected.length}>すべて解除</button>
        <div className="compare-options">{softwareRecords.map((record) => { const checked = selected.includes(record.id); return <label key={record.id} className={checked ? "is-selected" : ""}><input type="checkbox" checked={checked} disabled={!checked && selected.length >= 3} onChange={() => toggle(record.id)} /><span><strong>{record.name}</strong><small>{record.category}</small></span><VerdictBadge verdict={record.verdict} /></label>; })}</div>
      </section>
      {records.length ? <section className="comparison-area" aria-labelledby="comparison-heading"><div className="section-heading"><div><p className="section-kicker">SIDE BY SIDE</p><h2 id="comparison-heading">比較結果</h2></div><p>横にスクロールして全項目を確認できます。</p></div><div className="table-scroll" tabIndex={0} aria-label="ソフト適合比較表（横スクロール可能）"><table className="comparison-table"><thead><tr><th scope="col">比較項目</th>{records.map((record) => <th scope="col" key={record.id}><Link href={`/softwares/${record.slug}`}>{record.name}</Link><button type="button" onClick={() => toggle(record.id)} aria-label={`${record.name}を比較から外す`}>× 外す</button></th>)}</tr></thead><tbody>{rows.map(([label, getValue]) => <tr key={label}><th scope="row">{label}</th>{records.map((record) => { const value = getValue(record.id); return <td key={record.id}>{typeof value === "string" ? (label === "証拠種別" ? <EvidenceBadge evidence={record.evidenceType} /> : value) : <><VerdictBadge verdict={value.verdict} /><p>{value.note}</p></>}</td>; })}</tr>)}</tbody></table></div></section> : <div className="empty-state compact-empty"><span aria-hidden="true">—</span><h2>比較対象を選んでください</h2><p>上の候補から2〜3件選ぶと、条件が横並びになります。</p></div>}
    </>
  );
}

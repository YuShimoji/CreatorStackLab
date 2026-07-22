"use client";

import { useEffect, useMemo, useState } from "react";
import { listSoftware } from "../data/repository";
import { SoftwareCard } from "./RecordCards";

type Initial = { q?: string; category?: string; platform?: string; purpose?: string; verdict?: string; attribution?: string; format?: string; evidence?: string };
const softwareRecords = listSoftware();

export function SoftwareExplorer({ initial }: { initial: Initial }) {
  const [q, setQ] = useState(initial.q ?? "");
  const [category, setCategory] = useState(initial.category ?? "");
  const [platform, setPlatform] = useState(initial.platform ?? "");
  const [purpose, setPurpose] = useState(initial.purpose ?? "");
  const [verdict, setVerdict] = useState(initial.verdict ?? "");
  const [attribution, setAttribution] = useState(initial.attribution ?? "");
  const [format, setFormat] = useState(initial.format ?? "");
  const [evidence, setEvidence] = useState(initial.evidence ?? "");

  const filters = useMemo(() => ({ q, category, platform, purpose, verdict, attribution, format, evidence }), [q, category, platform, purpose, verdict, attribution, format, evidence]);
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
  }, [filters]);

  const results = useMemo(() => softwareRecords.filter((record) => {
    const haystack = [record.name, record.developer, record.category, ...record.supportedPlatforms, ...record.outputFormats, ...record.useCases.flatMap((u) => [u.useCase, u.note])].join(" ").toLocaleLowerCase("ja");
    return (!q || haystack.includes(q.toLocaleLowerCase("ja")))
      && (!category || record.category === category)
      && (!platform || record.supportedPlatforms.some((item) => item.includes(platform)))
      && (!purpose || record.useCases.some((item) => item.useCase === purpose))
      && (!verdict || record.commercialUseStatus.verdict === verdict)
      && (!attribution || record.attributionRequirement.includes(attribution))
      && (!format || record.outputFormats.some((item) => item.includes(format)))
      && (!evidence || record.evidenceType === evidence);
  }), [q, category, platform, purpose, verdict, attribution, format, evidence]);

  function clear() { setQ(""); setCategory(""); setPlatform(""); setPurpose(""); setVerdict(""); setAttribution(""); setFormat(""); setEvidence(""); }

  return (
    <>
      <section className="filter-panel" aria-labelledby="software-filter-heading">
        <div className="filter-title"><h2 id="software-filter-heading">絞り込み</h2><button type="button" onClick={clear}>条件をすべて解除</button></div>
        <div className="filter-grid filter-grid-software">
          <label className="filter-search"><span>部分一致検索</span><input className="filter-control" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="製品名、開発元、用途、形式" /></label>
          <FilterSelect label="カテゴリ" value={category} onChange={setCategory} options={["動画編集", "日本語音声合成・TTS", "配信・録音アプリ"]} />
          <FilterSelect label="OS / プラットフォーム" value={platform} onChange={setPlatform} options={["Windows", "macOS", "Linux", "iPadOS"]} />
          <FilterSelect label="利用目的" value={purpose} onChange={setPurpose} options={["YouTube収益化", "クライアント納品", "ゲーム組み込み"]} />
          <FilterSelect label="商用利用状態" value={verdict} onChange={setVerdict} options={["適合", "条件付き適合", "不適合", "未確認"]} />
          <FilterSelect label="帰属表示" value={attribution} onChange={setAttribution} options={["必要", "未確認"]} />
          <FilterSelect label="出力形式" value={format} onChange={setFormat} options={["WAV", "MP4", "MOV", "AAF", "XML"]} />
          <FilterSelect label="証拠種別" value={evidence} onChange={setEvidence} options={["実機検証済み", "公式情報確認済み・実機未検証", "再現可能な第三者報告", "未確認"]} />
        </div>
      </section>
      <div className="result-summary" aria-live="polite"><strong>{results.length}件</strong><span>用途別の許諾条件と納品条件を表示しています。</span></div>
      {results.length ? <div className="result-grid">{results.map((record) => <SoftwareCard key={record.id} record={record} />)}</div> : <EmptyState onClear={clear} />}
    </>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label><span>{label}</span><select className="filter-control" value={value} onChange={(e) => onChange(e.target.value)}><option value="">すべて</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return <div className="empty-state"><span aria-hidden="true">0</span><h2>一致する公開レコードはありません</h2><p>条件を解除するか、別の語で検索してください。未掲載の製品は調査状況が未確定です。</p><button className="primary-button" type="button" onClick={onClear}>条件を解除する</button></div>;
}

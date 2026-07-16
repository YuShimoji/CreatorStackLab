"use client";

import { useEffect, useMemo, useState } from "react";
import { listSetups } from "../data/repository";
import { SetupCard } from "./RecordCards";

type Initial = { q?: string; purpose?: string; device?: string; os?: string; app?: string; interface?: string; power?: string; stereo?: string; loopback?: string; evidence?: string; verdict?: string };
const setupRecords = listSetups();

export function SetupExplorer({ initial }: { initial: Initial }) {
  const [filters, setFilters] = useState<Required<Initial>>({ q: "", purpose: "", device: "", os: "", app: "", interface: "", power: "", stereo: "", loopback: "", evidence: "", verdict: "", ...initial });
  const set = (key: keyof Initial) => (value: string) => setFilters((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
  }, [filters]);

  const results = useMemo(() => setupRecords.filter((record) => {
    const haystack = [record.title, record.useCase, record.hostDevice, record.osVersion, record.application, record.audioInterface, record.microphone, record.powerMethod, ...record.adapters].join(" ").toLocaleLowerCase("ja");
    return (!filters.q || haystack.includes(filters.q.toLocaleLowerCase("ja")))
      && (!filters.purpose || record.useCase === filters.purpose)
      && (!filters.device || record.hostDevice.includes(filters.device))
      && (!filters.os || record.osVersion.includes(filters.os))
      && (!filters.app || record.application.includes(filters.app))
      && (!filters.interface || record.audioInterface.includes(filters.interface))
      && (!filters.power || record.powerMethod.includes(filters.power))
      && (!filters.stereo || record.stereoSupport.includes(filters.stereo))
      && (!filters.loopback || record.loopbackSupport.includes(filters.loopback))
      && (!filters.evidence || record.evidenceType === filters.evidence)
      && (!filters.verdict || record.verdict === filters.verdict);
  }), [filters]);
  const clear = () => setFilters({ q: "", purpose: "", device: "", os: "", app: "", interface: "", power: "", stereo: "", loopback: "", evidence: "", verdict: "" });

  return (
    <>
      <section className="filter-panel" aria-labelledby="setup-filter-heading">
        <div className="filter-title"><h2 id="setup-filter-heading">構成単位で絞り込む</h2><button type="button" onClick={clear}>条件をすべて解除</button></div>
        <div className="filter-grid">
          <label className="filter-search"><span>部分一致検索</span><input className="filter-control" type="search" value={filters.q} onChange={(e) => set("q")(e.target.value)} placeholder="端末、アプリ、インターフェース" /></label>
          <SetupSelect label="利用目的" value={filters.purpose} onChange={set("purpose")} options={["ライブ配信", "音声収録"]} />
          <SetupSelect label="端末" value={filters.device} onChange={set("device")} options={["Windows", "Mac", "iPhone", "iPad", "Android"]} />
          <SetupSelect label="OS" value={filters.os} onChange={set("os")} options={["Windows 11", "macOS", "iOS", "iPadOS", "Android"]} />
          <SetupSelect label="アプリ" value={filters.app} onChange={set("app")} options={["OBS Studio", "YouTube Live", "GarageBand", "Cubasis"]} />
          <SetupSelect label="オーディオI/F" value={filters.interface} onChange={set("interface")} options={["AG03MK2", "GO:MIXER PRO-X", "UR22C"]} />
          <SetupSelect label="給電方法" value={filters.power} onChange={set("power")} options={["USBバスパワー", "USB電源", "単4電池"]} />
          <SetupSelect label="ステレオ" value={filters.stereo} onChange={set("stereo")} options={["対応", "未確認"]} />
          <SetupSelect label="ループバック" value={filters.loopback} onChange={set("loopback")} options={["対応", "OFF", "未確認"]} />
          <SetupSelect label="証拠種別" value={filters.evidence} onChange={set("evidence")} options={["実機検証済み", "公式情報確認済み・実機未検証", "再現可能な第三者報告", "未確認"]} />
          <SetupSelect label="判定状態" value={filters.verdict} onChange={set("verdict")} options={["適合", "条件付き適合", "不適合", "未確認"]} />
        </div>
      </section>
      <div className="result-summary" aria-live="polite"><strong>{results.length}件</strong><span>製品単位ではなく、端末からアプリまでの経路単位です。</span></div>
      {results.length ? <div className="result-grid">{results.map((record) => <SetupCard key={record.id} record={record} />)}</div> : <div className="empty-state"><span aria-hidden="true">0</span><h2>一致する構成はまだ登録されていません</h2><p>条件を解除してください。未登録の組合せは不適合を意味しません。</p><button className="primary-button" type="button" onClick={clear}>条件を解除する</button></div>}
    </>
  );
}

function SetupSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label><span>{label}</span><select className="filter-control" value={value} onChange={(e) => onChange(e.target.value)}><option value="">すべて</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

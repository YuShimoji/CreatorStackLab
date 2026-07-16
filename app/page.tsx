"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { listSetups, listSoftware } from "../data/repository";
import { EvidenceBadge, VerdictBadge } from "../components/Badges";

const chips = ["YouTube収益化", "ライブ配信", "音声収録", "クライアント納品", "ゲーム組み込み"];

export default function Home() {
  const softwareRecords = listSoftware();
  const setupRecords = listSetups();
  const [mode, setMode] = useState<"software" | "setup">("software");
  const [query, setQuery] = useState("");

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const path = mode === "software" ? "/softwares" : "/setups";
    window.location.href = `${path}?q=${encodeURIComponent(query.trim())}`;
  }

  return (
    <>
      <section className="hero section-shell">
        <div className="eyebrow"><span aria-hidden="true">●</span> 公式情報と検証状態を分けて記録</div>
        <div className="hero-grid">
          <div>
            <h1>作ったものを使えるか。<br />手元の構成で動くか。</h1>
            <p className="hero-copy">制作ソフトの権利・出力条件と、配信・録音機材の接続構成を、一つの「制作スタックの適合性」として確認します。</p>
          </div>
          <aside className="scope-note" aria-label="このデータベースの読み方">
            <span className="scope-number">01</span>
            <h2>おすすめ順ではなく、成立条件順。</h2>
            <p>判定は「適合・条件付き適合・不適合・未確認」の4状態。情報がないことを不適合にしません。</p>
          </aside>
        </div>

        <div className="search-lab" aria-label="制作スタック検索">
          <div className="mode-tabs" role="tablist" aria-label="検索モード">
            <button type="button" role="tab" aria-selected={mode === "software"} onClick={() => setMode("software")}>
              <span aria-hidden="true">01</span> 商用利用・出力を確認
            </button>
            <button type="button" role="tab" aria-selected={mode === "setup"} onClick={() => setMode("setup")}>
              <span aria-hidden="true">02</span> 機材構成を確認
            </button>
          </div>
          <form className="hero-search" onSubmit={submitSearch}>
            <label htmlFor="home-search">{mode === "software" ? "製品名・開発元・用途・出力形式" : "端末・アプリ・機材・用途"}</label>
            <div className="search-row">
              <input id="home-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={mode === "software" ? "例：VOICEVOX、クライアント納品、WAV" : "例：iPhone、OBS、AG03MK2"} />
              <button className="primary-button" type="submit">検索する <span aria-hidden="true">→</span></button>
            </div>
          </form>
          <div className="chip-row" aria-label="用途から探す">
            <span>用途から：</span>
            {chips.map((chip) => <button type="button" key={chip} onClick={() => setQuery(chip)}>{chip}</button>)}
          </div>
        </div>
      </section>

      <section className="section-shell section-block" aria-labelledby="recent-heading">
        <div className="section-heading">
          <div><p className="section-kicker">RECENTLY VERIFIED</p><h2 id="recent-heading">最近確認されたレコード</h2></div>
          <p>カード上で判定、証拠種別、最終確認日を確認できます。</p>
        </div>
        <div className="ledger-grid">
          {softwareRecords.slice(0, 2).map((record) => (
            <article className="ledger-card" key={record.id}>
              <div className="card-topline"><span className="record-type">SOFTWARE</span><VerdictBadge verdict={record.verdict} /></div>
              <h3><Link href={`/softwares/${record.slug}`}>{record.name}</Link></h3>
              <p>{record.summary}</p>
              <div className="tag-row">{record.outputFormats.slice(0, 3).map((item) => <span key={item}>{item}</span>)}</div>
              <div className="evidence-line"><EvidenceBadge evidence={record.evidenceType} /><time dateTime={record.verifiedAt}>確認 {record.verifiedAt}</time></div>
            </article>
          ))}
          {setupRecords.slice(0, 2).map((record) => (
            <article className="ledger-card" key={record.id}>
              <div className="card-topline"><span className="record-type">SETUP</span><VerdictBadge verdict={record.verdict} /></div>
              <h3><Link href={`/setups/${record.slug}`}>{record.title}</Link></h3>
              <p>{record.summary}</p>
              <div className="tag-row"><span>{record.application}</span><span>{record.audioInterface}</span></div>
              <div className="evidence-line"><EvidenceBadge evidence={record.evidenceType} /><time dateTime={record.testedAt}>確認 {record.testedAt}</time></div>
            </article>
          ))}
        </div>
        <div className="paired-links">
          <Link href="/softwares">ソフト適合をすべて見る <span aria-hidden="true">→</span></Link>
          <Link href="/setups">構成適合をすべて見る <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="principles section-shell section-block" aria-labelledby="principles-heading">
        <div><p className="section-kicker">READING THE LEDGER</p><h2 id="principles-heading">判定は、結論と根拠をセットで読む。</h2></div>
        <div className="legend-grid">
          <div><VerdictBadge verdict="適合" /><p>確認した範囲で、追加条件なしに経路が成立。</p></div>
          <div><VerdictBadge verdict="条件付き適合" /><p>プラン、表示、給電、アダプター等の条件を満たせば成立。</p></div>
          <div><VerdictBadge verdict="不適合" /><p>確認対象の経路では成立しない根拠がある。</p></div>
          <div><VerdictBadge verdict="未確認" /><p>根拠不足。調査中であり、不適合とは限らない。</p></div>
        </div>
        <Link className="text-link" href="/policy">検証方針と証拠階層を読む →</Link>
      </section>
    </>
  );
}

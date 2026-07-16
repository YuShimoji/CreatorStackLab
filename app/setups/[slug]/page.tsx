import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenceBadge, VerdictBadge } from "../../../components/Badges";
import { StackToggleButton } from "../../../components/StackToggleButton";
import { ObservationHistory } from "../../../components/ObservationHistory";
import { findSetupBySlug, listSetups } from "../../../data/repository";

export function generateStaticParams() { return listSetups().map((record) => ({ slug: record.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const record = findSetupBySlug((await params).slug);
  if (!record) return {};
  return { title: `${record.title}の構成適合`, description: record.summary, alternates: { canonical: `/setups/${record.slug}` } };
}

export default async function SetupDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const record = findSetupBySlug((await params).slug);
  if (!record) notFound();
  const structured = { "@context": "https://schema.org", "@type": "Article", headline: record.title, description: record.summary, dateModified: record.testedAt };
  return (
    <div className="section-shell detail-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }} />
      <nav className="breadcrumbs" aria-label="パンくず"><Link href="/">ホーム</Link><span>/</span><Link href="/setups">構成適合</Link><span>/</span><span aria-current="page">{record.title}</span></nav>
      <header className="detail-hero"><div><p className="section-kicker">{record.useCase.toUpperCase()}</p><h1>{record.title}</h1></div><div className="detail-status"><VerdictBadge verdict={record.verdict} /><EvidenceBadge evidence={record.evidenceType} /><time dateTime={record.testedAt}>最終確認 {record.testedAt}</time></div></header>
      <section className="conclusion-box"><p className="section-kicker">ROUTE VERDICT</p><h2>{record.summary}</h2><p>公式文書の照合結果です。Codexによる実機試験ではありません。</p></section>
      <section className="signal-section" aria-labelledby="signal-heading"><div className="section-heading"><div><p className="section-kicker">SIGNAL ROUTE</p><h2 id="signal-heading">信号経路</h2></div><p>左から右へ、入力が配信・録音先へ届く順序です。</p></div><ol className="signal-flow">{record.signalRoute.map((step, index) => <li key={`${index}-${step}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong></li>)}</ol></section>
      <div className="detail-layout">
        <article className="detail-main">
          <section><h2>構成と接続</h2><dl className="definition-ledger">
            <div><dt>端末 / OS</dt><dd>{record.hostDevice}<br />{record.osVersion}</dd></div>
            <div><dt>アプリ</dt><dd>{record.application}</dd></div>
            <div><dt>オーディオI/F</dt><dd>{record.audioInterface}</dd></div>
            <div><dt>マイク</dt><dd>{record.microphone}</dd></div>
            <div><dt>必要アダプター</dt><dd>{record.adapters.join(" / ")}</dd></div>
            <div><dt>給電方法</dt><dd>{record.powerMethod}</dd></div>
            <div><dt>入力チャンネル</dt><dd>{record.inputChannels}</dd></div>
            <div><dt>ステレオ</dt><dd>{record.stereoSupport}</dd></div>
            <div><dt>ループバック</dt><dd>{record.loopbackSupport}</dd></div>
            <div><dt>モニタリング</dt><dd>{record.monitoringSupport}</dd></div>
          </dl></section>
          <section><h2>成立条件・未知・制約</h2><div className="three-column-notes"><div><h3>成立条件</h3><ul>{record.conditions.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>未確認部分</h3><ul>{record.unknowns.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>既知の制約</h3><ul>{record.knownLimitations.map((item) => <li key={item}>{item}</li>)}</ul></div></div></section>
          <section><h2>検証方法</h2><p className="method-box">{record.testMethod}</p></section>
          <section><h2>鮮度と未知</h2><dl className="definition-ledger"><div><dt>再確認期限</dt><dd>{record.freshness.recheckAt}</dd></div><div><dt>物理テスト</dt><dd>{record.freshness.physicalTested ? "実施済み" : "未実施"}</dd></div><div><dt>未知の項目</dt><dd>{record.freshness.unknowns.join(" / ")}</dd></div></dl></section>
          <section id="history"><h2>変更履歴</h2><ol className="history-list">{record.revisionHistory.map((item) => <li key={`${item.date}-${item.summary}`}><time dateTime={item.date}>{item.date}</time><span>{item.summary}</span></li>)}</ol><ObservationHistory entityId={record.id} /></section>
        </article>
        <aside className="source-panel"><h2>根拠</h2><p>接続前に、端末・OS・アプリの現行版と原文を再確認してください。</p><ul>{record.sourceUrls.map((source) => <li key={source.url}><span>{source.type}</span><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} ↗</a></li>)}</ul><StackToggleButton id={record.id} /></aside>
      </div>
    </div>
  );
}

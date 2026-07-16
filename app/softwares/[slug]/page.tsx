import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenceBadge, VerdictBadge } from "../../../components/Badges";
import { EvidencePassport } from "../../../components/EvidencePassport";
import { StackToggleButton } from "../../../components/StackToggleButton";
import { findSoftwareBySlug, getEvidencePassportBundle, listSoftware } from "../../../data/repository";

export function generateStaticParams() { return listSoftware().map((record) => ({ slug: record.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const record = findSoftwareBySlug((await params).slug);
  if (!record) return {};
  return { title: `${record.name}の商用利用・出力適合`, description: record.summary, alternates: { canonical: `/softwares/${record.slug}` } };
}

export default async function SoftwareDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const record = findSoftwareBySlug((await params).slug);
  if (!record) notFound();
  const passport = getEvidencePassportBundle(record.id);
  const structured = {
    "@context": "https://schema.org", "@type": "SoftwareApplication", name: record.name,
    applicationCategory: record.category, operatingSystem: record.supportedPlatforms.join(", "),
    description: record.summary, dateModified: record.verifiedAt,
  };
  return (
    <div className="section-shell detail-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }} />
      <nav className="breadcrumbs" aria-label="パンくず"><Link href="/">ホーム</Link><span>/</span><Link href="/softwares">ソフト適合</Link><span>/</span><span aria-current="page">{record.name}</span></nav>
      <header className="detail-hero">
        <div><p className="section-kicker">{record.category.toUpperCase()}</p><h1>{record.name}</h1><p className="detail-developer">{record.developer} ・ {record.supportedPlatforms.join(" / ")}</p></div>
        <div className="detail-status"><VerdictBadge verdict={record.verdict} /><EvidenceBadge evidence={record.evidenceType} /><time dateTime={record.verifiedAt}>最終確認 {record.verifiedAt}</time></div>
      </header>
      <section className="conclusion-box" aria-labelledby="conclusion-heading"><p className="section-kicker">SHORT ANSWER</p><h2 id="conclusion-heading">{record.summary}</h2><p>この判定は公式情報から確認できた範囲の整理であり、個別案件の法的保証ではありません。</p></section>
      <EvidencePassport bundle={passport} />

      <div className="detail-layout">
        <article className="detail-main">
          <section><h2>用途別の適合判定</h2><div className="verdict-table">{record.useCases.map((item) => <div key={item.useCase}><strong>{item.useCase}</strong><VerdictBadge verdict={item.verdict} /><p>{item.note}</p></div>)}</div></section>
          <section><h2>利用条件と例外</h2><div className="two-column-notes"><div><h3>成立条件</h3><ul>{record.conditions.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>確認すべき制約</h3><ul>{record.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div></div></section>
          <section><h2>出力・納品・移行</h2><dl className="definition-ledger">
            <div><dt>対象プラン</dt><dd>{record.plans.join(" / ")}</dd></div>
            <div><dt>商用利用</dt><dd><VerdictBadge verdict={record.commercialUseStatus.verdict} /> {record.commercialUseStatus.note}</dd></div>
            <div><dt>帰属表示</dt><dd>{record.attributionRequirement}</dd></div>
            <div><dt>クライアント納品</dt><dd><VerdictBadge verdict={record.clientDeliveryStatus.verdict} /> {record.clientDeliveryStatus.note}</dd></div>
            <div><dt>ゲーム等への組み込み</dt><dd><VerdictBadge verdict={record.gameEmbeddingStatus.verdict} /> {record.gameEmbeddingStatus.note}</dd></div>
            <div><dt>主な出力形式</dt><dd>{record.outputFormats.join(" / ")}</dd></div>
            <div><dt>バッチ出力</dt><dd>{record.batchExport}</dd></div>
            <div><dt>プロジェクト移行性</dt><dd>{record.projectPortability}</dd></div>
            <div><dt>オフライン利用</dt><dd>{record.offlineAvailability}</dd></div>
          </dl></section>
          <section><h2>カタログ鮮度</h2><dl className="definition-ledger"><div><dt>再確認期限</dt><dd>{record.freshness.recheckAt}</dd></div><div><dt>運営者実機試験</dt><dd>{record.freshness.physicalTested ? "実施済み" : "未実施（公式資料の有無とは別）"}</dd></div><div><dt>未確認項目</dt><dd>{record.freshness.unknowns.join(" / ")}</dd></div></dl></section>
        </article>
        <aside className="source-panel"><h2>公式出典</h2><p>規約は更新されます。利用直前に原文を再確認してください。</p><ul>{record.sourceUrls.map((source) => <li key={source.url}><span>{source.type}</span><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} ↗</a></li>)}</ul><StackToggleButton id={record.id} /><Link className="primary-button inline-button" href={`/compare?ids=${record.id}`}>比較に追加</Link></aside>
      </div>
    </div>
  );
}

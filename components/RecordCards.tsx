import Link from "next/link";
import type { SetupRecord, SoftwareRecord } from "../data/models";
import { EvidenceBadge, VerdictBadge } from "./Badges";

export function SoftwareCard({ record }: { record: SoftwareRecord }) {
  return (
    <article className="result-card">
      <div className="card-topline"><span className="record-type">{record.category}</span><VerdictBadge verdict={record.verdict} /></div>
      <h2><Link href={`/softwares/${record.slug}`}>{record.name}</Link></h2>
      <p className="developer">{record.developer} ・ {record.supportedPlatforms.join(" / ")}</p>
      <p>{record.summary}</p>
      <div className="usecase-ledger" aria-label={`${record.name}の用途別判定`}>
        {record.useCases.map((item) => <div key={item.useCase}><span>{item.useCase}</span><VerdictBadge verdict={item.verdict} /></div>)}
      </div>
      <div className="tag-row">{record.outputFormats.slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div>
      <div className="evidence-line"><EvidenceBadge evidence={record.evidenceType} /><time dateTime={record.verifiedAt}>確認 {record.verifiedAt}</time></div>
      <div className="card-actions">
        <Link href={`/softwares/${record.slug}`}>条件と根拠を見る →</Link>
        <Link href={`/compare?ids=${record.id}`}>比較に追加</Link>
      </div>
    </article>
  );
}

export function SetupCard({ record }: { record: SetupRecord }) {
  return (
    <article className="result-card">
      <div className="card-topline"><span className="record-type">{record.useCase}</span><VerdictBadge verdict={record.verdict} /></div>
      <h2><Link href={`/setups/${record.slug}`}>{record.title}</Link></h2>
      <p>{record.summary}</p>
      <dl className="compact-specs">
        <div><dt>端末 / OS</dt><dd>{record.hostDevice} / {record.osVersion}</dd></div>
        <div><dt>アプリ</dt><dd>{record.application}</dd></div>
        <div><dt>給電</dt><dd>{record.powerMethod}</dd></div>
        <div><dt>ループバック</dt><dd>{record.loopbackSupport}</dd></div>
      </dl>
      <div className="evidence-line"><EvidenceBadge evidence={record.evidenceType} /><time dateTime={record.testedAt}>確認 {record.testedAt}</time></div>
      <div className="card-actions"><Link href={`/setups/${record.slug}`}>経路と成立条件を見る →</Link></div>
    </article>
  );
}

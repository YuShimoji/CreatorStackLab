"use client";

import Link from "next/link";
import { listCatalog, listChanges, listStatuses } from "../data/repository";
import type { ObservationSourceView, ServiceStatus } from "../data/models";
import { ObservationRunControl } from "./ObservationRunControl";
import { useMyStack } from "./MyStackProvider";
import { useObservationSnapshot } from "./useObservationSnapshot";

const statusLabels: Record<ServiceStatus, string> = {
  operational: "正常", degraded: "性能低下", partial_outage: "一部停止", major_outage: "重大停止", maintenance: "メンテナンス", unknown: "不明",
};
const sourceLabels = { official_live: "公式ライブ", official_document: "公式文書", sample: "表示サンプル" } as const;
const healthLabels: Record<ObservationSourceView["status"], string> = {
  healthy: "取得正常", stale: "期限超過", fetch_failed: "取得失敗", disabled: "無効", unknown: "未観測",
};

export function StatusDashboard() {
  const { ids, ready, previousVisit } = useMyStack();
  const { snapshot, loading: observationLoading, error: observationError } = useObservationSnapshot();
  if (!ready) return <><section className="today-hero"><div><p className="section-kicker">CREATOR STACK OBSERVATORY</p><h1>今日の制作環境</h1><p>このブラウザのMy Stackを読み込んでいます。</p></div></section><div className="empty-state compact-empty" aria-live="polite"><span aria-hidden="true">…</span><h2>保存内容を確認中</h2><p>読み込みが終わるまで、状態を正常・異常のどちらにも数えません。</p></div></>;

  const catalog = listCatalog().filter((item) => ids.includes(item.id));
  const statuses = listStatuses().filter((item) => ids.includes(item.catalogId) && item.sourceMode !== "sample");
  const changes = listChanges().filter((item) => ids.includes(item.catalogId));
  const unknown = statuses.filter((item) => item.status === "unknown").length + catalog.filter((item) => !statuses.some((status) => status.catalogId === item.id)).length;
  const attention = statuses.filter((item) => ["degraded", "partial_outage", "major_outage", "maintenance"].includes(item.status)).length;
  const normal = statuses.filter((item) => item.status === "operational").length;
  const overdue = catalog.filter((item) => item.recheckAt < "2026-07-16").length;
  const sinceVisit = previousVisit ? changes.filter((item) => item.detectedAt > previousVisit.slice(0, 10)).length : changes.length;
  const visibleStatuses = listStatuses().filter((item) => ids.includes(item.catalogId) || item.sourceMode === "sample");
  const visibleChanges = changes.length ? changes : listChanges().slice(0, 3);
  const totals = snapshot?.totals;
  const actualSources = snapshot?.sources ?? [];

  return (
    <>
      <section className="today-hero" aria-labelledby="today-heading">
        <div><p className="section-kicker">CREATOR STACK OBSERVATORY</p><h1 id="today-heading">今日の制作環境</h1><p>{ids.length ? `${ids.length}件のMy Stackを、状態・鮮度・変更で見ています。` : "My Stackを登録すると、購入後の確認対象だけに絞れます。"}</p></div>
        <div className="today-meta"><span>LAST OBSERVED</span><time dateTime={totals?.lastObservedAt ?? undefined}>{formatMoment(totals?.lastObservedAt ?? null, true)}</time><small>{snapshot ? "公式4ソース・owner-only手動観測" : observationLoading ? "実観測を読込中" : "実観測は未接続"}</small></div>
      </section>

      <section className="observation-metrics" aria-label="実観測の要約">
        <ObservationMetric label="REAL SOURCES" value={totals?.realSourceCount ?? 0} note="D1に保存する公式観測" />
        <ObservationMetric label="DISPLAY SAMPLE" value={totals?.sampleCount ?? listStatuses().filter((item) => item.sourceMode === "sample").length} note="実データと集計を分離" />
        <ObservationMetric label="CHANGES" value={totals?.changedCount ?? 0} note={formatMoment(totals?.lastChangedAt ?? null)} />
        <ObservationMetric label="PENDING REVIEW" value={totals?.pendingReviewCount ?? 0} note="法務・商用意味は自動断定しない" attention={Boolean(totals?.pendingReviewCount)} />
        <ObservationMetric label="FETCH FAILED" value={totals?.failureCount ?? 0} note="障害状態とは別" attention={Boolean(totals?.failureCount)} />
        <ObservationMetric label="STALE" value={totals?.staleCount ?? 0} note="最終成功値は保持" attention={Boolean(totals?.staleCount)} />
      </section>

      <ObservationRunControl lastRun={snapshot?.runs[0]} />
      {observationError && <aside className="observation-alert" role="status"><strong>観測データを表示できません。</strong><p>{observationError}。Catalogの判定や最後に確認できた公式文書を障害へ読み替えません。</p></aside>}

      <section className="metric-grid" aria-label="My Stackの要約">
        <article><span>NORMAL / NO CHANGE</span><strong>{normal}</strong><p>公式ライブで正常確認</p></article>
        <article className={attention ? "metric-attention" : ""}><span>ATTENTION</span><strong>{attention}</strong><p>性能低下・停止・メンテ</p></article>
        <article className={unknown ? "metric-unknown" : ""}><span>UNKNOWN</span><strong>{unknown}</strong><p>ライブ状態を断定できない</p></article>
        <article><span>FRESHNESS OVERDUE</span><strong>{overdue}</strong><p>再確認期限を超過</p></article>
        <article><span>CHANGES SINCE VISIT</span><strong>{sinceVisit}</strong><p>{previousVisit ? `前回 ${previousVisit.slice(0, 10)}` : "初回の基準値"}</p></article>
      </section>

      {!ids.length && <aside className="scope-note stack-nudge"><strong>My Stackが空です。</strong><p>下の登録済み変更は全体表示です。<Link href="/softwares">検索から追加</Link>すると自分の制作環境だけに絞れます。</p></aside>}

      <section className="observatory-section" aria-labelledby="live-sources-heading">
        <div className="section-heading"><div><p className="section-kicker">REAL OBSERVATIONS</p><h2 id="live-sources-heading">公式ソースの現在値</h2></div><p>取得状態と提供元の状態を分離し、最後に成功した公式値を保持します。</p></div>
        {actualSources.length ? <div className="observation-source-grid">{actualSources.map((source) => <ObservationSourceCard source={source} key={source.id} />)}</div> : <div className="empty-state compact-empty"><span aria-hidden="true">{observationLoading ? "…" : "0"}</span><h2>{observationLoading ? "実観測を読み込んでいます" : "実観測はまだありません"}</h2><p>観測実行後も Catalog の判定は自動で書き換えません。</p></div>}
      </section>

      {snapshot?.reviews.length ? <section className="observatory-section" aria-labelledby="review-heading"><div className="section-heading"><div><p className="section-kicker">REVIEW QUEUE</p><h2 id="review-heading">人の確認が必要な変化</h2></div><p>規約の hash 変化は、意味を確認するまで判定へ反映しません。</p></div><div className="review-list">{snapshot.reviews.map((review) => <article key={review.id}><span>要レビュー</span><h3>{review.sourceTitle}</h3><p>{review.reason}</p><strong>{review.requiredAction}</strong><a href={review.sourceUrl} target="_blank" rel="noopener noreferrer">公式原文を開く ↗</a></article>)}</div></section> : null}

      <section className="observatory-section" aria-labelledby="important-heading"><div className="section-heading"><div><p className="section-kicker">REGISTERED CHANGES</p><h2 id="important-heading">影響の大きい変更</h2></div><Link className="text-link" href="/changes">変更レーダーをすべて見る →</Link></div>
        <div className="change-list">{visibleChanges.map((item) => <article key={item.id} className={`change-row severity-${item.severity}`}><div><span>{item.type}</span><h3>{item.subject}</h3></div><p>{item.impact}</p><time dateTime={item.changedAt}>{item.changedAt}</time></article>)}</div>
      </section>

      <section className="observatory-section" aria-labelledby="status-heading"><div className="section-heading"><div><p className="section-kicker">DOCUMENT / SAMPLE LAYER</p><h2 id="status-heading">登録済み状態と出典</h2></div><p>「不明」は障害ではありません。サンプルは実観測数に含めません。</p></div>
        {visibleStatuses.length ? <div className="status-grid">{visibleStatuses.map((item) => <article key={item.id} className={`status-card status-${item.status}`}><div className="card-topline"><span className="record-type">{sourceLabels[item.sourceMode]}</span><strong>{statusLabels[item.status]}</strong></div><h3>{item.subject}</h3><p>{item.impactedFeature}</p><small>{item.note}</small><div className="evidence-line"><a href={item.source.url}>{item.source.label}</a><time dateTime={item.checkedAt}>確認 {item.checkedAt}</time></div></article>)}</div> : <div className="empty-state compact-empty"><span aria-hidden="true">—</span><h2>登録項目の状態ソースはまだありません</h2><p>未接続を正常とは扱いません。My Stackの詳細と変更履歴は引き続き確認できます。</p></div>}
      </section>
    </>
  );
}

function ObservationMetric({ label, value, note, attention = false }: { label: string; value: number; note: string; attention?: boolean }) {
  return <article className={attention ? "metric-attention" : ""}><span>{label}</span><strong>{value}</strong><p>{note}</p></article>;
}

function ObservationSourceCard({ source }: { source: ObservationSourceView }) {
  const facts = source.observed;
  const official = typeof facts.officialStatus === "string" ? statusLabels[facts.officialStatus as ServiceStatus] ?? facts.officialStatus : null;
  const version = typeof facts.version === "string" ? facts.version : null;
  const description = typeof facts.statusDescription === "string" ? facts.statusDescription : null;
  const isTerms = source.sourceType === "official_terms_html";
  return <article className={`observation-source-card source-health-${source.status}`}>
    <div className="card-topline"><span className="record-type">公式・実観測</span><strong>{healthLabels[source.status]}</strong></div>
    <h3>{source.title}</h3>
    <p className="observed-value">{official ? `公式状態：${official}` : version ? `最新版：${version}` : isTerms ? "規約本文：hash確認済み・意味は未判定" : "公式値は未取得"}</p>
    {description && <small>{description}</small>}
    {source.status === "fetch_failed" && <p className="fetch-separation">取得失敗です。Twitchや製品自体の障害を意味しません。</p>}
    <dl>
      <div><dt>最終成功</dt><dd>{formatMoment(source.lastSuccessfulFetchAt)}</dd></div>
      <div><dt>最終試行</dt><dd>{formatMoment(source.lastCheckedAt)}</dd></div>
      <div><dt>次回目標</dt><dd>{formatMoment(source.nextDueAt)}</dd></div>
      <div><dt>freshness</dt><dd>{healthLabels[source.status]}</dd></div>
    </dl>
    <a href={typeof facts.sourceUrl === "string" ? facts.sourceUrl : source.url} target="_blank" rel="noopener noreferrer">{source.publisher} 公式ソース ↗</a>
  </article>;
}

function formatMoment(value: string | null, compact = false) {
  if (!value) return "未観測";
  return new Intl.DateTimeFormat("ja-JP", compact ? { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" } : { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(value));
}

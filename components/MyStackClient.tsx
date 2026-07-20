"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  buildMyStackChangeSummaries,
  myStackChangeStateLabels,
  type MyStackChangeState,
} from "../data/my-stack-change-summary";
import { listCatalog } from "../data/repository";
import { VerdictBadge } from "./Badges";
import { useMyStack } from "./MyStackProvider";
import { useObservationSnapshot } from "./useObservationSnapshot";

const kindLabels = {
  software: "ソフトウェア",
  service: "サービス／アプリ",
  hardware: "ハードウェア",
  setup: "構成",
} as const;

const stateSeverity: Record<MyStackChangeState, "high" | "medium" | "low" | "info"> = {
  review_pending: "high",
  fetch_failed: "high",
  stale: "medium",
  meaningful_change: "medium",
  source_unavailable: "low",
  baseline_only: "info",
  unchanged_since_visit: "info",
};

export function MyStackClient() {
  const { ids, ready, previousVisit, remove } = useMyStack();
  const { snapshot, loading: observationLoading, error: observationError } = useObservationSnapshot();
  const catalog = useMemo(() => listCatalog(), []);
  const records = useMemo(() => catalog.filter((record) => ids.includes(record.id)), [catalog, ids]);
  const summaries = useMemo(
    () => snapshot
      ? buildMyStackChangeSummaries({ catalog, savedIds: ids, previousVisit, snapshot })
      : [],
    [catalog, ids, previousVisit, snapshot],
  );

  if (!ready) {
    return <div className="empty-state" aria-live="polite"><span aria-hidden="true">…</span><h2>保存内容を読み込んでいます</h2></div>;
  }

  if (!records.length) {
    return (
      <div className="empty-state" data-testid="my-stack-empty">
        <span aria-hidden="true">0</span><h2>My Stackはまだ空です</h2>
        <p>購入済み・利用中・検討中の項目を、検索結果または詳細から追加してください。保存先はこのブラウザだけで、ログインやクラウド同期はありません。</p>
        <div className="empty-actions"><Link className="primary-button inline-button" href="/softwares">ソフトを探す</Link><Link className="text-link" href="/setups">構成を探す</Link></div>
      </div>
    );
  }

  return (
    <>
      <section className="observatory-section" aria-labelledby="my-stack-summary-heading">
        <div className="section-heading">
          <div><p className="section-kicker">SINCE YOUR LAST VISIT</p><h2 id="my-stack-summary-heading">前回訪問後の変更要約</h2></div>
          <p>{previousVisit ? `比較基準：${formatMoment(previousVisit)}` : "初回表示のため、過去の差分は新着扱いせず基準観測として表示します。"}</p>
        </div>

        {observationError && (
          <aside className="observation-alert" role="status" data-testid="my-stack-summary-error">
            <strong>観測データを表示できません。</strong>
            <p>{observationError}。保存項目や最後に確認できた根拠を、正常・不変・障害へ読み替えません。</p>
          </aside>
        )}

        {!snapshot ? (
          observationLoading ? (
            <div className="empty-state compact-empty" aria-live="polite" data-testid="my-stack-summary-loading">
              <span aria-hidden="true">…</span><h2>変更要約を読み込んでいます</h2>
              <p>観測Snapshotを確認できるまで、保存対象を変更なしとは判定しません。</p>
            </div>
          ) : observationError ? null : (
            <div className="empty-state compact-empty">
              <span aria-hidden="true">—</span><h2>変更要約はまだありません</h2>
              <p>観測Snapshotが取得できるまで、Evidence Passportの根拠と未知を確認してください。</p>
            </div>
          )
        ) : (
          <div className="change-list" data-testid="my-stack-change-summary">
            {summaries.map((summary) => (
              <article
                className={`change-row severity-${stateSeverity[summary.primaryState]}`}
                data-summary-state={summary.primaryState}
                key={summary.entityId}
              >
                <div>
                  <span>{myStackChangeStateLabels[summary.primaryState]}</span>
                  <h3><Link href={summary.href}>{summary.name}</Link></h3>
                  <small>{summary.sources.some((source) => source.sourceId) ? `登録Source ${summary.sources.filter((source) => source.sourceId).length}件` : "Catalogのみ"}</small>
                </div>
                <div>
                  <p>{summary.reason}</p>
                  <p><strong>次に確認：</strong>{summary.nextAction}</p>
                  <details>
                    <summary>Source別の状態を確認</summary>
                    <ul>
                      {summary.sources.map((source) => (
                        <li key={source.sourceId ?? `${summary.entityId}:catalog`}>
                          <strong>{source.sourceTitle} — {myStackChangeStateLabels[source.primaryState]}</strong>
                          {source.sourceUrl && <span> <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer">公式Source ↗</a></span>}
                          <ul>
                            {source.signals.map((signal) => (
                              <li key={`${source.sourceId ?? summary.entityId}:${signal.state}`}>
                                {myStackChangeStateLabels[signal.state]}：{signal.reason} 次に確認：{signal.nextAction}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
                <div>
                  <time dateTime={summary.occurredAt ?? undefined}>{formatMoment(summary.occurredAt)}</time>
                  <Link className="text-link" href={summary.targetHref}>
                    {summary.targetHref.endsWith("#history") ? "変更履歴を確認 →" : "Evidence Passportを確認 →"}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="saved-stack-heading">
        <div className="section-heading"><div><p className="section-kicker">SAVED LOCALLY</p><h2 id="saved-stack-heading">保存中の対象</h2></div><p>この一覧と訪問基準は、このブラウザのlocalStorageだけに保存します。</p></div>
        <div className="stack-list" data-testid="my-stack-list">
          {records.map((record) => (
            <article className="stack-row" key={record.id}>
              <div><span className="record-type">{kindLabels[record.kind]}</span><h2><Link href={record.href}>{record.name}</Link></h2><p>{record.summary}</p></div>
              <div className="stack-row-meta"><VerdictBadge verdict={record.verdict} /><time dateTime={record.verifiedAt}>確認 {record.verifiedAt}</time><button type="button" onClick={() => remove(record.id)} data-testid={`stack-remove-${record.id}`}>削除</button></div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function formatMoment(value: string | null) {
  if (!value) return "未観測";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未観測";
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

"use client";

import { useObservationSnapshot } from "./useObservationSnapshot";

export function ObservationHistory({ entityId }: { entityId: string }) {
  const { snapshot, loading, error } = useObservationSnapshot();
  if (loading) return <p className="observation-inline-state">実観測履歴を読み込んでいます。</p>;
  if (error) return <p className="observation-inline-state">実観測履歴は現在取得できません：{error}</p>;
  const sources = snapshot?.sources.filter((source) => source.entityId === entityId) ?? [];
  const changes = snapshot?.changes.filter((change) => change.entityId === entityId) ?? [];
  if (!sources.length) return <p className="observation-inline-state">このレコードに接続済みの実観測ソースはありません。</p>;

  return (
    <div className="observation-history">
      <h3>実観測履歴</h3>
      <ul>
        {sources.map((source) => <li key={source.id}>
          <span>{source.status === "healthy" ? "取得正常" : source.status}</span>
          <div><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a><small>最終成功 {formatMoment(source.lastSuccessfulFetchAt)} ・ 次回目標 {formatMoment(source.nextDueAt)}</small></div>
        </li>)}
        {changes.map((change) => <li key={change.id}>
          <span>{change.reviewStatus === "pending" ? "要レビュー" : "自動反映"}</span>
          <div><strong>{change.changedFields.join(" / ")} の変化を検出</strong><small>{formatMoment(change.detectedAt)} ・ {change.materiality}</small></div>
        </li>)}
      </ul>
    </div>
  );
}

function formatMoment(value: string | null) {
  if (!value) return "未観測";
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(value));
}

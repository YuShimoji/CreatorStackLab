import type {
  CatalogItem,
  ObservationChangeView,
  ObservationHistoryView,
  ObservationReviewView,
  ObservationSnapshot,
  ObservationSourceView,
} from "./models";

export type MyStackChangeState =
  | "meaningful_change"
  | "review_pending"
  | "fetch_failed"
  | "stale"
  | "unchanged_since_visit"
  | "baseline_only"
  | "source_unavailable";

export const myStackChangeStateLabels: Record<MyStackChangeState, string> = {
  meaningful_change: "意味のある変更",
  review_pending: "要レビュー",
  fetch_failed: "取得失敗",
  stale: "鮮度超過",
  unchanged_since_visit: "前回訪問後は不変",
  baseline_only: "基準観測のみ",
  source_unavailable: "観測未接続 / Catalogのみ",
};

export type MyStackSourceSignal = {
  state: MyStackChangeState;
  occurredAt: string | null;
  reason: string;
  nextAction: string;
};

export type MyStackSourceSummary = {
  sourceId: string | null;
  sourceTitle: string;
  sourceUrl: string | null;
  primaryState: MyStackChangeState;
  signals: MyStackSourceSignal[];
};

export type MyStackEntityChangeSummary = {
  entityId: string;
  name: string;
  href: string;
  evidenceHref: string;
  historyHref: string;
  targetHref: string;
  primaryState: MyStackChangeState;
  occurredAt: string | null;
  reason: string;
  nextAction: string;
  sources: MyStackSourceSummary[];
};

type BuildMyStackChangeSummariesInput = {
  catalog: CatalogItem[];
  savedIds: string[];
  previousVisit: string | null;
  snapshot: ObservationSnapshot;
};

const statePriority: Record<MyStackChangeState, number> = {
  review_pending: 700,
  fetch_failed: 650,
  stale: 600,
  meaningful_change: 550,
  source_unavailable: 400,
  baseline_only: 200,
  unchanged_since_visit: 100,
};

const materialityLabels: Record<ObservationChangeView["materiality"], string> = {
  cosmetic: "表示上の差分",
  factual_noncritical: "非重大な事実差分",
  compatibility_relevant: "互換性に関係する差分",
  commercial_terms_relevant: "商用・規約に関係する差分",
  potentially_breaking: "制作継続へ影響し得る差分",
};

const fieldLabels: Record<string, string> = {
  officialStatus: "公式サービス状態",
  statusDescription: "公式状態の説明",
  version: "バージョン",
  releaseDate: "公開日",
  publishedAt: "公開日",
  sourceUrl: "公式Source URL",
  documentHash: "規約本文hash",
};

export function buildMyStackChangeSummaries({
  catalog,
  savedIds,
  previousVisit,
  snapshot,
}: BuildMyStackChangeSummariesInput): MyStackEntityChangeSummary[] {
  const saved = new Set(savedIds);
  const visitAt = timestamp(previousVisit);

  return catalog
    .filter((item) => saved.has(item.id))
    .map((item) => {
      const connectedSources = snapshot.sources.filter((source) => source.entityId === item.id);
      const sources = connectedSources.length
        ? connectedSources.map((source) => summarizeSource(source, snapshot, visitAt))
        : [catalogOnlySource()];
      const primarySignal = sources
        .flatMap((source) => source.signals)
        .sort(compareSignals)[0];
      const primaryState = primarySignal?.state ?? "source_unavailable";
      const evidenceHref = `${item.href}#evidence-passport-heading`;
      const historyHref = `${item.href}#history`;

      return {
        entityId: item.id,
        name: item.name,
        href: item.href,
        evidenceHref,
        historyHref,
        targetHref: ["review_pending", "meaningful_change", "fetch_failed"].includes(primaryState)
          ? historyHref
          : evidenceHref,
        primaryState,
        occurredAt: primarySignal?.occurredAt ?? null,
        reason: primarySignal?.reason ?? "観測状態を要約できませんでした。",
        nextAction: primarySignal?.nextAction ?? "対象詳細で根拠と未知を確認してください。",
        sources,
      };
    })
    .sort((left, right) => {
      const priority = statePriority[right.primaryState] - statePriority[left.primaryState];
      if (priority) return priority;
      const occurred = (timestamp(right.occurredAt) ?? 0) - (timestamp(left.occurredAt) ?? 0);
      return occurred || left.name.localeCompare(right.name, "ja");
    });
}

function summarizeSource(
  source: ObservationSourceView,
  snapshot: ObservationSnapshot,
  visitAt: number | null,
): MyStackSourceSummary {
  const changes = snapshot.changes
    .filter((change) => change.sourceId === source.id)
    .sort((left, right) => compareMoments(right.detectedAt, left.detectedAt));
  const reviews = snapshot.reviews
    .filter((review) => review.sourceId === source.id)
    .sort((left, right) => compareMoments(right.createdAt, left.createdAt));
  const history = snapshot.history
    .filter((entry) => entry.sourceId === source.id)
    .sort((left, right) => compareMoments(right.observedAt, left.observedAt));
  const signals: MyStackSourceSignal[] = [];

  const pendingReview = reviews[0];
  const pendingChange = changes.find((change) => change.reviewStatus === "pending");
  const pendingHistory = history.find((entry) => entry.outcome === "review_pending");
  if (pendingReview) signals.push(reviewSignal(source, pendingReview));
  else if (pendingChange) signals.push(pendingChangeSignal(source, pendingChange));
  else if (pendingHistory) signals.push(historyReviewSignal(source, pendingHistory));

  if (source.status === "fetch_failed") signals.push(fetchFailureSignal(source, history));
  else if (source.status === "stale") signals.push(staleSignal(source));
  else if (source.status === "unknown" || source.status === "disabled") signals.push(unavailableSourceSignal(source));

  const comparison = comparisonSignal(source, changes, history, visitAt);
  if (comparison) signals.push(comparison);

  const uniqueSignals = Array.from(
    signals.reduce((map, signal) => {
      const current = map.get(signal.state);
      if (!current || (timestamp(signal.occurredAt) ?? 0) > (timestamp(current.occurredAt) ?? 0)) {
        map.set(signal.state, signal);
      }
      return map;
    }, new Map<MyStackChangeState, MyStackSourceSignal>()).values(),
  ).sort(compareSignals);

  if (!uniqueSignals.length) uniqueSignals.push(baselineSignal(source, history[0], visitAt));

  return {
    sourceId: source.id,
    sourceTitle: source.title,
    sourceUrl: source.url,
    primaryState: uniqueSignals[0].state,
    signals: uniqueSignals,
  };
}

function comparisonSignal(
  source: ObservationSourceView,
  changes: ObservationChangeView[],
  history: ObservationHistoryView[],
  visitAt: number | null,
): MyStackSourceSignal | null {
  if (source.status === "unknown" || source.status === "disabled") return null;
  if (visitAt === null) {
    return source.status === "healthy" ? baselineSignal(source, history[0], visitAt) : null;
  }

  const recentChange = changes.find((change) => {
    const occurred = timestamp(change.detectedAt);
    return occurred !== null
      && occurred > visitAt
      && change.reviewStatus !== "rejected"
      && change.reviewStatus !== "superseded"
      && change.reviewStatus !== "pending";
  });
  if (recentChange) return meaningfulChangeSignal(source, recentChange);

  const recentHistory = history.filter((entry) => {
    const occurred = timestamp(entry.observedAt);
    return occurred !== null && occurred > visitAt;
  });
  const changedHistory = recentHistory.find((entry) =>
    entry.outcome === "changed"
    && entry.reviewStatus !== "rejected"
    && entry.reviewStatus !== "superseded"
  );
  if (changedHistory) return historyChangeSignal(source, changedHistory);
  if (recentHistory.some((entry) => entry.outcome === "review_pending")) return null;

  if (source.status !== "healthy") return null;

  const unchangedHistory = recentHistory.find((entry) => entry.outcome === "unchanged");
  if (unchangedHistory) return unchangedSignal(source, unchangedHistory.observedAt);
  const baselineHistory = recentHistory.find((entry) => entry.outcome === "baseline");
  if (baselineHistory) return baselineSignal(source, baselineHistory, visitAt);

  return baselineSignal(source, history[0], visitAt);
}

function reviewSignal(source: ObservationSourceView, review: ObservationReviewView): MyStackSourceSignal {
  return {
    state: "review_pending",
    occurredAt: review.createdAt,
    reason: `${source.title}に、人の意味確認が必要な変更があります。${review.reason}`,
    nextAction: review.requiredAction,
  };
}

function pendingChangeSignal(source: ObservationSourceView, change: ObservationChangeView): MyStackSourceSignal {
  return {
    state: "review_pending",
    occurredAt: change.detectedAt,
    reason: `${source.title}で${formatFields(change.changedFields)}の差分を検出しました。意味は人の確認待ちです。`,
    nextAction: "変更履歴と公式原文を開き、人が意味と適用条件を確認してください。",
  };
}

function historyReviewSignal(source: ObservationSourceView, history: ObservationHistoryView): MyStackSourceSignal {
  return {
    state: "review_pending",
    occurredAt: history.observedAt,
    reason: `${source.title}に、人の意味確認が必要な変更履歴があります。`,
    nextAction: "変更履歴と公式原文を開き、意味と適用条件を確認してください。",
  };
}

function meaningfulChangeSignal(source: ObservationSourceView, change: ObservationChangeView): MyStackSourceSignal {
  return {
    state: "meaningful_change",
    occurredAt: change.detectedAt,
    reason: `${source.title}で${formatFields(change.changedFields)}の差分を検出しました（${materialityLabels[change.materiality]}）。`,
    nextAction: "変更履歴で前後値を確認し、Evidence Passportの条件と未知を見直してください。",
  };
}

function historyChangeSignal(source: ObservationSourceView, history: ObservationHistoryView): MyStackSourceSignal {
  return {
    state: "meaningful_change",
    occurredAt: history.observedAt,
    reason: `${source.title}で${formatFields(history.changedFields)}の変更履歴があります。`,
    nextAction: "変更履歴を開き、対象範囲と根拠を確認してください。",
  };
}

function fetchFailureSignal(source: ObservationSourceView, history: ObservationHistoryView[]): MyStackSourceSignal {
  const failure = history.find((entry) => entry.outcome === "fetch_failed");
  return {
    state: "fetch_failed",
    occurredAt: failure?.observedAt ?? source.lastCheckedAt,
    reason: `${source.title}の取得に失敗しています。最後の成功値を保持しています。製品・サービスの稼働状態は判定対象外です。`,
    nextAction: "Evidence Passportの最終成功値と取得履歴を確認し、公式Sourceを再観測してください。",
  };
}

function staleSignal(source: ObservationSourceView): MyStackSourceSignal {
  return {
    state: "stale",
    occurredAt: staleSince(source),
    reason: `${source.title}の最後の成功値が鮮度期限を超えています。状態は再確認待ちです。`,
    nextAction: "公式Sourceを再観測し、更新できるまで条件付きまたは不明として扱ってください。",
  };
}

function unchangedSignal(source: ObservationSourceView, occurredAt: string | null): MyStackSourceSignal {
  return {
    state: "unchanged_since_visit",
    occurredAt,
    reason: `${source.title}では前回訪問後の成功観測で意味のある変更を検出していません。安全性、適合性、リスクは別途確認が必要です。`,
    nextAction: "Evidence Passportで成立条件、未知、鮮度を引き続き確認してください。",
  };
}

function baselineSignal(
  source: ObservationSourceView,
  latestHistory: ObservationHistoryView | undefined,
  visitAt: number | null,
): MyStackSourceSignal {
  const noPreviousVisit = visitAt === null;
  const baselineAfterVisit = !noPreviousVisit
    && latestHistory?.outcome === "baseline"
    && (timestamp(latestHistory.observedAt) ?? 0) > visitAt;
  return {
    state: "baseline_only",
    occurredAt: latestHistory?.observedAt ?? source.lastSuccessfulFetchAt ?? source.lastCheckedAt,
    reason: noPreviousVisit
      ? `${source.title}には前回訪問時刻がありません。過去の変更を基準観測として表示します。`
      : baselineAfterVisit
        ? `${source.title}は前回訪問後に初回基準を取得しました。比較状態は未確定です。`
        : `${source.title}は前回訪問後の成功観測履歴を確認できません。比較状態は未確定です。`,
    nextAction: "次の公式観測後に比較し、現時点ではEvidence Passportの根拠と未知を確認してください。",
  };
}

function unavailableSourceSignal(source: ObservationSourceView): MyStackSourceSignal {
  return {
    state: "source_unavailable",
    occurredAt: source.lastCheckedAt,
    reason: source.status === "disabled"
      ? `${source.title}は無効です。観測状態は未確認です。`
      : `${source.title}には利用可能な公式観測がありません。観測状態は未確認です。`,
    nextAction: "対象詳細で接続済み根拠と未確認境界を確認してください。",
  };
}

function catalogOnlySource(): MyStackSourceSummary {
  const signal: MyStackSourceSignal = {
    state: "source_unavailable",
    occurredAt: null,
    reason: "現在のSource Registryへ直接接続されていないCatalog項目です。観測状態は未確認です。",
    nextAction: "対象詳細でCatalog根拠と未確認境界を確認してください。",
  };
  return {
    sourceId: null,
    sourceTitle: "Catalogのみ",
    sourceUrl: null,
    primaryState: signal.state,
    signals: [signal],
  };
}

function staleSince(source: ObservationSourceView) {
  const lastSuccessfulFetchAt = timestamp(source.lastSuccessfulFetchAt);
  if (lastSuccessfulFetchAt === null) return source.lastCheckedAt;
  return new Date(lastSuccessfulFetchAt + source.staleAfterSeconds * 1_000).toISOString();
}

function formatFields(fields: string[]) {
  return fields.length ? fields.map((field) => fieldLabels[field] ?? field).join("・") : "観測値";
}

function compareSignals(left: MyStackSourceSignal, right: MyStackSourceSignal) {
  const priority = statePriority[right.state] - statePriority[left.state];
  if (priority) return priority;
  return (timestamp(right.occurredAt) ?? 0) - (timestamp(left.occurredAt) ?? 0);
}

function compareMoments(left: string, right: string) {
  return (timestamp(left) ?? 0) - (timestamp(right) ?? 0);
}

function timestamp(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

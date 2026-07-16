import type {
  Claim,
  EpistemicStatus,
  EvidencePassportBundle,
  EvidenceReference,
  ObservationHistoryView,
  ObservationSnapshot,
  ObservationSourceView,
} from "./models.ts";

export type PassportEvidenceView = EvidenceReference & {
  sourceStatus: ObservationSourceView["status"] | "catalog_review" | "unavailable";
  fetchStatus: ObservationSourceView["fetchStatus"];
  currentSourceUrl: string;
  lastSuccessfulFetchAt: string | null;
  lastCheckedAt: string | null;
  nextDueAt: string | null;
  receiptValue: string;
};

export type PassportClaimView = Claim & {
  effectiveStatus: EpistemicStatus;
  hasEvidence: boolean;
  currentValue: string | null;
  evidenceState: "healthy" | "stale" | "fetch_failed" | "static" | "unavailable";
};

export type PassportTimelineItem = {
  id: string;
  type: ObservationHistoryView["outcome"] | "catalog_review";
  occurredAt: string;
  title: string;
  detail: string;
};

export type EvidencePassportView = {
  entityId: string;
  claims: PassportClaimView[];
  evidence: PassportEvidenceView[];
  coverage: EvidencePassportBundle["coverage"];
  timeline: PassportTimelineItem[];
  conditions: string[];
  unknowns: string[];
  limits: string[];
};

export function buildEvidencePassportView(
  bundle: EvidencePassportBundle,
  snapshot: ObservationSnapshot | null,
): EvidencePassportView {
  const evidence = bundle.evidence.map((reference) => projectEvidence(reference, snapshot));
  const claims = bundle.claims.map((claim) => projectClaim(claim, evidence, snapshot));
  return {
    entityId: bundle.entityId,
    claims,
    evidence,
    coverage: bundle.coverage,
    timeline: buildEvidenceTimeline(bundle, snapshot),
    conditions: unique(bundle.claims.flatMap((claim) => claim.conditions)),
    unknowns: unique(bundle.claims.flatMap((claim) => claim.unknowns)),
    limits: unique(bundle.claims.flatMap((claim) => claim.doesNotEstablish)),
  };
}

function projectEvidence(reference: EvidenceReference, snapshot: ObservationSnapshot | null): PassportEvidenceView {
  const source = reference.sourceId
    ? snapshot?.sources.find((item) => item.id === reference.sourceId)
    : undefined;
  const observedUrl = source?.observed.sourceUrl;
  const observedHash = source?.observed.documentHash;
  return {
    ...reference,
    sourceStatus: reference.sourceId ? source?.status ?? "unavailable" : "catalog_review",
    fetchStatus: source?.fetchStatus ?? null,
    currentSourceUrl: typeof observedUrl === "string" ? observedUrl : reference.sourceUrl,
    lastSuccessfulFetchAt: source?.lastSuccessfulFetchAt ?? reference.observedAt ?? null,
    lastCheckedAt: source?.lastCheckedAt ?? reference.observedAt ?? null,
    nextDueAt: source?.nextDueAt ?? null,
    receiptValue: typeof observedHash === "string"
      ? `content hash ${observedHash.slice(0, 12)}…`
      : reference.receiptReference ?? "受領証跡なし",
  };
}

function projectClaim(
  claim: Claim,
  evidence: PassportEvidenceView[],
  snapshot: ObservationSnapshot | null,
): PassportClaimView {
  const linked = evidence.filter((item) => claim.evidenceRefs.includes(item.evidenceId));
  const hasEvidence = linked.length > 0;
  const dynamic = linked.filter((item) => Boolean(item.sourceId));
  const evidenceState = !hasEvidence
    ? "unavailable"
    : dynamic.some((item) => item.sourceStatus === "fetch_failed")
      ? "fetch_failed"
      : dynamic.some((item) => item.sourceStatus === "stale")
        ? "stale"
        : dynamic.some((item) => item.sourceStatus === "unavailable" || item.sourceStatus === "unknown")
          ? "unavailable"
          : dynamic.length
            ? "healthy"
            : "static";
  const effectiveStatus = !hasEvidence || claim.epistemicStatus === "unknown"
    ? "unknown"
    : evidenceState === "stale"
      ? "stale"
      : evidenceState === "unavailable" && dynamic.length
        ? "unknown"
        : claim.epistemicStatus;
  const source = claim.observationBinding
    ? snapshot?.sources.find((item) => item.id === claim.observationBinding?.sourceId)
    : undefined;
  const rawValue = claim.observationBinding ? source?.observed[claim.observationBinding.field] : undefined;
  return {
    ...claim,
    effectiveStatus,
    hasEvidence,
    evidenceState,
    currentValue: claim.observationBinding
      ? `${claim.observationBinding.label}：${formatObservedValue(rawValue)}`
      : null,
  };
}

export function buildEvidenceTimeline(
  bundle: EvidencePassportBundle,
  snapshot: ObservationSnapshot | null,
): PassportTimelineItem[] {
  const catalog = bundle.catalogHistory.map((entry, index): PassportTimelineItem => ({
    id: `catalog-${index}-${entry.date}`,
    type: "catalog_review",
    occurredAt: entry.date,
    title: "カタログ根拠を確認",
    detail: entry.summary,
  }));
  const observations = (snapshot?.history ?? [])
    .filter((entry) => entry.entityId === bundle.entityId)
    .map(observationTimelineItem);
  return [...catalog, ...observations]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 10);
}

function observationTimelineItem(entry: ObservationHistoryView): PassportTimelineItem {
  const label: Record<ObservationHistoryView["outcome"], string> = {
    baseline: "初回基準観測",
    unchanged: "不変を確認",
    changed: "意味のある変更を検出",
    fetch_failed: "取得失敗",
    review_pending: "Review Queue対象",
  };
  const detail = entry.outcome === "fetch_failed"
    ? `情報源の取得に失敗（HTTP ${entry.httpStatus ?? "未取得"}）。サービス障害とは判定しない。`
    : entry.changedFields.length
      ? `${entry.changedFields.join(" / ")} の変化を記録。`
      : entry.fetchStatus === "not_modified"
        ? "条件付き取得で更新なしを確認。"
        : "正規化した判断対象に変化なし。";
  return {
    id: entry.id,
    type: entry.outcome,
    occurredAt: entry.observedAt,
    title: `${label[entry.outcome]} — ${entry.sourceTitle}`,
    detail,
  };
}

function formatObservedValue(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "未観測";
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

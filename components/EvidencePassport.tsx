"use client";

import { useMemo } from "react";
import { buildEvidencePassportView } from "../data/evidence-passport";
import type {
  EpistemicStatus,
  EvidenceMethod,
  EvidenceOrigin,
  EvidencePassportBundle,
  ObservationSourceView,
} from "../data/models";
import { useObservationSnapshot } from "./useObservationSnapshot";

const epistemicLabels: Record<EpistemicStatus, string> = {
  officially_stated: "公式記載",
  observed_current: "現在観測",
  conditional: "条件付き",
  unknown: "未確認",
  conflicted: "矛盾あり",
  stale: "鮮度超過",
};

const originLabels: Record<EvidenceOrigin, string> = {
  official_publisher: "公式発行者",
  official_project: "公式プロジェクト",
  third_party_field_report: "第三者実地報告",
  operator_field_test: "運営者実機試験",
};

const methodLabels: Record<EvidenceMethod, string> = {
  status_api: "公式Status API",
  release_feed: "公式Release Feed",
  official_terms: "公式規約",
  compatibility_document: "公式互換・要件文書",
  field_test: "実機試験",
};

const sourceStatusLabels: Record<ObservationSourceView["status"] | "catalog_review" | "unavailable", string> = {
  healthy: "取得正常",
  stale: "鮮度超過",
  fetch_failed: "取得失敗・最終成功値を保持",
  disabled: "無効",
  unknown: "未観測",
  catalog_review: "人手確認記録",
  unavailable: "観測未接続",
};

const historyLabels = {
  baseline: "基準",
  unchanged: "不変",
  changed: "変更",
  fetch_failed: "取得失敗",
  review_pending: "要レビュー",
  catalog_review: "人手確認",
} as const;

export function EvidencePassport({ bundle }: { bundle: EvidencePassportBundle }) {
  const { snapshot, loading, error } = useObservationSnapshot();
  const passport = useMemo(() => buildEvidencePassportView(bundle, snapshot), [bundle, snapshot]);

  if (!passport.claims.length) {
    return (
      <section className="evidence-passport evidence-passport-empty" id="history" aria-labelledby="evidence-passport-heading">
        <header className="passport-heading">
          <div><p className="section-kicker">EVIDENCE PASSPORT v0</p><h2 id="evidence-passport-heading">判断根拠</h2></div>
          <span className="epistemic-badge is-unknown">未確認</span>
        </header>
        <p>この対象には、現在のSource Registryへ直接接続できるClaimがありません。カタログ情報は表示しますが、公式観測済みとは扱いません。</p>
      </section>
    );
  }

  return (
    <section className="evidence-passport" aria-labelledby="evidence-passport-heading">
      <header className="passport-heading">
        <div>
          <p className="section-kicker">EVIDENCE PASSPORT v0</p>
          <h2 id="evidence-passport-heading">現時点の判断根拠</h2>
          <p>結論、根拠、条件、未知、鮮度を分離し、Claimから公式SourceとObservationまで追跡できます。</p>
        </div>
        <div className="passport-runtime-state" aria-live="polite">
          {loading ? "実観測を読み込み中" : error ? "実観測を取得できません" : `観測更新 ${formatMoment(snapshot?.generatedAt ?? null)}`}
        </div>
      </header>

      <section className="passport-section" aria-labelledby="passport-current-heading">
        <div className="passport-section-heading"><span>01</span><div><h3 id="passport-current-heading">現在確認できること</h3><p>出典へ結び付いた事実と、未確認の境界を同じ精度で表示します。</p></div></div>
        <div className="passport-claim-grid">
          {passport.claims.map((claim) => (
            <article className="passport-claim" key={claim.claimId}>
              <div className="passport-claim-topline">
                <span className={`epistemic-badge is-${claim.effectiveStatus}`}>{epistemicLabels[claim.effectiveStatus]}</span>
                <code>{claim.topic}</code>
              </div>
              <h4>{claim.statement}</h4>
              {claim.currentValue && <strong className="passport-current-value">{claim.currentValue}</strong>}
              <dl>
                <div><dt>適用範囲</dt><dd>{claim.scope}</dd></div>
                <div><dt>対象</dt><dd>{formatList([...claim.applicableVersions, ...claim.applicablePlatforms])}</dd></div>
                <div><dt>根拠</dt><dd>{claim.hasEvidence ? `${claim.evidenceRefs.length}件へ追跡可能` : "接続済み根拠なし"}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="passport-section" aria-labelledby="passport-evidence-heading">
        <div className="passport-section-heading"><span>02</span><div><h3 id="passport-evidence-heading">根拠</h3><p>公式性と取得方法を明示し、実機試験と文書確認を混同しません。</p></div></div>
        <div className="passport-evidence-list">
          {passport.evidence.map((evidence) => (
            <article key={evidence.evidenceId}>
              <div className="passport-evidence-title">
                <div><span>{originLabels[evidence.origin]}</span><h4>{evidence.publisher}</h4></div>
                <strong className={`source-state is-${evidence.sourceStatus}`}>{sourceStatusLabels[evidence.sourceStatus]}</strong>
              </div>
              <p>{evidence.summary}</p>
              <dl>
                <div><dt>取得方法</dt><dd>{methodLabels[evidence.method]}</dd></div>
                <div><dt>適用対象</dt><dd>{evidence.appliesTo}</dd></div>
                <div><dt>最終成功</dt><dd>{formatMoment(evidence.lastSuccessfulFetchAt)}</dd></div>
                <div><dt>最終試行</dt><dd>{formatMoment(evidence.lastCheckedAt)}</dd></div>
                <div><dt>次回目標</dt><dd>{formatMoment(evidence.nextDueAt)}</dd></div>
                <div><dt>受領証跡</dt><dd><code>{evidence.receiptValue}</code></dd></div>
              </dl>
              <a href={evidence.currentSourceUrl} target="_blank" rel="noopener noreferrer">公式出典を開く ↗</a>
            </article>
          ))}
        </div>
      </section>

      <section className="passport-section" aria-labelledby="passport-limits-heading">
        <div className="passport-section-heading"><span>03</span><div><h3 id="passport-limits-heading">条件と限界</h3><p>「運営者が未試験」と「証拠がない」を分けます。</p></div></div>
        <div className="passport-coverage" aria-label="証拠の種類">
          <Coverage label="公式資料" value={passport.coverage.officialDocumentation} trueText="あり" falseText="なし" />
          <Coverage label="運営者実機試験" value={passport.coverage.operatorFieldTest} trueText="実施" falseText="未実施" />
          <Coverage label="開発元の試験情報" value={passport.coverage.publisherTestInformation} trueText="あり" falseText="未登録" />
          <Coverage label="第三者実地報告" value={passport.coverage.thirdPartyFieldReports} trueText="あり" falseText="未収集" />
          <Coverage label="適用条件" value={passport.coverage.conditionsIdentified} trueText="特定済み" falseText="未特定" />
        </div>
        <div className="passport-limit-columns">
          <LimitList title="成立条件" items={passport.conditions} empty="追加条件は未登録" />
          <LimitList title="未確認部分" items={passport.unknowns} empty="未確認項目は未登録" />
          <LimitList title="この根拠から結論できないこと" items={passport.limits} empty="限界は未登録" />
        </div>
        {passport.evidence.some((item) => item.sourceStatus === "fetch_failed") && <p className="passport-warning">取得失敗があります。最後の成功値は保持していますが、サービス障害とは判定していません。</p>}
        {passport.evidence.some((item) => item.sourceStatus === "stale") && <p className="passport-warning">鮮度期限を超えた根拠があります。現在情報として扱わず、再確認が必要です。</p>}
      </section>

      <section className="passport-section" id="history" aria-labelledby="passport-history-heading">
        <div className="passport-section-heading"><span>04</span><div><h3 id="passport-history-heading">変更履歴</h3><p>判断に必要な履歴だけを、基準・不変・変更・失敗・レビュー待ちに分けます。</p></div></div>
        <ol className="passport-timeline">
          {passport.timeline.map((item) => (
            <li key={item.id} data-history-type={item.type}>
              <div><span>{historyLabels[item.type]}</span><time dateTime={item.occurredAt}>{formatMoment(item.occurredAt)}</time></div>
              <article><h4>{item.title}</h4><p>{item.detail}</p></article>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}

function Coverage({ label, value, trueText, falseText }: { label: string; value: boolean; trueText: string; falseText: string }) {
  return <div><span>{label}</span><strong className={value ? "is-available" : "is-unavailable"}>{value ? trueText : falseText}</strong></div>;
}

function LimitList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <article><h4>{title}</h4><ul>{items.length ? items.map((item) => <li key={item}>{item}</li>) : <li>{empty}</li>}</ul></article>;
}

function formatList(values: string[]) {
  return values.length ? values.join(" / ") : "特定なし";
}

function formatMoment(value: string | null) {
  if (!value) return "未観測";
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(value));
}

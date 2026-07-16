import assert from "node:assert/strict";
import test from "node:test";
import { buildEvidencePassportView } from "../data/evidence-passport.ts";
import { evidenceClaims, evidenceReferences, getEvidenceCoverage, listClaimsForEntity, listEvidenceForClaim, listEvidenceForEntity } from "../data/evidence.ts";
import type { EvidencePassportBundle, ObservationHistoryView, ObservationSnapshot, ObservationSourceView } from "../data/models.ts";

test("confirmed-equivalent claims trace to registered evidence", () => {
  for (const claim of evidenceClaims.filter((item) => item.epistemicStatus !== "unknown")) {
    assert.ok(claim.evidenceRefs.length > 0, claim.claimId);
    const evidence = listEvidenceForClaim(claim.claimId);
    assert.equal(evidence.length, claim.evidenceRefs.length, claim.claimId);
    assert.ok(evidence.every((item) => item.sourceUrl.startsWith("https://")), claim.claimId);
  }
  assert.ok(evidenceReferences.some((item) => item.sourceId === "obs-studio-releases"));
  assert.ok(evidenceReferences.some((item) => item.sourceId === "voicevox-software-terms"));
});

test("operatorTested false remains distinct from official evidence", () => {
  const bundle = passportBundle("sw-obs-studio");
  const passport = buildEvidencePassportView(bundle, snapshot());
  assert.equal(bundle.coverage.operatorFieldTest, false);
  assert.equal(bundle.coverage.officialDocumentation, true);
  assert.ok(passport.claims.some((claim) => claim.operatorTested === false && claim.hasEvidence));
  assert.ok(passport.evidence.every((item) => item.origin !== "operator_field_test"));
  assert.ok(passport.claims.filter((claim) => claim.epistemicStatus === "conditional").every((claim) => claim.conditions.length > 0));
});

test("unknown and stale do not become current or compatible", () => {
  const unknown = buildEvidencePassportView(passportBundle("sw-voicevox"), snapshot())
    .claims.find((claim) => claim.claimId === "claim-voicevox-offline-unknown");
  assert.equal(unknown?.effectiveStatus, "unknown");
  assert.equal(unknown?.hasEvidence, false);

  const staleSnapshot = snapshot({
    sources: [source({ id: "obs-studio-releases", entityId: "sw-obs-studio", status: "stale", observed: { version: "32.1.2" } })],
  });
  const release = buildEvidencePassportView(passportBundle("sw-obs-studio"), staleSnapshot)
    .claims.find((claim) => claim.claimId === "claim-obs-current-release");
  assert.equal(release?.effectiveStatus, "stale");
});

test("fetch failure stays separate from service status and terms hash has no commercial verdict", () => {
  const twitchSnapshot = snapshot({
    sources: [source({
      id: "twitch-status",
      entityId: "setup-ag03-ipad-usbc",
      status: "fetch_failed",
      fetchStatus: "error",
      observed: { officialStatus: "operational", statusDescription: "All Systems Operational" },
    })],
  });
  const twitch = buildEvidencePassportView(passportBundle("setup-ag03-ipad-usbc"), twitchSnapshot);
  assert.equal(twitch.claims[0]?.evidenceState, "fetch_failed");
  assert.match(twitch.claims[0]?.currentValue ?? "", /All Systems Operational/);
  assert.ok(twitch.claims[0]?.doesNotEstablish.some((item) => item.includes("ローカル機材構成")));

  const termsSnapshot = snapshot({
    sources: [source({
      id: "voicevox-software-terms",
      entityId: "sw-voicevox",
      observed: { documentHash: "a".repeat(64) },
    })],
  });
  const commercial = buildEvidencePassportView(passportBundle("sw-voicevox"), termsSnapshot)
    .claims.find((claim) => claim.claimId === "claim-voicevox-commercial-conditional");
  assert.equal(commercial?.effectiveStatus, "conditional");
  assert.equal(commercial?.currentValue, null);
  assert.ok(commercial?.doesNotEstablish.some((item) => item.includes("規約hash")));
});

test("history separates baseline, unchanged, change, failure and review", () => {
  const outcomes: ObservationHistoryView["outcome"][] = ["baseline", "unchanged", "changed", "fetch_failed", "review_pending"];
  const history = outcomes.map((outcome, index): ObservationHistoryView => ({
    id: `history-${outcome}`,
    sourceId: "voicevox-releases",
    entityId: "sw-voicevox",
    sourceTitle: "VOICEVOX 最新リリース",
    sourceUrl: "https://example.com",
    observedAt: `2026-07-${String(10 + index).padStart(2, "0")}T00:00:00.000Z`,
    fetchStatus: outcome === "fetch_failed" ? "error" : outcome === "unchanged" ? "not_modified" : "success",
    httpStatus: outcome === "fetch_failed" ? 500 : 200,
    outcome,
    changeEventId: outcome === "changed" || outcome === "review_pending" ? `change-${index}` : null,
    reviewStatus: outcome === "review_pending" ? "pending" : outcome === "changed" ? "auto_applied" : null,
    changedFields: outcome === "changed" || outcome === "review_pending" ? ["version"] : [],
  }));
  const timeline = buildEvidencePassportView(passportBundle("sw-voicevox"), snapshot({ history })).timeline;
  for (const outcome of outcomes) assert.ok(timeline.some((item) => item.type === outcome), outcome);
});

test("source-less catalog records render an explicit unknown boundary", () => {
  const passport = buildEvidencePassportView(passportBundle("sw-premiere"), snapshot());
  assert.equal(passport.claims.length, 0);
  assert.equal(passport.evidence.length, 0);
  assert.equal(passport.coverage.officialDocumentation, false);
});

function source(overrides: Partial<ObservationSourceView> = {}): ObservationSourceView {
  return {
    id: "obs-studio-releases",
    entityId: "sw-obs-studio",
    title: "OBS Studio 最新リリース",
    url: "https://example.com",
    sourceType: "github_release_json",
    publisher: "OBS Project",
    status: "healthy",
    fetchStatus: "success",
    httpStatus: 200,
    lastCheckedAt: "2026-07-16T08:00:00.000Z",
    lastSuccessfulFetchAt: "2026-07-16T08:00:00.000Z",
    lastChangedAt: null,
    nextDueAt: "2026-07-16T20:00:00.000Z",
    cadenceSeconds: 43_200,
    staleAfterSeconds: 172_800,
    observed: { version: "32.1.2" },
    ...overrides,
  };
}

function snapshot(overrides: Partial<ObservationSnapshot> = {}): ObservationSnapshot {
  return {
    generatedAt: "2026-07-16T08:00:00.000Z",
    automation: { mode: "manual_owner", scheduled: false, note: "manual" },
    totals: {
      realSourceCount: 0,
      sampleCount: 1,
      lastObservedAt: null,
      lastChangedAt: null,
      changedCount: 0,
      pendingReviewCount: 0,
      failureCount: 0,
      staleCount: 0,
    },
    sources: [],
    changes: [],
    reviews: [],
    runs: [],
    history: [],
    ...overrides,
  };
}

function passportBundle(entityId: string): EvidencePassportBundle {
  return {
    entityId,
    claims: listClaimsForEntity(entityId),
    evidence: listEvidenceForEntity(entityId),
    coverage: getEvidenceCoverage(entityId),
    catalogHistory: [{ date: "2026-07-16", summary: "カタログ根拠を確認。" }],
  };
}

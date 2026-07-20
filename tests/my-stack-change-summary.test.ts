import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildMyStackChangeSummaries } from "../data/my-stack-change-summary.ts";
import type {
  CatalogItem,
  ObservationChangeView,
  ObservationHistoryView,
  ObservationReviewView,
  ObservationSnapshot,
  ObservationSourceView,
} from "../data/models.ts";

const catalog: CatalogItem[] = [
  item("sw-obs", "OBS Studio", "/softwares/obs-studio"),
  item("sw-voicevox", "VOICEVOX", "/softwares/voicevox"),
  item("sw-catalog-only", "Catalog Only", "/softwares/catalog-only"),
];
const visit = "2026-07-16T12:00:00.000Z";

test("summarizes only saved catalog entities", () => {
  const result = buildMyStackChangeSummaries({
    catalog,
    savedIds: ["sw-voicevox", "missing"],
    previousVisit: visit,
    snapshot: snapshot({ sources: [source({ entityId: "sw-voicevox", id: "voicevox-releases" })] }),
  });
  assert.deepEqual(result.map((entry) => entry.entityId), ["sw-voicevox"]);
});

test("changes before previousVisit do not become new changes", () => {
  const result = buildMyStackChangeSummaries({
    catalog,
    savedIds: ["sw-obs"],
    previousVisit: visit,
    snapshot: snapshot({
      sources: [source()],
      changes: [change({ detectedAt: "2026-07-16T10:00:00.000Z" })],
      history: [history({ outcome: "unchanged", observedAt: "2026-07-16T13:00:00.000Z" })],
    }),
  });
  assert.equal(result[0].primaryState, "unchanged_since_visit");
  assert.ok(result[0].sources[0].signals.every((signal) => signal.state !== "meaningful_change"));
});

test("baseline and unchanged remain distinct from meaningful change", () => {
  const result = buildMyStackChangeSummaries({
    catalog,
    savedIds: ["sw-obs", "sw-voicevox"],
    previousVisit: visit,
    snapshot: snapshot({
      sources: [
        source(),
        source({ id: "voicevox-releases", entityId: "sw-voicevox", title: "VOICEVOX release" }),
      ],
      history: [
        history({ outcome: "baseline", observedAt: "2026-07-16T13:00:00.000Z" }),
        history({
          id: "h2",
          sourceId: "voicevox-releases",
          entityId: "sw-voicevox",
          sourceTitle: "VOICEVOX release",
          outcome: "unchanged",
          observedAt: "2026-07-16T14:00:00.000Z",
        }),
      ],
    }),
  });
  const states = new Map(result.map((entry) => [entry.entityId, entry.primaryState]));
  assert.equal(states.get("sw-obs"), "baseline_only");
  assert.equal(states.get("sw-voicevox"), "unchanged_since_visit");
});

test("fetch failure never becomes a product or service outage verdict", () => {
  const result = buildMyStackChangeSummaries({
    catalog,
    savedIds: ["sw-obs"],
    previousVisit: visit,
    snapshot: snapshot({
      sources: [source({ status: "fetch_failed", fetchStatus: "error", lastCheckedAt: "2026-07-16T14:00:00.000Z" })],
      history: [history({ outcome: "fetch_failed", fetchStatus: "error", observedAt: "2026-07-16T14:00:00.000Z" })],
    }),
  });
  assert.equal(result[0].primaryState, "fetch_failed");
  assert.match(result[0].reason, /製品・サービス障害ではありません/);
});

test("source-less catalog records are unavailable, not unchanged", () => {
  const result = buildMyStackChangeSummaries({
    catalog,
    savedIds: ["sw-catalog-only"],
    previousVisit: visit,
    snapshot: snapshot(),
  });
  assert.equal(result[0].primaryState, "source_unavailable");
  assert.equal(result[0].sources[0].sourceId, null);
  assert.match(result[0].reason, /変更なしとして扱いません/);
});

test("multiple VOICEVOX sources retain every source-level state", () => {
  const result = buildMyStackChangeSummaries({
    catalog,
    savedIds: ["sw-voicevox"],
    previousVisit: visit,
    snapshot: snapshot({
      sources: [
        source({ id: "voicevox-releases", entityId: "sw-voicevox", title: "VOICEVOX release" }),
        source({
          id: "voicevox-terms",
          entityId: "sw-voicevox",
          title: "VOICEVOX terms",
          sourceType: "official_terms_html",
        }),
      ],
      changes: [change({
        id: "release-change",
        sourceId: "voicevox-releases",
        entityId: "sw-voicevox",
        sourceTitle: "VOICEVOX release",
        detectedAt: "2026-07-16T13:00:00.000Z",
      })],
      reviews: [review()],
    }),
  });
  assert.equal(result[0].sources.length, 2);
  assert.deepEqual(
    new Set(result[0].sources.map((entry) => entry.sourceId)),
    new Set(["voicevox-releases", "voicevox-terms"]),
  );
  assert.equal(result[0].primaryState, "review_pending");
  assert.ok(result[0].sources.some((entry) => entry.signals.some((signal) => signal.state === "meaningful_change")));
  assert.ok(result[0].sources.some((entry) => entry.signals.some((signal) => signal.state === "review_pending")));
});

test("missing previousVisit treats history as a baseline instead of a new change", () => {
  const result = buildMyStackChangeSummaries({
    catalog,
    savedIds: ["sw-obs"],
    previousVisit: null,
    snapshot: snapshot({
      sources: [source()],
      changes: [change({ detectedAt: "2026-07-16T13:00:00.000Z" })],
    }),
  });
  assert.equal(result[0].primaryState, "baseline_only");
  assert.match(result[0].reason, /過去の変更を新着扱いせず/);
});

test("absence of bounded history is not inferred as unchanged", () => {
  const result = buildMyStackChangeSummaries({
    catalog,
    savedIds: ["sw-obs"],
    previousVisit: visit,
    snapshot: snapshot({
      sources: [source({ lastCheckedAt: "2026-07-16T14:00:00.000Z" })],
    }),
  });
  assert.equal(result[0].primaryState, "baseline_only");
  assert.match(result[0].reason, /変更なしとは判定しません/);
});

test("stale state is dated from the successful-fetch freshness boundary", () => {
  const result = buildMyStackChangeSummaries({
    catalog,
    savedIds: ["sw-obs"],
    previousVisit: visit,
    snapshot: snapshot({
      sources: [source({
        status: "stale",
        lastSuccessfulFetchAt: "2026-07-16T10:00:00.000Z",
        staleAfterSeconds: 7_200,
      })],
    }),
  });
  assert.equal(result[0].primaryState, "stale");
  assert.equal(result[0].occurredAt, "2026-07-16T12:00:00.000Z");
});

test("summary links route changes to history and stable boundaries to Evidence Passport", () => {
  const changed = buildMyStackChangeSummaries({
    catalog,
    savedIds: ["sw-obs"],
    previousVisit: visit,
    snapshot: snapshot({
      sources: [source()],
      changes: [change({ detectedAt: "2026-07-16T13:00:00.000Z" })],
    }),
  })[0];
  const catalogOnly = buildMyStackChangeSummaries({
    catalog,
    savedIds: ["sw-catalog-only"],
    previousVisit: visit,
    snapshot: snapshot(),
  })[0];
  assert.equal(changed.targetHref, "/softwares/obs-studio#history");
  assert.equal(catalogOnly.targetHref, "/softwares/catalog-only#evidence-passport-heading");
});



test("My Stack UI keeps ready, empty, loading and snapshot-error boundaries", async () => {
  const client = await readFile(new URL("../components/MyStackClient.tsx", import.meta.url), "utf8");
  assert.match(client, /保存内容を読み込んでいます/);
  assert.match(client, /data-testid="my-stack-empty"/);
  assert.match(client, /data-testid="my-stack-summary-loading"/);
  assert.match(client, /data-testid="my-stack-summary-error"/);
  assert.match(client, /summary\.targetHref/);
  assert.match(client, /Number\.isNaN\(date\.getTime\(\)\)/);
});

test("My Stack provider captures previousVisit before overwriting the visit key", async () => {
  const provider = await readFile(new URL("../components/MyStackProvider.tsx", import.meta.url), "utf8");
  const readPreviousVisit = provider.indexOf("setPreviousVisit(localStorage.getItem(VISIT_KEY))");
  const writeCurrentVisit = provider.indexOf("localStorage.setItem(VISIT_KEY, new Date().toISOString())");
  assert.ok(readPreviousVisit >= 0);
  assert.ok(writeCurrentVisit > readPreviousVisit);
});

function item(id: string, name: string, href: string): CatalogItem {
  return {
    id,
    kind: "software",
    name,
    href,
    verdict: "未確認",
    summary: "summary",
    verifiedAt: "2026-07-16",
    recheckAt: "2026-08-16",
    physicalTested: false,
  };
}

function source(overrides: Partial<ObservationSourceView> = {}): ObservationSourceView {
  return {
    id: "obs-releases",
    entityId: "sw-obs",
    title: "OBS release",
    url: "https://example.com",
    sourceType: "github_release_json",
    publisher: "publisher",
    status: "healthy",
    fetchStatus: "success",
    httpStatus: 200,
    lastCheckedAt: "2026-07-16T13:00:00.000Z",
    lastSuccessfulFetchAt: "2026-07-16T13:00:00.000Z",
    lastChangedAt: null,
    nextDueAt: "2026-07-17T13:00:00.000Z",
    cadenceSeconds: 43_200,
    staleAfterSeconds: 172_800,
    observed: {},
    ...overrides,
  };
}

function change(overrides: Partial<ObservationChangeView> = {}): ObservationChangeView {
  return {
    id: "change",
    sourceId: "obs-releases",
    entityId: "sw-obs",
    sourceTitle: "OBS release",
    sourceUrl: "https://example.com",
    detectedAt: "2026-07-16T13:00:00.000Z",
    changedFields: ["version"],
    previousValues: { version: "1" },
    newValues: { version: "2" },
    materiality: "compatibility_relevant",
    reviewStatus: "auto_applied",
    ...overrides,
  };
}

function review(overrides: Partial<ObservationReviewView> = {}): ObservationReviewView {
  return {
    id: "review",
    changeEventId: "terms-change",
    entityId: "sw-voicevox",
    sourceId: "voicevox-terms",
    sourceTitle: "VOICEVOX terms",
    sourceUrl: "https://example.com/terms",
    reason: "規約本文hashが変化しました。",
    requiredAction: "公式原文を人が確認してください。",
    status: "pending",
    createdAt: "2026-07-16T14:00:00.000Z",
    ...overrides,
  };
}

function history(overrides: Partial<ObservationHistoryView> = {}): ObservationHistoryView {
  return {
    id: "history",
    sourceId: "obs-releases",
    entityId: "sw-obs",
    sourceTitle: "OBS release",
    sourceUrl: "https://example.com",
    observedAt: "2026-07-16T13:00:00.000Z",
    fetchStatus: "success",
    httpStatus: 200,
    outcome: "baseline",
    changeEventId: null,
    reviewStatus: null,
    changedFields: [],
    ...overrides,
  };
}

function snapshot(overrides: Partial<ObservationSnapshot> = {}): ObservationSnapshot {
  return {
    generatedAt: "2026-07-16T15:00:00.000Z",
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

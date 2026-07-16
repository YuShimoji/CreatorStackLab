import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SOURCE_REGISTRY,
  describeChange,
  evaluateOutcome,
  fetchOfficialSource,
  isStale,
  normalizeOfficialPayload,
  sha256,
  transitionKey,
} from "../lib/observation-engine.ts";

const fixture = (name: string) => readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const statusSource = SOURCE_REGISTRY.find((source) => source.sourceType === "statuspage_json")!;
const releaseSource = SOURCE_REGISTRY.find((source) => source.id === "obs-studio-releases")!;
const termsSource = SOURCE_REGISTRY.find((source) => source.sourceType === "official_terms_html")!;

test("registry uses four scoped official sources and keeps terms review-only", () => {
  assert.equal(SOURCE_REGISTRY.length, 4);
  assert.ok(SOURCE_REGISTRY.some((source) => source.sourceType === "statuspage_json"));
  assert.ok(SOURCE_REGISTRY.some((source) => source.sourceType === "github_release_json"));
  assert.equal(termsSource.autoApply, false);
  assert.ok(SOURCE_REGISTRY.every((source) => source.officialStatus === "official" && source.enabled));
});

test("first JSON fetch stores a high-confidence baseline", async () => {
  const body = await fixture("status-operational.json");
  const observation = await fetchOfficialSource(statusSource, {}, async () => response(body, 200, { etag: 'W/"first"' }), new Date("2026-07-16T08:00:00Z"));
  assert.equal(observation.fetchStatus, "success");
  assert.equal(observation.extractedFields?.officialStatus, "operational");
  assert.equal(observation.extractionConfidence, "high");
  assert.equal(evaluateOutcome(null, observation), "initial");
  assert.ok(observation.contentHash);
});

test("status and GitHub release adapters persist only decision fields", async () => {
  const status = normalizeOfficialPayload(statusSource, await fixture("status-operational.json"));
  const release = normalizeOfficialPayload(releaseSource, await fixture("github-release.json"));
  assert.deepEqual(status.extractedFields.officialStatus, "operational");
  assert.deepEqual(release.extractedFields.version, "32.1.2");
  assert.equal("body" in release.extractedFields, false);
  assert.match(release.contentBasis, /32\.1\.2/);
});

test("conditional request handles 304 as unchanged", async () => {
  let sentEtag: string | null = null;
  let sentModified: string | null = null;
  const observation = await fetchOfficialSource(statusSource, {
    etag: 'W/"known"', lastModified: "Wed, 15 Jul 2026 00:00:00 GMT", contentHash: "abc", extractedFields: { officialStatus: "operational" },
  }, async (_url, init) => {
    const headers = new Headers(init?.headers);
    sentEtag = headers.get("if-none-match");
    sentModified = headers.get("if-modified-since");
    return response("", 304, { etag: 'W/"known"' });
  });
  assert.equal(sentEtag, 'W/"known"');
  assert.equal(sentModified, "Wed, 15 Jul 2026 00:00:00 GMT");
  assert.equal(observation.fetchStatus, "not_modified");
  assert.equal(evaluateOutcome("abc", observation), "unchanged");
});

test("same normalized hash is unchanged and meaningful status change is auto-applied", async () => {
  const oldPayload = normalizeOfficialPayload(statusSource, await fixture("status-operational.json"));
  const sameHash = await sha256(oldPayload.contentBasis);
  const sameObservation = await fetchOfficialSource(statusSource, {}, async () => response(await fixture("status-operational.json")));
  assert.equal(evaluateOutcome(sameHash, sameObservation), "unchanged");

  const nextPayload = normalizeOfficialPayload(statusSource, await fixture("status-degraded.json"));
  const change = describeChange(statusSource, oldPayload.extractedFields, nextPayload.extractedFields);
  assert.ok(change);
  assert.equal(change.reviewStatus, "auto_applied");
  assert.equal(change.materiality, "potentially_breaking");
  assert.ok(change.changedFields.includes("officialStatus"));
});

test("cosmetic HTML changes do not create a terms change, wording changes require review", async () => {
  const first = normalizeOfficialPayload(termsSource, await fixture("terms-a.html"));
  const cosmetic = normalizeOfficialPayload(termsSource, await fixture("terms-cosmetic.html"));
  assert.equal(await sha256(first.contentBasis), await sha256(cosmetic.contentBasis));

  const changed = normalizeOfficialPayload(termsSource, (await fixture("terms-a.html")).replace("必要です", "原則として必要です"));
  const oldHash = await sha256(first.contentBasis);
  const newHash = await sha256(changed.contentBasis);
  const descriptor = describeChange(termsSource, { ...first.extractedFields, documentHash: oldHash }, { ...changed.extractedFields, documentHash: newHash });
  assert.ok(descriptor);
  assert.equal(descriptor.reviewStatus, "pending");
  assert.equal(descriptor.materiality, "commercial_terms_relevant");
  assert.match(descriptor.requiredAction ?? "", /人が確認/);
});

test("timeout, HTTP error and malformed JSON are fetch failures, not service outages", async () => {
  const timeout = await fetchOfficialSource(statusSource, {}, async (_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  }), new Date(), 5);
  const httpError = await fetchOfficialSource(statusSource, {}, async () => response("downstream", 503));
  const malformed = await fetchOfficialSource(statusSource, {}, async () => response("{not-json"));
  assert.equal(timeout.receipt.error, "timeout");
  assert.equal(httpError.httpStatus, 503);
  assert.equal(malformed.receipt.error, "malformed_json");
  for (const item of [timeout, httpError, malformed]) {
    assert.equal(item.fetchStatus, "error");
    assert.equal(item.extractedFields, null);
    assert.equal(evaluateOutcome("last-good-hash", item), "failure");
  }
});

test("last successful value can be preserved and freshness expires independently", () => {
  const lastGood = { officialStatus: "operational", observedAt: "2026-07-16T00:00:00Z" };
  assert.equal(isStale(lastGood.observedAt, 7_200, new Date("2026-07-16T01:00:00Z")), false);
  assert.equal(isStale(lastGood.observedAt, 7_200, new Date("2026-07-16T03:00:01Z")), true);
  assert.equal(lastGood.officialStatus, "operational");
});

test("transition and D1 uniqueness keys deduplicate events, reviews and repeated runs", async () => {
  assert.equal(transitionKey("source", "a".repeat(64), "b".repeat(64)), transitionKey("source", "a".repeat(64), "b".repeat(64)));
  const migration = await readFile(new URL("../drizzle/0000_panoramic_moon_knight.sql", import.meta.url), "utf8");
  assert.match(migration, /change_events_transition_unique/);
  assert.match(migration, /review_queue_event_unique/);
  assert.match(migration, /update_runs_idempotency_unique/);
});

function response(body: string, status = 200, headers: Record<string, string> = {}) {
  return new Response(status === 304 ? null : body, { status, headers: { "content-type": "application/json", ...headers } });
}

import {
  SOURCE_REGISTRY,
  describeChange,
  evaluateOutcome,
  fetchOfficialSource,
  isStale,
  nextDueAt,
  transitionKey,
  type FetchObservation,
  type SourceDefinition,
} from "../lib/observation-engine";

type SourceRow = {
  id: string;
  entity_id: string;
  title: string;
  url: string;
  source_type: string;
  publisher: string;
  enabled: number;
  monitoring_cadence_seconds: number;
  stale_after_seconds: number;
  last_checked_at: string | null;
  last_changed_at: string | null;
  last_successful_fetch_at: string | null;
  etag: string | null;
  last_modified: string | null;
  content_hash: string | null;
  status: string;
  last_fetch_status: string | null;
  last_http_status: number | null;
  extracted_fields: string | null;
};

type ObservationRow = {
  id: string;
  extracted_fields: string | null;
  content_hash: string | null;
};

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY, entity_id TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL,
    source_type TEXT NOT NULL, publisher TEXT NOT NULL, official_status TEXT NOT NULL,
    retrieval_method TEXT NOT NULL, monitoring_cadence_seconds INTEGER NOT NULL,
    applicable_fields TEXT NOT NULL, locale TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1,
    last_checked_at TEXT, last_changed_at TEXT, last_successful_fetch_at TEXT,
    stale_after_seconds INTEGER NOT NULL, etag TEXT, last_modified TEXT, content_hash TEXT,
    status TEXT NOT NULL DEFAULT 'unknown'
  )`,
  `CREATE INDEX IF NOT EXISTS sources_entity_idx ON sources(entity_id)`,
  `CREATE INDEX IF NOT EXISTS sources_status_idx ON sources(status)`,
  `CREATE TABLE IF NOT EXISTS observations (
    id TEXT PRIMARY KEY, run_id TEXT NOT NULL, source_id TEXT NOT NULL, observed_at TEXT NOT NULL,
    fetch_status TEXT NOT NULL, http_status INTEGER, extracted_fields TEXT, content_hash TEXT,
    extraction_confidence TEXT NOT NULL, parser_version TEXT NOT NULL, receipt TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS observations_source_observed_idx ON observations(source_id, observed_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS observations_run_source_unique ON observations(run_id, source_id)`,
  `CREATE TABLE IF NOT EXISTS change_events (
    id TEXT PRIMARY KEY, source_id TEXT NOT NULL, entity_id TEXT NOT NULL, detected_at TEXT NOT NULL,
    changed_fields TEXT NOT NULL, previous_values TEXT NOT NULL, new_values TEXT NOT NULL,
    previous_hash TEXT NOT NULL, new_hash TEXT NOT NULL, materiality TEXT NOT NULL,
    review_status TEXT NOT NULL, observation_id TEXT NOT NULL, supersedes_event_id TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS change_events_entity_detected_idx ON change_events(entity_id, detected_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS change_events_transition_unique ON change_events(source_id, previous_hash, new_hash)`,
  `CREATE TABLE IF NOT EXISTS update_runs (
    id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL, trigger_type TEXT NOT NULL,
    started_at TEXT NOT NULL, finished_at TEXT, source_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0, unchanged_count INTEGER NOT NULL DEFAULT 0,
    changed_count INTEGER NOT NULL DEFAULT 0, failure_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS update_runs_idempotency_unique ON update_runs(idempotency_key)`,
  `CREATE INDEX IF NOT EXISTS update_runs_started_idx ON update_runs(started_at)`,
  `CREATE TABLE IF NOT EXISTS review_queue (
    id TEXT PRIMARY KEY, change_event_id TEXT NOT NULL, reason TEXT NOT NULL,
    required_action TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, reviewed_at TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS review_queue_event_unique ON review_queue(change_event_id)`,
  `CREATE INDEX IF NOT EXISTS review_queue_status_idx ON review_queue(status)`,
];

export async function handleObservationRequest(request: Request, db: D1Database | undefined) {
  if (!isAuthorized(request)) return json({ error: "owner_authentication_required" }, 401);
  if (!db) return json({ error: "d1_binding_unavailable" }, 503);

  try {
    await ensureSchemaAndRegistry(db);
    const { pathname } = new URL(request.url);
    if (request.method === "GET" && pathname === "/api/observations/snapshot") {
      return json(await observationSnapshot(db));
    }
    if (request.method === "POST" && pathname === "/api/observations/run") {
      const key = request.headers.get("idempotency-key")?.trim();
      if (!key || key.length > 128) return json({ error: "valid_idempotency_key_required" }, 400);
      return json(await runObservations(db, key), 200);
    }
    return json({ error: "not_found" }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "observation_runtime_error";
    return json({ error: message }, 500);
  }
}

async function ensureSchemaAndRegistry(db: D1Database) {
  await db.batch(SCHEMA.map((statement) => db.prepare(statement)));
  await db.batch(SOURCE_REGISTRY.map((source) => db.prepare(`
    INSERT INTO sources (
      id, entity_id, title, url, source_type, publisher, official_status, retrieval_method,
      monitoring_cadence_seconds, applicable_fields, locale, enabled, stale_after_seconds, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unknown')
    ON CONFLICT(id) DO UPDATE SET
      entity_id = excluded.entity_id, title = excluded.title, url = excluded.url,
      source_type = excluded.source_type, publisher = excluded.publisher,
      official_status = excluded.official_status, retrieval_method = excluded.retrieval_method,
      monitoring_cadence_seconds = excluded.monitoring_cadence_seconds,
      applicable_fields = excluded.applicable_fields, locale = excluded.locale,
      enabled = excluded.enabled, stale_after_seconds = excluded.stale_after_seconds
  `).bind(
    source.id, source.entityId, source.title, source.url, source.sourceType, source.publisher,
    source.officialStatus, source.retrievalMethod, source.monitoringCadenceSeconds,
    JSON.stringify(source.applicableFields), source.locale, source.enabled ? 1 : 0, source.staleAfterSeconds,
  )));
}

async function runObservations(db: D1Database, idempotencyKey: string) {
  const existing = await db.prepare("SELECT * FROM update_runs WHERE idempotency_key = ?").bind(idempotencyKey).first<Record<string, unknown>>();
  if (existing) return { run: mapRun(existing), reused: true };

  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  await db.prepare(`
    INSERT INTO update_runs (id, idempotency_key, trigger_type, started_at, source_count, status)
    VALUES (?, ?, 'manual_owner', ?, ?, 'running')
  `).bind(runId, idempotencyKey, startedAt, SOURCE_REGISTRY.filter((source) => source.enabled).length).run();

  const counts = { success: 0, unchanged: 0, changed: 0, failure: 0 };
  for (const source of SOURCE_REGISTRY.filter((item) => item.enabled)) {
    const result = await observeOne(db, runId, source);
    if (result === "failure") counts.failure += 1;
    else {
      counts.success += 1;
      if (result === "unchanged") counts.unchanged += 1;
      if (result === "changed") counts.changed += 1;
    }
  }

  const finishedAt = new Date().toISOString();
  const status = counts.failure ? (counts.success ? "partial" : "failed") : "completed";
  await db.prepare(`
    UPDATE update_runs SET finished_at = ?, success_count = ?, unchanged_count = ?,
      changed_count = ?, failure_count = ?, status = ? WHERE id = ?
  `).bind(finishedAt, counts.success, counts.unchanged, counts.changed, counts.failure, status, runId).run();
  return {
    run: {
      id: runId, triggerType: "manual_owner", startedAt, finishedAt,
      sourceCount: SOURCE_REGISTRY.filter((source) => source.enabled).length,
      successCount: counts.success, unchangedCount: counts.unchanged,
      changedCount: counts.changed, failureCount: counts.failure, status,
    },
    reused: false,
  };
}

async function observeOne(db: D1Database, runId: string, source: SourceDefinition) {
  const state = await db.prepare("SELECT * FROM sources WHERE id = ?").bind(source.id).first<SourceRow>();
  const previous = await db.prepare(`
    SELECT id, extracted_fields, content_hash FROM observations
    WHERE source_id = ? AND content_hash IS NOT NULL AND extracted_fields IS NOT NULL
      AND fetch_status IN ('success', 'not_modified')
    ORDER BY observed_at DESC LIMIT 1
  `).bind(source.id).first<ObservationRow>();
  const previousFields = parseRecord(previous?.extracted_fields);
  const observation = await fetchOfficialSource(source, {
    etag: state?.etag,
    lastModified: state?.last_modified,
    contentHash: state?.content_hash ?? previous?.content_hash,
    extractedFields: previousFields,
  });
  const observationId = `${runId}:${source.id}`;
  await saveObservation(db, observationId, runId, source.id, observation);
  const previousHash = state?.content_hash ?? previous?.content_hash;
  const outcome = evaluateOutcome(previousHash, observation);

  if (outcome === "failure") {
    await db.prepare(`
      UPDATE sources SET last_checked_at = ?, status = 'fetch_failed'
      WHERE id = ? AND (last_checked_at IS NULL OR last_checked_at <= ?)
    `).bind(observation.observedAt, source.id, observation.observedAt).run();
    return outcome;
  }

  const nextHash = observation.contentHash ?? previousHash ?? null;
  const nextFields = observation.extractedFields ?? previousFields;
  await db.prepare(`
    UPDATE sources SET last_checked_at = ?, last_successful_fetch_at = ?, status = 'healthy',
      etag = COALESCE(?, etag), last_modified = COALESCE(?, last_modified),
      content_hash = COALESCE(?, content_hash),
      last_changed_at = CASE WHEN ? = 'changed' THEN ? ELSE last_changed_at END
    WHERE id = ? AND (last_checked_at IS NULL OR last_checked_at <= ?)
  `).bind(
    observation.observedAt, observation.observedAt, observation.receipt.etag,
    observation.receipt.lastModified, nextHash, outcome, observation.observedAt,
    source.id, observation.observedAt,
  ).run();

  if (outcome === "changed" && previousHash && nextHash) {
    const descriptor = describeChange(
      source,
      source.sourceType === "official_terms_html" ? { ...previousFields, documentHash: previousHash } : previousFields,
      source.sourceType === "official_terms_html" ? { ...nextFields, documentHash: nextHash } : nextFields,
    );
    if (descriptor) await saveChange(db, source, observationId, observation.observedAt, previousHash, nextHash, descriptor);
  }
  return outcome;
}

async function saveObservation(db: D1Database, id: string, runId: string, sourceId: string, observation: FetchObservation) {
  await db.prepare(`
    INSERT OR IGNORE INTO observations (
      id, run_id, source_id, observed_at, fetch_status, http_status, extracted_fields,
      content_hash, extraction_confidence, parser_version, receipt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, runId, sourceId, observation.observedAt, observation.fetchStatus,
    observation.httpStatus, jsonValue(observation.extractedFields), observation.contentHash,
    observation.extractionConfidence, observation.parserVersion, JSON.stringify(observation.receipt),
  ).run();
}

async function saveChange(
  db: D1Database,
  source: SourceDefinition,
  observationId: string,
  detectedAt: string,
  previousHash: string,
  nextHash: string,
  descriptor: NonNullable<ReturnType<typeof describeChange>>,
) {
  const eventId = transitionKey(source.id, previousHash, nextHash);
  await db.prepare(`
    INSERT OR IGNORE INTO change_events (
      id, source_id, entity_id, detected_at, changed_fields, previous_values, new_values,
      previous_hash, new_hash, materiality, review_status, observation_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    eventId, source.id, source.entityId, detectedAt, JSON.stringify(descriptor.changedFields),
    JSON.stringify(descriptor.previousValues), JSON.stringify(descriptor.newValues),
    previousHash, nextHash, descriptor.materiality, descriptor.reviewStatus, observationId,
  ).run();
  if (descriptor.reviewStatus === "pending" && descriptor.reason && descriptor.requiredAction) {
    await db.prepare(`
      INSERT OR IGNORE INTO review_queue (
        id, change_event_id, reason, required_action, status, created_at
      ) VALUES (?, ?, ?, ?, 'pending', ?)
    `).bind(`review:${eventId}`, eventId, descriptor.reason, descriptor.requiredAction, detectedAt).run();
  }
}

async function observationSnapshot(db: D1Database) {
  const now = new Date();
  const sourceResult = await db.prepare(`
    SELECT s.*,
      (SELECT o.fetch_status FROM observations o WHERE o.source_id = s.id ORDER BY o.observed_at DESC LIMIT 1) AS last_fetch_status,
      (SELECT o.http_status FROM observations o WHERE o.source_id = s.id ORDER BY o.observed_at DESC LIMIT 1) AS last_http_status,
      (SELECT o.extracted_fields FROM observations o WHERE o.source_id = s.id AND o.extracted_fields IS NOT NULL ORDER BY o.observed_at DESC LIMIT 1) AS extracted_fields
    FROM sources s ORDER BY s.title
  `).all<SourceRow>();
  const sourceRows = sourceResult.results ?? [];
  const sources = sourceRows.map((row) => {
    const health = sourceHealth(row, now);
    return {
      id: row.id,
      entityId: row.entity_id,
      title: row.title,
      url: row.url,
      sourceType: row.source_type,
      publisher: row.publisher,
      status: health,
      fetchStatus: row.last_fetch_status,
      httpStatus: row.last_http_status,
      lastCheckedAt: row.last_checked_at,
      lastSuccessfulFetchAt: row.last_successful_fetch_at,
      lastChangedAt: row.last_changed_at,
      nextDueAt: nextDueAt(row.last_checked_at, row.monitoring_cadence_seconds),
      cadenceSeconds: row.monitoring_cadence_seconds,
      staleAfterSeconds: row.stale_after_seconds,
      observed: parseRecord(row.extracted_fields),
    };
  });

  const changesResult = await db.prepare(`
    SELECT c.*, s.title, s.url, s.publisher FROM change_events c
    JOIN sources s ON s.id = c.source_id ORDER BY c.detected_at DESC LIMIT 30
  `).all<Record<string, unknown>>();
  const runsResult = await db.prepare("SELECT * FROM update_runs ORDER BY started_at DESC LIMIT 8").all<Record<string, unknown>>();
  const reviewsResult = await db.prepare(`
    SELECT q.*, c.entity_id, c.source_id, s.title, s.url FROM review_queue q
    JOIN change_events c ON c.id = q.change_event_id JOIN sources s ON s.id = c.source_id
    WHERE q.status = 'pending' ORDER BY q.created_at DESC LIMIT 20
  `).all<Record<string, unknown>>();
  const changes = (changesResult.results ?? []).map(mapChange);
  const reviews = (reviewsResult.results ?? []).map(mapReview);
  const enabled = sources.filter((source) => source.status !== "disabled");
  const lastObservedAt = maxDate(enabled.map((source) => source.lastSuccessfulFetchAt));
  const lastChangedAt = maxDate(enabled.map((source) => source.lastChangedAt));

  return {
    generatedAt: now.toISOString(),
    automation: { mode: "manual_owner", scheduled: false, note: "Sitesの正式な定期実行は未接続。表示した監視頻度を目標にowner-only手動実行します。" },
    totals: {
      realSourceCount: enabled.length,
      sampleCount: 1,
      lastObservedAt,
      lastChangedAt,
      changedCount: changes.length,
      pendingReviewCount: reviews.length,
      failureCount: enabled.filter((source) => source.status === "fetch_failed").length,
      staleCount: enabled.filter((source) => source.status === "stale").length,
    },
    sources,
    changes,
    reviews,
    runs: (runsResult.results ?? []).map(mapRun),
  };
}

function mapRun(row: Record<string, unknown>) {
  return {
    id: row.id, triggerType: row.trigger_type, startedAt: row.started_at, finishedAt: row.finished_at,
    sourceCount: row.source_count, successCount: row.success_count, unchangedCount: row.unchanged_count,
    changedCount: row.changed_count, failureCount: row.failure_count, status: row.status,
  };
}

function mapChange(row: Record<string, unknown>) {
  return {
    id: row.id, sourceId: row.source_id, entityId: row.entity_id, sourceTitle: row.title,
    sourceUrl: row.url, detectedAt: row.detected_at, changedFields: parseArray(row.changed_fields),
    previousValues: parseRecord(row.previous_values), newValues: parseRecord(row.new_values),
    materiality: row.materiality, reviewStatus: row.review_status,
  };
}

function mapReview(row: Record<string, unknown>) {
  return {
    id: row.id, changeEventId: row.change_event_id, entityId: row.entity_id,
    sourceId: row.source_id, sourceTitle: row.title, sourceUrl: row.url,
    reason: row.reason, requiredAction: row.required_action, status: row.status, createdAt: row.created_at,
  };
}

function sourceHealth(row: SourceRow, now: Date) {
  if (!row.enabled) return "disabled";
  if (row.status === "fetch_failed") return "fetch_failed";
  if (!row.last_successful_fetch_at) return "unknown";
  if (isStale(row.last_successful_fetch_at, row.stale_after_seconds, now)) return "stale";
  return "healthy";
}

function isAuthorized(request: Request) {
  const hostname = new URL(request.url).hostname;
  return ["localhost", "127.0.0.1", "::1"].includes(hostname) || Boolean(request.headers.get("oai-authenticated-user-email"));
}

function parseRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string" || !value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

function parseArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

function maxDate(values: Array<string | null>) {
  const dates = values.filter((value): value is string => Boolean(value)).sort();
  return dates.at(-1) ?? null;
}

function jsonValue(value: unknown) { return value == null ? null : JSON.stringify(value); }
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: JSON_HEADERS }); }

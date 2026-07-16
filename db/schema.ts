import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  entityId: text("entity_id").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  sourceType: text("source_type").notNull(),
  publisher: text("publisher").notNull(),
  officialStatus: text("official_status").notNull(),
  retrievalMethod: text("retrieval_method").notNull(),
  monitoringCadenceSeconds: integer("monitoring_cadence_seconds").notNull(),
  applicableFields: text("applicable_fields", { mode: "json" }).notNull(),
  locale: text("locale").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  lastCheckedAt: text("last_checked_at"),
  lastChangedAt: text("last_changed_at"),
  lastSuccessfulFetchAt: text("last_successful_fetch_at"),
  staleAfterSeconds: integer("stale_after_seconds").notNull(),
  etag: text("etag"),
  lastModified: text("last_modified"),
  contentHash: text("content_hash"),
  status: text("status").notNull().default("unknown"),
}, (table) => [
  index("sources_entity_idx").on(table.entityId),
  index("sources_status_idx").on(table.status),
]);

export const observations = sqliteTable("observations", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  sourceId: text("source_id").notNull(),
  observedAt: text("observed_at").notNull(),
  fetchStatus: text("fetch_status").notNull(),
  httpStatus: integer("http_status"),
  extractedFields: text("extracted_fields", { mode: "json" }),
  contentHash: text("content_hash"),
  extractionConfidence: text("extraction_confidence").notNull(),
  parserVersion: text("parser_version").notNull(),
  receipt: text("receipt", { mode: "json" }).notNull(),
}, (table) => [
  index("observations_source_observed_idx").on(table.sourceId, table.observedAt),
  uniqueIndex("observations_run_source_unique").on(table.runId, table.sourceId),
]);

export const changeEvents = sqliteTable("change_events", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  entityId: text("entity_id").notNull(),
  detectedAt: text("detected_at").notNull(),
  changedFields: text("changed_fields", { mode: "json" }).notNull(),
  previousValues: text("previous_values", { mode: "json" }).notNull(),
  newValues: text("new_values", { mode: "json" }).notNull(),
  previousHash: text("previous_hash").notNull(),
  newHash: text("new_hash").notNull(),
  materiality: text("materiality").notNull(),
  reviewStatus: text("review_status").notNull(),
  observationId: text("observation_id").notNull(),
  supersedesEventId: text("supersedes_event_id"),
}, (table) => [
  index("change_events_entity_detected_idx").on(table.entityId, table.detectedAt),
  uniqueIndex("change_events_transition_unique").on(table.sourceId, table.previousHash, table.newHash),
]);

export const updateRuns = sqliteTable("update_runs", {
  id: text("id").primaryKey(),
  idempotencyKey: text("idempotency_key").notNull(),
  triggerType: text("trigger_type").notNull(),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  sourceCount: integer("source_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  unchangedCount: integer("unchanged_count").notNull().default(0),
  changedCount: integer("changed_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  status: text("status").notNull(),
}, (table) => [
  uniqueIndex("update_runs_idempotency_unique").on(table.idempotencyKey),
  index("update_runs_started_idx").on(table.startedAt),
]);

export const reviewQueue = sqliteTable("review_queue", {
  id: text("id").primaryKey(),
  changeEventId: text("change_event_id").notNull(),
  reason: text("reason").notNull(),
  requiredAction: text("required_action").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
  reviewedAt: text("reviewed_at"),
}, (table) => [
  uniqueIndex("review_queue_event_unique").on(table.changeEventId),
  index("review_queue_status_idx").on(table.status),
]);

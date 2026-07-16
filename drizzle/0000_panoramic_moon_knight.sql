CREATE TABLE `change_events` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`entity_id` text NOT NULL,
	`detected_at` text NOT NULL,
	`changed_fields` text NOT NULL,
	`previous_values` text NOT NULL,
	`new_values` text NOT NULL,
	`previous_hash` text NOT NULL,
	`new_hash` text NOT NULL,
	`materiality` text NOT NULL,
	`review_status` text NOT NULL,
	`observation_id` text NOT NULL,
	`supersedes_event_id` text
);
--> statement-breakpoint
CREATE INDEX `change_events_entity_detected_idx` ON `change_events` (`entity_id`,`detected_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `change_events_transition_unique` ON `change_events` (`source_id`,`previous_hash`,`new_hash`);--> statement-breakpoint
CREATE TABLE `observations` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`source_id` text NOT NULL,
	`observed_at` text NOT NULL,
	`fetch_status` text NOT NULL,
	`http_status` integer,
	`extracted_fields` text,
	`content_hash` text,
	`extraction_confidence` text NOT NULL,
	`parser_version` text NOT NULL,
	`receipt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `observations_source_observed_idx` ON `observations` (`source_id`,`observed_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `observations_run_source_unique` ON `observations` (`run_id`,`source_id`);--> statement-breakpoint
CREATE TABLE `review_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`change_event_id` text NOT NULL,
	`reason` text NOT NULL,
	`required_action` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_queue_event_unique` ON `review_queue` (`change_event_id`);--> statement-breakpoint
CREATE INDEX `review_queue_status_idx` ON `review_queue` (`status`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_id` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`source_type` text NOT NULL,
	`publisher` text NOT NULL,
	`official_status` text NOT NULL,
	`retrieval_method` text NOT NULL,
	`monitoring_cadence_seconds` integer NOT NULL,
	`applicable_fields` text NOT NULL,
	`locale` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`last_checked_at` text,
	`last_changed_at` text,
	`last_successful_fetch_at` text,
	`stale_after_seconds` integer NOT NULL,
	`etag` text,
	`last_modified` text,
	`content_hash` text,
	`status` text DEFAULT 'unknown' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sources_entity_idx` ON `sources` (`entity_id`);--> statement-breakpoint
CREATE INDEX `sources_status_idx` ON `sources` (`status`);--> statement-breakpoint
CREATE TABLE `update_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`idempotency_key` text NOT NULL,
	`trigger_type` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`source_count` integer DEFAULT 0 NOT NULL,
	`success_count` integer DEFAULT 0 NOT NULL,
	`unchanged_count` integer DEFAULT 0 NOT NULL,
	`changed_count` integer DEFAULT 0 NOT NULL,
	`failure_count` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `update_runs_idempotency_unique` ON `update_runs` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `update_runs_started_idx` ON `update_runs` (`started_at`);
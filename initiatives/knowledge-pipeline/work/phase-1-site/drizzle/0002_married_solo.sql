CREATE TABLE `proposal_review` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`work_packet_id` text NOT NULL,
	`proposal_id` text NOT NULL,
	`proposal_json` text NOT NULL,
	`preview_json` text NOT NULL,
	`state` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_proposal_review_collection_state` ON `proposal_review` (`collection_id`,`state`,`created_at`);--> statement-breakpoint
CREATE TABLE `review_record` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`source_id` text,
	`source_version_hash` text,
	`kind` text NOT NULL,
	`payload_json` text NOT NULL,
	`rationale` text NOT NULL,
	`proposed_by_json` text NOT NULL,
	`process_version` text NOT NULL,
	`accepted_by_actor_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_review_record_collection_kind` ON `review_record` (`collection_id`,`kind`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_review_record_source` ON `review_record` (`source_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `work_packet` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`selection_revision` integer NOT NULL,
	`collection_revision` integer NOT NULL,
	`package_hash` text NOT NULL,
	`package_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_work_packet_collection_created` ON `work_packet` (`collection_id`,`created_at`);
CREATE TABLE `dependency_proposal` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`source_id` text NOT NULL,
	`relation_type` text NOT NULL,
	`target_namespace` text NOT NULL,
	`target_key` text NOT NULL,
	`state` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_dependency_proposal_identity` ON `dependency_proposal` (`source_id`,`relation_type`,`target_namespace`,`target_key`);--> statement-breakpoint
CREATE INDEX `idx_dependency_proposal_collection_state` ON `dependency_proposal` (`collection_id`,`state`);--> statement-breakpoint
CREATE TABLE `external_alias` (
	`collection_id` text NOT NULL,
	`source_id` text NOT NULL,
	`namespace` text NOT NULL,
	`alias_key` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_external_alias_identity` ON `external_alias` (`collection_id`,`namespace`,`alias_key`);--> statement-breakpoint
CREATE INDEX `idx_external_alias_source` ON `external_alias` (`source_id`);--> statement-breakpoint
CREATE TABLE `source_record` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`canonical_key` text NOT NULL,
	`current_version_id` text,
	`state` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_source_collection_key` ON `source_record` (`collection_id`,`canonical_key`);--> statement-breakpoint
CREATE INDEX `idx_source_collection_state` ON `source_record` (`collection_id`,`state`);--> statement-breakpoint
CREATE TABLE `source_tag` (
	`source_id` text NOT NULL,
	`label` text NOT NULL,
	`tag_key` text NOT NULL,
	`status` text NOT NULL,
	`type` text NOT NULL,
	`stage` text NOT NULL,
	`created_at` text NOT NULL,
	`archived_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_source_tag_identity` ON `source_tag` (`source_id`,`tag_key`,`status`,`stage`);--> statement-breakpoint
CREATE INDEX `idx_source_tag_inventory` ON `source_tag` (`tag_key`,`status`,`stage`,`archived_at`);--> statement-breakpoint
CREATE TABLE `source_version` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`source_kind` text NOT NULL,
	`body_state` text NOT NULL,
	`rights_state` text NOT NULL,
	`capture_state` text NOT NULL,
	`source_updated_at` text,
	`content_json` text NOT NULL,
	`created_by_actor_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_source_version_hash` ON `source_version` (`source_id`,`content_hash`);--> statement-breakpoint
CREATE INDEX `idx_source_version_created` ON `source_version` (`source_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `import_preview` ADD `intake_kind` text;--> statement-breakpoint
ALTER TABLE `import_preview` ADD `operations_json` text;--> statement-breakpoint
ALTER TABLE `import_preview` ADD `findings_json` text;
--> statement-breakpoint
PRAGMA optimize;

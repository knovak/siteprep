CREATE TABLE `workflow_export` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`object_key` text NOT NULL,
	`content_hash` text NOT NULL,
	`byte_size` integer NOT NULL,
	`package_id` text NOT NULL,
	`caller` text NOT NULL,
	`receipt_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workflow_export_owner` ON `workflow_export` (`actor_id`,`collection_id`);--> statement-breakpoint
CREATE TABLE `workflow_restore_preview` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`object_key` text NOT NULL,
	`content_hash` text NOT NULL,
	`revision` integer NOT NULL,
	`selection_revision` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workflow_restore_owner` ON `workflow_restore_preview` (`actor_id`,`collection_id`);--> statement-breakpoint
CREATE TABLE `workflow_snapshot` (
	`collection_id` text NOT NULL,
	`revision` integer NOT NULL,
	`operation_id` text NOT NULL,
	`state_json` text NOT NULL,
	`content_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workflow_collection_revision` ON `workflow_snapshot` (`collection_id`,`revision`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workflow_collection_operation` ON `workflow_snapshot` (`collection_id`,`operation_id`);
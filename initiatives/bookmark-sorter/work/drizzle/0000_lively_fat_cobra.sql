CREATE TABLE `app_users` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`can_edit_templates` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "app_users_can_edit_templates_check" CHECK("app_users"."can_edit_templates" in (0, 1))
);
--> statement-breakpoint
CREATE TABLE `capture_queue` (
	`url_key` text PRIMARY KEY NOT NULL,
	`reason` text NOT NULL,
	`state` text NOT NULL,
	`queued_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	FOREIGN KEY (`url_key`) REFERENCES `captures`(`url_key`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "capture_queue_reason_check" CHECK("capture_queue"."reason" in ('missing-image', 'duplicate-image')),
	CONSTRAINT "capture_queue_state_check" CHECK("capture_queue"."state" in ('queued', 'running', 'complete', 'failed'))
);
--> statement-breakpoint
CREATE INDEX `idx_capture_queue_pending` ON `capture_queue` (`queued_at`,`url_key`) WHERE "capture_queue"."state" in ('queued', 'failed');--> statement-breakpoint
CREATE TABLE `captures` (
	`url_key` text PRIMARY KEY NOT NULL,
	`image_ref` text,
	`source` text NOT NULL,
	`captured_at` text,
	`image_hash` text,
	`state` text NOT NULL,
	`page_title` text,
	`description` text,
	`favicon_url` text,
	`error_tag` text,
	`image_candidate` text,
	`content_type` text,
	`width` integer,
	`height` integer,
	`byte_size` integer,
	CONSTRAINT "captures_source_check" CHECK("captures"."source" in ('og', 'screenshot', 'none'))
);
--> statement-breakpoint
CREATE INDEX `idx_captures_image_hash` ON `captures` (`image_hash`) WHERE "captures"."image_hash" is not null;--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_id` text,
	`kind` text NOT NULL,
	`template_id` text,
	`copied_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `app_users`(`owner_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`template_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "collections_kind_check" CHECK("collections"."kind" in ('personal', 'demo-template', 'demo-copy'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_collections_owner_personal` ON `collections` (`owner_id`) WHERE "collections"."kind" = 'personal';--> statement-breakpoint
CREATE INDEX `idx_collections_owner_kind_created` ON `collections` (`owner_id`,`kind`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_collections_template_id` ON `collections` (`template_id`) WHERE "collections"."template_id" is not null;--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`url` text NOT NULL,
	`url_key` text NOT NULL,
	`title` text NOT NULL,
	`title_key` text DEFAULT '' NOT NULL,
	`note` text,
	`added_at` text,
	`ingested_at` text NOT NULL,
	`verdict` text,
	`verdict_at` text,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `items_collection_url_key_unique` ON `items` (`collection_id`,`url_key`);--> statement-breakpoint
CREATE INDEX `items_collection_added_idx` ON `items` (`collection_id`,`added_at`);--> statement-breakpoint
CREATE INDEX `idx_items_collection_untriaged` ON `items` (`collection_id`) WHERE "items"."verdict" is null;--> statement-breakpoint
CREATE INDEX `idx_items_collection_title_key` ON `items` (`collection_id`,`title_key`);--> statement-breakpoint
CREATE TABLE `selections` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`collection_id` text,
	`expression` text NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`item_id` text NOT NULL,
	`tag` text NOT NULL,
	PRIMARY KEY(`item_id`, `tag`),
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tags_tag_idx` ON `tags` (`tag`,`item_id`);--> statement-breakpoint
CREATE TABLE `triage_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`session_id` text NOT NULL,
	`action_kind` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` text NOT NULL,
	`undone_at` text,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `triage_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "triage_actions_kind_check" CHECK("triage_actions"."action_kind" in ('verdict', 'tag-apply'))
);
--> statement-breakpoint
CREATE INDEX `idx_triage_actions_session_active` ON `triage_actions` (`session_id`,`created_at`) WHERE "triage_actions"."undone_at" is null;--> statement-breakpoint
CREATE TABLE `triage_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text,
	`items_judged` integer DEFAULT 0 NOT NULL,
	`elapsed_ms` integer,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA optimize;

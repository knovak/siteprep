CREATE TABLE `activity` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text,
	`actor_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`details_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_activity_collection_created` ON `activity` (`collection_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `actor` (
	`id` text PRIMARY KEY NOT NULL,
	`authorized_user_id` text NOT NULL,
	`normalized_email` text NOT NULL,
	`site_user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_actor_authorized_user` ON `actor` (`authorized_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_actor_site_user` ON `actor` (`site_user_id`);--> statement-breakpoint
CREATE TABLE `actor_state` (
	`actor_id` text PRIMARY KEY NOT NULL,
	`selected_collection_id` text,
	`selection_revision` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `asset` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`content_hash` text NOT NULL,
	`byte_size` integer NOT NULL,
	`media_type` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `authorized_user` (
	`id` text PRIMARY KEY NOT NULL,
	`normalized_email` text NOT NULL,
	`site_user_id` text,
	`role` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by_actor_id` text NOT NULL,
	`disabled_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_authorized_user_email` ON `authorized_user` (`normalized_email`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_authorized_user_site_id` ON `authorized_user` (`site_user_id`);--> statement-breakpoint
CREATE TABLE `backup` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`object_key` text NOT NULL,
	`package_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`byte_size` integer NOT NULL,
	`state` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_backup_collection_created` ON `backup` (`collection_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `collection` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_actor_id` text NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`state` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`tombstoned_at` text,
	`erased_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_collection_owner_name` ON `collection` (`owner_actor_id`,`normalized_name`);--> statement-breakpoint
CREATE INDEX `idx_collection_owner_state` ON `collection` (`owner_actor_id`,`state`);--> statement-breakpoint
CREATE TABLE `collection_asset_ref` (
	`collection_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_collection_asset_ref` ON `collection_asset_ref` (`collection_id`,`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_collection_ref` ON `collection_asset_ref` (`asset_id`);--> statement-breakpoint
CREATE TABLE `import_preview` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`collection_id` text NOT NULL,
	`selection_revision` integer NOT NULL,
	`collection_revision` integer NOT NULL,
	`package_hash` text NOT NULL,
	`state` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_import_preview_actor_state` ON `import_preview` (`actor_id`,`state`);--> statement-breakpoint
CREATE TABLE `receipt` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`activity_id` text NOT NULL,
	`operation_id` text NOT NULL,
	`package_hash` text NOT NULL,
	`mode` text NOT NULL,
	`created_at` text NOT NULL,
	`result_json` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_receipt_collection_operation` ON `receipt` (`collection_id`,`operation_id`);
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_collections` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_id` text,
	`kind` text NOT NULL,
	`template_id` text,
	`copied_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `app_users`(`owner_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`template_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "collections_kind_check" CHECK("__new_collections"."kind" in ('personal', 'private', 'demo-template', 'demo-copy'))
);
--> statement-breakpoint
INSERT INTO `__new_collections`("id", "name", "owner_id", "kind", "template_id", "copied_at", "created_at") SELECT "id", "name", "owner_id", "kind", "template_id", "copied_at", "created_at" FROM `collections`;--> statement-breakpoint
DROP TABLE `collections`;--> statement-breakpoint
ALTER TABLE `__new_collections` RENAME TO `collections`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_collections_owner_personal` ON `collections` (`owner_id`) WHERE "collections"."kind" = 'personal';--> statement-breakpoint
CREATE INDEX `idx_collections_owner_kind_created` ON `collections` (`owner_id`,`kind`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_collections_template_id` ON `collections` (`template_id`) WHERE "collections"."template_id" is not null;
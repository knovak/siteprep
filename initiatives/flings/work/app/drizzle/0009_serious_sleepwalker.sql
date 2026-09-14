CREATE TABLE `recovery_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`fling` text NOT NULL,
	`importer` text NOT NULL,
	`imported_at` integer NOT NULL,
	FOREIGN KEY (`fling`) REFERENCES `flings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`importer`) REFERENCES `organizers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recovery_imports_fling_unique` ON `recovery_imports` (`fling`);--> statement-breakpoint
PRAGMA defer_foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_message_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`batch` text NOT NULL,
	`fling` text NOT NULL,
	`member` text NOT NULL,
	`code` text,
	`channel` text NOT NULL,
	FOREIGN KEY (`batch`,`fling`) REFERENCES `message_batches`(`id`,`fling`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`code`,`member`,`fling`) REFERENCES `codes`(`id`,`member`,`fling`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member`,`fling`) REFERENCES `members`(`id`,`fling`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "delivery_channel" CHECK("__new_message_deliveries"."channel" IN ('email','text'))
);
--> statement-breakpoint
INSERT INTO `__new_message_deliveries`("id", "batch", "fling", "member", "code", "channel") SELECT "id", "batch", "fling", "member", "code", "channel" FROM `message_deliveries`;--> statement-breakpoint
DROP TABLE `message_deliveries`;--> statement-breakpoint
ALTER TABLE `__new_message_deliveries` RENAME TO `message_deliveries`;--> statement-breakpoint
CREATE INDEX `message_deliveries_code` ON `message_deliveries` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `message_deliveries_batch_member_channel_unique` ON `message_deliveries` (`batch`,`member`,`channel`);--> statement-breakpoint
CREATE UNIQUE INDEX `message_deliveries_id_batch_fling_unique` ON `message_deliveries` (`id`,`batch`,`fling`);--> statement-breakpoint
ALTER TABLE `message_batches` ADD `imported_at` integer;
--> statement-breakpoint
PRAGMA defer_foreign_keys=OFF;

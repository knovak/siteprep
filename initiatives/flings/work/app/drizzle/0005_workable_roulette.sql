CREATE TABLE `message_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`fling` text NOT NULL,
	`owner` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`selection` text NOT NULL,
	`context` text NOT NULL,
	`audience_hash` text NOT NULL,
	`manifest` text NOT NULL,
	`payload_hash` text NOT NULL,
	`ciphertext` text,
	`send_until` integer NOT NULL,
	`created` integer NOT NULL,
	`approved` integer,
	`exported` integer,
	FOREIGN KEY (`fling`) REFERENCES `flings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner`) REFERENCES `organizers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "message_revision" CHECK("message_batches"."revision"=1)
);
--> statement-breakpoint
CREATE INDEX `message_batches_fling` ON `message_batches` (`fling`);--> statement-breakpoint
CREATE UNIQUE INDEX `message_batches_id_fling_unique` ON `message_batches` (`id`,`fling`);--> statement-breakpoint
CREATE TABLE `message_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`batch` text NOT NULL,
	`fling` text NOT NULL,
	`member` text NOT NULL,
	`code` text NOT NULL,
	`channel` text NOT NULL,
	FOREIGN KEY (`batch`,`fling`) REFERENCES `message_batches`(`id`,`fling`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`code`,`member`,`fling`) REFERENCES `codes`(`id`,`member`,`fling`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "delivery_channel" CHECK("message_deliveries"."channel" IN ('email','text'))
);
--> statement-breakpoint
CREATE INDEX `message_deliveries_code` ON `message_deliveries` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `message_deliveries_batch_member_channel_unique` ON `message_deliveries` (`batch`,`member`,`channel`);
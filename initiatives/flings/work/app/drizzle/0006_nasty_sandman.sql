CREATE TABLE `message_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`batch` text NOT NULL,
	`fling` text NOT NULL,
	`sequence` integer NOT NULL,
	`fingerprint` text NOT NULL,
	`reporter` text NOT NULL,
	`reported_at` integer NOT NULL,
	FOREIGN KEY (`reporter`) REFERENCES `organizers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch`,`fling`) REFERENCES `message_batches`(`id`,`fling`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "report_sequence" CHECK("message_reports"."sequence">0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_reports_id_batch_fling_unique` ON `message_reports` (`id`,`batch`,`fling`);--> statement-breakpoint
CREATE UNIQUE INDEX `message_reports_batch_sequence_unique` ON `message_reports` (`batch`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `message_reports_batch_fingerprint_unique` ON `message_reports` (`batch`,`fingerprint`);--> statement-breakpoint
CREATE TABLE `message_results` (
	`report` text NOT NULL,
	`delivery` text NOT NULL,
	`batch` text NOT NULL,
	`fling` text NOT NULL,
	`status` text NOT NULL,
	`evidence` text NOT NULL,
	PRIMARY KEY(`report`, `delivery`),
	FOREIGN KEY (`report`,`batch`,`fling`) REFERENCES `message_reports`(`id`,`batch`,`fling`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`delivery`,`batch`,`fling`) REFERENCES `message_deliveries`(`id`,`batch`,`fling`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "reported_status" CHECK("message_results"."status" IN ('reported_sent','reported_failed','suppressed','unknown'))
);
--> statement-breakpoint
ALTER TABLE `message_batches` ADD `results_revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `message_deliveries_id_batch_fling_unique` ON `message_deliveries` (`id`,`batch`,`fling`);
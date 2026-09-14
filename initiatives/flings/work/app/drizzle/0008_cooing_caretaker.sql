CREATE TABLE `message_retries` (
	`batch` text NOT NULL,
	`fling` text NOT NULL,
	`attempt` integer NOT NULL,
	`owner` text NOT NULL,
	`exported` integer NOT NULL,
	`payload_hash` text NOT NULL,
	`results_revision` integer NOT NULL,
	PRIMARY KEY(`batch`, `attempt`),
	FOREIGN KEY (`owner`) REFERENCES `organizers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch`,`fling`) REFERENCES `message_batches`(`id`,`fling`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "retry_attempt" CHECK("message_retries"."attempt">1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_retries_batch_attempt_fling_unique` ON `message_retries` (`batch`,`attempt`,`fling`);--> statement-breakpoint
CREATE TABLE `message_retry_deliveries` (
	`batch` text NOT NULL,
	`fling` text NOT NULL,
	`attempt` integer NOT NULL,
	`delivery` text NOT NULL,
	`evidence` text NOT NULL,
	PRIMARY KEY(`batch`, `attempt`, `delivery`),
	FOREIGN KEY (`batch`,`attempt`,`fling`) REFERENCES `message_retries`(`batch`,`attempt`,`fling`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`delivery`,`batch`,`fling`) REFERENCES `message_deliveries`(`id`,`batch`,`fling`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `message_results` ADD `attempt` integer DEFAULT 1 NOT NULL;
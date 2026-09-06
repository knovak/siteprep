CREATE TABLE `review_state` (
	`store_id` text PRIMARY KEY NOT NULL,
	`judgments` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);

CREATE TABLE `payment_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`request` text NOT NULL,
	`kind` text NOT NULL,
	`amount` integer NOT NULL,
	`report` text,
	`note` text NOT NULL,
	`actor` text NOT NULL,
	`author` text NOT NULL,
	`at` integer NOT NULL,
	FOREIGN KEY (`request`) REFERENCES `payment_requests`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ledger_kind" CHECK("payment_ledger"."kind" IN ('report','confirm','correction','waiver','refund')),
	CONSTRAINT "ledger_amount" CHECK("payment_ledger"."amount"!=0 AND ABS("payment_ledger"."amount")<=1000000000)
);
--> statement-breakpoint
CREATE TABLE `payment_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`fling` text NOT NULL,
	`event` text NOT NULL,
	`member` text NOT NULL,
	`title` text NOT NULL,
	`currency` text NOT NULL,
	`amount` integer NOT NULL,
	`link` text NOT NULL,
	`actor` text NOT NULL,
	`at` integer NOT NULL,
	FOREIGN KEY (`member`,`fling`) REFERENCES `members`(`id`,`fling`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event`,`fling`) REFERENCES `events`(`id`,`fling`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "request_amount" CHECK("payment_requests"."amount">0 AND "payment_requests"."amount"<=1000000000)
);
--> statement-breakpoint
CREATE TABLE `poll_audience` (
	`poll` text NOT NULL,
	`fling` text NOT NULL,
	`member` text NOT NULL,
	PRIMARY KEY(`poll`, `member`),
	FOREIGN KEY (`poll`,`fling`) REFERENCES `polls`(`id`,`fling`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member`,`fling`) REFERENCES `members`(`id`,`fling`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `polls` (
	`id` text PRIMARY KEY NOT NULL,
	`fling` text NOT NULL,
	`activity` text NOT NULL,
	`event` text NOT NULL,
	`title` text NOT NULL,
	`options` text NOT NULL,
	`multiple` integer NOT NULL,
	`deadline` integer,
	`closed` integer DEFAULT 0 NOT NULL,
	`replaces` text,
	`created` integer NOT NULL,
	FOREIGN KEY (`fling`) REFERENCES `flings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`activity`,`fling`) REFERENCES `activities`(`id`,`fling`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event`,`activity`,`fling`) REFERENCES `events`(`id`,`activity`,`fling`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "poll_multiple" CHECK("polls"."multiple" IN (0,1)),
	CONSTRAINT "poll_closed" CHECK("polls"."closed" IN (0,1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `polls_id_fling_unique` ON `polls` (`id`,`fling`);--> statement-breakpoint
CREATE TABLE `post_history` (
	`id` text PRIMARY KEY NOT NULL,
	`post` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`body` text NOT NULL,
	`reason` text NOT NULL,
	`at` integer NOT NULL,
	FOREIGN KEY (`post`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`fling` text NOT NULL,
	`activity` text,
	`event` text,
	`actor` text NOT NULL,
	`actor_kind` text NOT NULL,
	`author` text NOT NULL,
	`body` text NOT NULL,
	`created` integer NOT NULL,
	`edited` integer,
	`hidden` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`fling`) REFERENCES `flings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`activity`,`fling`) REFERENCES `activities`(`id`,`fling`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event`,`activity`,`fling`) REFERENCES `events`(`id`,`activity`,`fling`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "post_event_parent" CHECK("posts"."event" IS NULL OR "posts"."activity" IS NOT NULL),
	CONSTRAINT "post_actor_kind" CHECK("posts"."actor_kind" IN ('organizer','member')),
	CONSTRAINT "post_hidden" CHECK("posts"."hidden" IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`id` text PRIMARY KEY NOT NULL,
	`poll` text NOT NULL,
	`fling` text NOT NULL,
	`member` text NOT NULL,
	`choices` text NOT NULL,
	`generation` integer NOT NULL,
	`revision` integer NOT NULL,
	`at` integer NOT NULL,
	FOREIGN KEY (`poll`,`fling`) REFERENCES `polls`(`id`,`fling`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member`,`fling`) REFERENCES `members`(`id`,`fling`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `votes_poll_member_revision_unique` ON `votes` (`poll`,`member`,`revision`);--> statement-breakpoint
ALTER TABLE `invitations` ADD `generation` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `events_id_activity_fling_unique` ON `events` (`id`,`activity`,`fling`);--> statement-breakpoint
CREATE UNIQUE INDEX `events_id_fling_unique` ON `events` (`id`,`fling`);
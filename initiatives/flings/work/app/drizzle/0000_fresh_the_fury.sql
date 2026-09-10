CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`fling` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`details` text NOT NULL,
	`state` text DEFAULT 'published' NOT NULL,
	FOREIGN KEY (`fling`) REFERENCES `flings`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "activity_state" CHECK("activities"."state" in ('draft','published','cancelled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activities_id_fling_unique` ON `activities` (`id`,`fling`);--> statement-breakpoint
CREATE TABLE `assignments` (
	`fling` text NOT NULL,
	`organizer` text NOT NULL,
	PRIMARY KEY(`fling`, `organizer`),
	FOREIGN KEY (`fling`) REFERENCES `flings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organizer`) REFERENCES `organizers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`bucket` integer NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`fling` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`object` text NOT NULL,
	`at` integer NOT NULL,
	FOREIGN KEY (`fling`) REFERENCES `flings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `codes` (
	`id` text PRIMARY KEY NOT NULL,
	`member` text NOT NULL,
	`fling` text NOT NULL,
	`digest` text NOT NULL,
	`ciphertext` text,
	`generation` integer NOT NULL,
	`issued` integer NOT NULL,
	`first_used` integer,
	`send_until` integer NOT NULL,
	`expires` integer NOT NULL,
	`revoked` integer,
	FOREIGN KEY (`member`,`fling`) REFERENCES `members`(`id`,`fling`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `codes_digest_unique` ON `codes` (`digest`);--> statement-breakpoint
CREATE INDEX `codes_member_issue` ON `codes` (`member`,`issued`);--> statement-breakpoint
CREATE UNIQUE INDEX `codes_id_member_fling_unique` ON `codes` (`id`,`member`,`fling`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`fling` text NOT NULL,
	`activity` text NOT NULL,
	`title` text NOT NULL,
	`starts` text NOT NULL,
	`zone` text NOT NULL,
	`summary` text NOT NULL,
	`details` text NOT NULL,
	FOREIGN KEY (`activity`,`fling`) REFERENCES `activities`(`id`,`fling`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `events_activity` ON `events` (`activity`);--> statement-breakpoint
CREATE TABLE `flings` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`state` text DEFAULT 'open' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "fling_state" CHECK("flings"."state" in ('open','closed'))
);
--> statement-breakpoint
CREATE TABLE `guards` (
	`id` text PRIMARY KEY NOT NULL,
	`ok` integer NOT NULL,
	CONSTRAINT "required_precondition" CHECK("guards"."ok"=1)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`member` text NOT NULL,
	`activity` text NOT NULL,
	`fling` text NOT NULL,
	`state` text NOT NULL,
	PRIMARY KEY(`member`, `activity`),
	FOREIGN KEY (`member`,`fling`) REFERENCES `members`(`id`,`fling`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`activity`,`fling`) REFERENCES `activities`(`id`,`fling`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "invitation_state" CHECK("invitations"."state" in ('invited','accepted','declined','withdrawn'))
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`fling` text NOT NULL,
	`name` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`preference` text DEFAULT 'email' NOT NULL,
	`state` text DEFAULT 'active' NOT NULL,
	`generation` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`fling`) REFERENCES `flings`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "member_state" CHECK("members"."state" in ('active','removed')),
	CONSTRAINT "preference" CHECK("members"."preference" in ('email','text','both'))
);
--> statement-breakpoint
CREATE INDEX `members_fling` ON `members` (`fling`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_id_fling_unique` ON `members` (`id`,`fling`);--> statement-breakpoint
CREATE TABLE `organizers` (
	`id` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizers_subject_unique` ON `organizers` (`subject`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`digest` text PRIMARY KEY NOT NULL,
	`member` text NOT NULL,
	`fling` text NOT NULL,
	`code` text NOT NULL,
	`generation` integer NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`code`,`member`,`fling`) REFERENCES `codes`(`id`,`member`,`fling`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_code` ON `sessions` (`code`);
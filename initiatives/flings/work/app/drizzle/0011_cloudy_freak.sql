ALTER TABLE `activities` ADD `capacity` integer;--> statement-breakpoint
ALTER TABLE `activities` ADD `cascading` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `timeout_minutes` integer;--> statement-breakpoint
ALTER TABLE `activities` ADD `allow_late` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `invitation_order` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `invitations` ADD `invited_at` integer;--> statement-breakpoint
ALTER TABLE `invitations` ADD `timed_out` integer DEFAULT 0 NOT NULL;
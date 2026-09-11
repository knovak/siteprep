ALTER TABLE `events` ADD `ends` text;--> statement-breakpoint
ALTER TABLE `events` ADD `invitation_location` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `location_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `location_address` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `location_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `changed_at` integer;--> statement-breakpoint
ALTER TABLE `flings` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `flings` ADD `default_zone` text DEFAULT 'America/Los_Angeles' NOT NULL;
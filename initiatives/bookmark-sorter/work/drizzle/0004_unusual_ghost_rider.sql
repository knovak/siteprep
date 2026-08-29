PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_triage_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`session_id` text NOT NULL,
	`action_kind` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` text NOT NULL,
	`undone_at` text,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `triage_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "triage_actions_kind_check" CHECK("__new_triage_actions"."action_kind" in ('verdict', 'tag-apply', 'tag-remove'))
);
--> statement-breakpoint
INSERT INTO `__new_triage_actions`("id", "collection_id", "session_id", "action_kind", "payload_json", "created_at", "undone_at") SELECT "id", "collection_id", "session_id", "action_kind", "payload_json", "created_at", "undone_at" FROM `triage_actions`;--> statement-breakpoint
DROP TABLE `triage_actions`;--> statement-breakpoint
ALTER TABLE `__new_triage_actions` RENAME TO `triage_actions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_triage_actions_session_active` ON `triage_actions` (`session_id`,`created_at`) WHERE "triage_actions"."undone_at" is null;
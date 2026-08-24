CREATE TABLE `authorized_user` (
	`email` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	CONSTRAINT "authorized_user_type_check" CHECK("authorized_user"."type" in ('admin', 'user'))
);
--> statement-breakpoint
INSERT INTO `authorized_user` (`email`, `type`) VALUES
	('krnovak@gmail.com', 'admin'),
	('julie.duffield@gmail.com', 'user');
--> statement-breakpoint
CREATE TABLE `selection_history` (
	`owner_id` text NOT NULL,
	`expression` text NOT NULL,
	`used_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `expression`),
	FOREIGN KEY (`owner_id`) REFERENCES `app_users`(`owner_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_selection_history_owner_used` ON `selection_history` (`owner_id`,`used_at`);

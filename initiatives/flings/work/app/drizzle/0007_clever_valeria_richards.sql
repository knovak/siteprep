CREATE TABLE `message_discussions` (
	`batch` text PRIMARY KEY NOT NULL,
	`fling` text NOT NULL,
	`post` text NOT NULL,
	FOREIGN KEY (`batch`,`fling`) REFERENCES `message_batches`(`id`,`fling`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`post`,`fling`) REFERENCES `posts`(`id`,`fling`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_discussions_post_unique` ON `message_discussions` (`post`);--> statement-breakpoint
ALTER TABLE `message_batches` ADD `discussion` text;--> statement-breakpoint
CREATE UNIQUE INDEX `posts_id_fling_unique` ON `posts` (`id`,`fling`);
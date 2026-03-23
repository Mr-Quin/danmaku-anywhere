CREATE TABLE `user_backups` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`file_key` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_backups_userId_idx` ON `user_backups` (`user_id`);
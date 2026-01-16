CREATE TABLE `site_integration_policy_domains` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`config_id` text NOT NULL,
	`domain` text NOT NULL,
	FOREIGN KEY (`config_id`) REFERENCES `site_integration_policy`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `domain_idx` ON `site_integration_policy_domains` (`domain`);--> statement-breakpoint
CREATE TABLE `site_integration_policy` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`data` text NOT NULL,
	`author_id` text,
	`author_name` text,
	`domains` text DEFAULT '[]',
	`tags` text DEFAULT '[]',
	`is_public` integer DEFAULT false,
	`downloads` integer DEFAULT 0,
	`upvotes` integer DEFAULT 0,
	`downvotes` integer DEFAULT 0,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);

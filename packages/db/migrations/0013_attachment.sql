-- Files attached to a post or comment. Objects live in the feedback R2 bucket;
-- the key is generated server-side and never contains the uploaded filename.
CREATE TABLE `attachment` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text DEFAULT 'default' NOT NULL,
	`post_id` integer,
	`comment_id` integer,
	`uploader_id` text,
	`r2_key` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`state` text DEFAULT 'ready' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comment`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploader_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attachment_r2_key_unique` ON `attachment` (`r2_key`);--> statement-breakpoint
CREATE INDEX `attachment_post_idx` ON `attachment` (`post_id`);--> statement-breakpoint
CREATE INDEX `attachment_comment_idx` ON `attachment` (`comment_id`);--> statement-breakpoint
CREATE INDEX `attachment_workspace_idx` ON `attachment` (`workspace_id`);

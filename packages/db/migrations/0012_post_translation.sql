-- Post translations: the post row stays the workspace baseline and one row
-- here per locale overrides the title and body for readers of that language.
CREATE TABLE `post_translation` (
	`post_id` integer NOT NULL,
	`locale` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`post_id`, `locale`),
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade
);

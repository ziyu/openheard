-- Multilingual content: the entity's own columns stay the workspace default
-- language, and *_translation holds one row per additional locale.
ALTER TABLE `workspace` ADD `default_locale` text DEFAULT 'en' NOT NULL;--> statement-breakpoint
CREATE TABLE `board_translation` (
	`board_id` text NOT NULL,
	`locale` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	PRIMARY KEY(`board_id`, `locale`),
	FOREIGN KEY (`board_id`) REFERENCES `board`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tag_translation` (
	`tag_id` text NOT NULL,
	`locale` text NOT NULL,
	`name` text NOT NULL,
	PRIMARY KEY(`tag_id`, `locale`),
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `status_translation` (
	`workspace_id` text NOT NULL,
	`key` text NOT NULL,
	`locale` text NOT NULL,
	`label` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `key`, `locale`),
	FOREIGN KEY (`workspace_id`,`key`) REFERENCES `status`(`workspace_id`,`key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `changelog_translation` (
	`entry_id` integer NOT NULL,
	`locale` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`entry_id`, `locale`),
	FOREIGN KEY (`entry_id`) REFERENCES `changelog_entry`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
-- Backfill the built-in Chinese status labels that used to be hardcoded in the
-- UI, so existing workspaces keep showing 待处理/审核中/已规划/进行中/已发布/已关闭
-- and admins can edit them from the settings page.
INSERT OR IGNORE INTO `status_translation` (`workspace_id`, `key`, `locale`, `label`)
SELECT `workspace_id`, `key`, 'zh-CN',
  CASE `key`
    WHEN 'open' THEN '待处理'
    WHEN 'review' THEN '审核中'
    WHEN 'planned' THEN '已规划'
    WHEN 'progress' THEN '进行中'
    WHEN 'done' THEN '已发布'
    WHEN 'closed' THEN '已关闭'
    ELSE `label`
  END
FROM `status`;

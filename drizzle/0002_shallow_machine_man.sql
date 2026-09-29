CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`lot_id` text NOT NULL,
	`concept` text NOT NULL,
	`agreed` integer,
	`opening` integer DEFAULT 0 NOT NULL,
	`opening_date` text DEFAULT '' NOT NULL,
	`evidence` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_lot_concept` ON `accounts` (`lot_id`,`concept`);--> statement-breakpoint
CREATE TABLE `changes` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`entity` text NOT NULL,
	`before` text NOT NULL,
	`after` text NOT NULL,
	`reason` text NOT NULL,
	`author` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_changes_person` ON `changes` (`person_id`);--> statement-breakpoint
CREATE TABLE `installments` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`due` text NOT NULL,
	`cents` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_installments_account` ON `installments` (`account_id`);--> statement-breakpoint
CREATE TABLE `lots` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`name` text NOT NULL,
	`project` text NOT NULL,
	`contract` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lot_person_project_name` ON `lots` (`person_id`,`project`,`name`);--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`document` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `person_sources` (
	`record_id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`reason` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_person_sources_person` ON `person_sources` (`person_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`kind` text NOT NULL,
	`description` text NOT NULL,
	`due` text NOT NULL,
	`amount` integer,
	`done` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`author` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_person` ON `tasks` (`person_id`);--> statement-breakpoint
ALTER TABLE `payments` ADD `account_id` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `installment_id` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `void_reason` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `void_author` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `void_date` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `operation` text;--> statement-breakpoint
CREATE UNIQUE INDEX `payment_operation` ON `payments` (`operation`);--> statement-breakpoint
CREATE INDEX `idx_payments_account` ON `payments` (`account_id`);
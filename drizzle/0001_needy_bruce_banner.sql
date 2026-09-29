CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`concept` text NOT NULL,
	`lot` text NOT NULL,
	`cents` integer NOT NULL,
	`date` text NOT NULL,
	`reference` text NOT NULL,
	`author` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_receipt` ON `payments` (`record_id`,`concept`,`reference`);
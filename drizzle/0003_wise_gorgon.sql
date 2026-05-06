CREATE TABLE `consent_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`patient_name` text,
	`signed_by_name` text NOT NULL,
	`relationship_to_patient` text,
	`signature_data` text NOT NULL,
	`consent_version` text NOT NULL,
	`is_self_consent` integer NOT NULL,
	`signed_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `users` ADD `consent_given` integer DEFAULT false;
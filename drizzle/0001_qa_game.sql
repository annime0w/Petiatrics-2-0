ALTER TABLE `users` ADD `age_group` text;
--> statement-breakpoint
ALTER TABLE `users` ADD `consent_given` integer DEFAULT false;
--> statement-breakpoint
CREATE TABLE `question_bank` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question_text` text NOT NULL,
	`question_type` text NOT NULL,
	`options_json` text,
	`correct_answer` text NOT NULL,
	`medication_id` integer,
	`age_group` text NOT NULL,
	`category` text NOT NULL,
	`is_active` integer DEFAULT true,
	`sort_order` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`medication_id`) REFERENCES `medications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `consent_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`signed_by_name` text NOT NULL,
	`relationship_to_patient` text,
	`signature_data` text NOT NULL,
	`consent_version` text DEFAULT '1.0',
	`is_self_consent` integer DEFAULT false,
	`signed_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `game_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`age_group` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`total_questions` integer DEFAULT 0,
	`correct_count` integer DEFAULT 0,
	`nurse_notes` text,
	`nurse_engagement_rating` text,
	`caregiver_present` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `question_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`question_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`selected_answer` text,
	`is_correct` integer NOT NULL,
	`attempted_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `game_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `question_bank`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `question_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`question_id` integer NOT NULL,
	`correct_streak` integer DEFAULT 0,
	`total_attempts` integer DEFAULT 0,
	`graduated` integer DEFAULT false,
	`last_seen_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `question_bank`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `session_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`report_text` text NOT NULL,
	`generated_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `game_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_question_idx` ON `question_progress` (`user_id`,`question_id`);

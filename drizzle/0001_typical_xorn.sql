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

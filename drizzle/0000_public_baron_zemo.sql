CREATE TABLE `cat_colors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`color` text NOT NULL,
	`sprite_url` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cat_hats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sprite_url` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dosage_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`form` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `medication_side_effects` (
	`medication_id` integer NOT NULL,
	`side_effect_id` integer NOT NULL,
	PRIMARY KEY(`medication_id`, `side_effect_id`),
	FOREIGN KEY (`medication_id`) REFERENCES `medications`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`side_effect_id`) REFERENCES `side_effects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `medications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`generic` text NOT NULL,
	`brand` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `side_effects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`description` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_medications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`medication_id` integer NOT NULL,
	`dosage_form_id` integer,
	`active` integer DEFAULT true,
	`morning` text,
	`afternoon` text,
	`evening` text,
	`bedtime` text,
	`dosage_amount` text,
	`notes` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`medication_id`) REFERENCES `medications`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dosage_form_id`) REFERENCES `dosage_options`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`coins` integer DEFAULT 0,
	`active_cat_color_id` integer,
	`active_cat_hat_id` integer,
	FOREIGN KEY (`active_cat_color_id`) REFERENCES `cat_colors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`active_cat_hat_id`) REFERENCES `cat_hats`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `username_idx` ON `users` (`username`);
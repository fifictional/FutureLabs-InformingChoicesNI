CREATE TABLE `app_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value_text` text,
	`value_number` int NOT NULL DEFAULT 0,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `app_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `charts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`chart_type` enum('question','comparison','response_trend','geo','word_cloud') NOT NULL,
	`configuration` text NOT NULL,
	`display_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `charts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`non_confidential_identifier` varchar(255),
	`date_of_birth` datetime,
	`reference_id` varchar(255) NOT NULL,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `clients_reference_id_unique` UNIQUE(`reference_id`)
);
--> statement-breakpoint
CREATE TABLE `event_tag_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_id` int NOT NULL,
	`tag_id` int NOT NULL,
	CONSTRAINT `event_tag_mappings_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_event_tag_mapping` UNIQUE(`event_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `event_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	CONSTRAINT `event_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `event_tags_name_unique` UNIQUE(`name`),
	CONSTRAINT `event_tags_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	CONSTRAINT `events_id` PRIMARY KEY(`id`),
	CONSTRAINT `events_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `forms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`provider` enum('google_forms','file') NOT NULL,
	`base_link` text,
	`external_id` varchar(255),
	`event_id` int NOT NULL,
	`schema` text,
	CONSTRAINT `forms_id` PRIMARY KEY(`id`),
	CONSTRAINT `forms_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `question_choice` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question_id` int NOT NULL,
	`choice_text` varchar(500) NOT NULL,
	CONSTRAINT `question_choice_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`text` text NOT NULL,
	`answer_type` enum('text','number','choice') NOT NULL,
	`form_id` int NOT NULL,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submission_id` int NOT NULL,
	`question_id` int NOT NULL,
	`value_text` text,
	`value_number` double,
	`value_choice` varchar(500),
	CONSTRAINT `responses_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_response_per_question_and_submission` UNIQUE(`submission_id`,`question_id`)
);
--> statement-breakpoint
CREATE TABLE `statistic_overviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`default_question` varchar(500) NOT NULL,
	`question_id` int,
	CONSTRAINT `statistic_overviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `statistic_overviews_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`form_id` int NOT NULL,
	`user_reference_id` varchar(255),
	`submitted_at` datetime NOT NULL,
	`external_id` varchar(255) NOT NULL,
	CONSTRAINT `submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_submission_per_form` UNIQUE(`form_id`,`external_id`)
);
--> statement-breakpoint
ALTER TABLE `event_tag_mappings` ADD CONSTRAINT `event_tag_mappings_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event_tag_mappings` ADD CONSTRAINT `event_tag_mappings_tag_id_event_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `event_tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forms` ADD CONSTRAINT `forms_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_choice` ADD CONSTRAINT `question_choice_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_form_id_forms_id_fk` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `responses` ADD CONSTRAINT `responses_submission_id_submissions_id_fk` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `responses` ADD CONSTRAINT `responses_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `statistic_overviews` ADD CONSTRAINT `statistic_overviews_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_form_id_forms_id_fk` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_forms_event_id` ON `forms` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_question_choice_question_id` ON `question_choice` (`question_id`);--> statement-breakpoint
CREATE INDEX `idx_questions_form_id` ON `questions` (`form_id`);--> statement-breakpoint
CREATE INDEX `idx_responses_submission_id` ON `responses` (`submission_id`);--> statement-breakpoint
CREATE INDEX `idx_responses_question_id` ON `responses` (`question_id`);--> statement-breakpoint
CREATE INDEX `idx_responses_submission_question` ON `responses` (`submission_id`,`question_id`);--> statement-breakpoint
CREATE INDEX `idx_statistic_overviews_question_id` ON `statistic_overviews` (`question_id`);--> statement-breakpoint
CREATE INDEX `idx_submissions_form_id` ON `submissions` (`form_id`);
CREATE TABLE `events` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `events_name_unique` (`name`)
);
--> statement-breakpoint
CREATE TABLE `event_tags` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `event_tags_name_unique` (`name`),
  UNIQUE KEY `event_tags_slug_unique` (`slug`)
);
--> statement-breakpoint
CREATE TABLE `event_tag_mappings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `event_id` INT NOT NULL,
  `tag_id` INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_event_tag_mapping` (`event_id`,`tag_id`),
  CONSTRAINT `etm_event_fk` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `etm_tag_fk` FOREIGN KEY (`tag_id`) REFERENCES `event_tags` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `forms` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `provider` ENUM('google_forms','file') NOT NULL,
  `base_link` TEXT,
  `external_id` VARCHAR(255),
  `event_id` INT NOT NULL,
  `schema` TEXT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `forms_name_unique` (`name`),
  CONSTRAINT `forms_event_fk` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `questions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `text` TEXT NOT NULL,
  `answer_type` ENUM('text','number','choice') NOT NULL,
  `form_id` INT NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `questions_form_fk` FOREIGN KEY (`form_id`) REFERENCES `forms` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `submissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `form_id` INT NOT NULL,
  `user_reference_id` VARCHAR(255),
  `submitted_at` DATETIME NOT NULL,
  `external_id` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_submission_per_form` (`form_id`,`external_id`),
  CONSTRAINT `submissions_form_fk` FOREIGN KEY (`form_id`) REFERENCES `forms` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `responses` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `submission_id` INT NOT NULL,
  `question_id` INT NOT NULL,
  `value_text` TEXT,
  `value_number` DOUBLE,
  `value_choice` VARCHAR(500),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_response_per_question_and_submission` (`submission_id`,`question_id`),
  CONSTRAINT `responses_submission_fk` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `responses_question_fk` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `question_choice` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `question_id` INT,
  `choice_text` VARCHAR(500) NOT NULL,
  PRIMARY KEY (`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `non_confidential_identifier` VARCHAR(255),
  `date_of_birth` DATETIME,
  `reference_id` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clients_reference_id_unique` (`reference_id`)
);
--> statement-breakpoint
CREATE TABLE `app_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(100) NOT NULL,
  `value_text` TEXT,
  `value_number` INT NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `app_settings_key_unique` (`key`)
);
--> statement-breakpoint
CREATE TABLE `statistic_overviews` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `default_question` VARCHAR(500) NOT NULL,
  `question_id` INT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `statistic_overviews_name_unique` (`name`),
  CONSTRAINT `stat_overviews_question_fk` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `charts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `chart_type` ENUM('question','comparison','response_trend','geo','word_cloud') NOT NULL,
  `configuration` TEXT NOT NULL,
  `display_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
);

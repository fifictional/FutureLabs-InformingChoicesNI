ALTER TABLE `charts` ADD COLUMN `display_order` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
WITH ordered_charts AS (
	SELECT `id`, ROW_NUMBER() OVER (ORDER BY `updated_at` ASC, `id` ASC) - 1 AS `display_order`
	FROM `charts`
)
UPDATE `charts`
SET `display_order` = (
	SELECT `display_order`
	FROM ordered_charts
	WHERE ordered_charts.`id` = `charts`.`id`
);
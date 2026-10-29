CREATE TABLE `connection_tests` (
	`id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`at` text NOT NULL,
	`status` integer NOT NULL,
	`category` text NOT NULL,
	`latency` integer NOT NULL,
	`model` text NOT NULL,
	`upstream_status` integer,
	`input_tokens` integer,
	`output_tokens` integer
);

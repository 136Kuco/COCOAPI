CREATE TABLE `provider_secrets` (
	`provider` text PRIMARY KEY NOT NULL,
	`envelope` text,
	`revision` text NOT NULL,
	`updated_at` text NOT NULL
);

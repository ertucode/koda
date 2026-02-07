CREATE TABLE `openedApplications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`extension` text NOT NULL,
	`appPath` text NOT NULL,
	`appName` text NOT NULL,
	`lastOpenedAt` integer NOT NULL,
	`isDefault` integer DEFAULT false NOT NULL
);

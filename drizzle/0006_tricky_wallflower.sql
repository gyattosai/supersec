ALTER TABLE `students` ADD `firstName` varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `middleName` varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `lastName` varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `privateNotes` text;
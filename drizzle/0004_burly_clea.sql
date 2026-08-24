ALTER TABLE `classSessions` ADD `publicId` varchar(24) NOT NULL;--> statement-breakpoint
ALTER TABLE `classSessions` ADD CONSTRAINT `class_sessions_public_id_unique` UNIQUE(`publicId`);
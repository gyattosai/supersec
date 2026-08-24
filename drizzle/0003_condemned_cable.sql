ALTER TABLE `reports` ADD `ownerId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `reports_owner_updated_idx` ON `reports` (`ownerId`,`updatedAt`);
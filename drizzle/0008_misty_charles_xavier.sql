CREATE TABLE `resourceAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resourceId` int NOT NULL,
	`mediaAssetId` int NOT NULL,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resourceAttachments_id` PRIMARY KEY(`id`),
	CONSTRAINT `resource_attachments_resource_media_unique` UNIQUE(`resourceId`,`mediaAssetId`)
);
--> statement-breakpoint
ALTER TABLE `resourceAttachments` ADD CONSTRAINT `resourceAttachments_resourceId_resources_id_fk` FOREIGN KEY (`resourceId`) REFERENCES `resources`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resourceAttachments` ADD CONSTRAINT `resourceAttachments_mediaAssetId_mediaAssets_id_fk` FOREIGN KEY (`mediaAssetId`) REFERENCES `mediaAssets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `resource_attachments_resource_order_idx` ON `resourceAttachments` (`resourceId`,`displayOrder`);
ALTER TABLE `announcements` ADD `mediaAssetId` int;--> statement-breakpoint
ALTER TABLE `announcements` ADD `socialPreviewMediaAssetId` int;--> statement-breakpoint
ALTER TABLE `questionsAnswers` ADD `socialPreviewMediaAssetId` int;--> statement-breakpoint
ALTER TABLE `resources` ADD `socialPreviewMediaAssetId` int;--> statement-breakpoint
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_mediaAssetId_mediaAssets_id_fk` FOREIGN KEY (`mediaAssetId`) REFERENCES `mediaAssets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_socialPreviewMediaAssetId_mediaAssets_id_fk` FOREIGN KEY (`socialPreviewMediaAssetId`) REFERENCES `mediaAssets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questionsAnswers` ADD CONSTRAINT `questionsAnswers_socialPreviewMediaAssetId_mediaAssets_id_fk` FOREIGN KEY (`socialPreviewMediaAssetId`) REFERENCES `mediaAssets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resources` ADD CONSTRAINT `resources_socialPreviewMediaAssetId_mediaAssets_id_fk` FOREIGN KEY (`socialPreviewMediaAssetId`) REFERENCES `mediaAssets`(`id`) ON DELETE set null ON UPDATE no action;
CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`publicId` varchar(24) NOT NULL,
	`title` varchar(220) NOT NULL,
	`body` text NOT NULL,
	`publishState` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`version` int NOT NULL DEFAULT 0,
	`publicChangeSummary` varchar(280),
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`),
	CONSTRAINT `announcements_public_id_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `attendanceRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classSessionId` int NOT NULL,
	`subjectStudentId` int NOT NULL,
	`attendanceStatus` enum('PRESENT','ABSENT','NOT_SET') NOT NULL DEFAULT 'NOT_SET',
	`publishState` enum('draft','published') NOT NULL DEFAULT 'draft',
	`publishedVersion` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendanceRecords_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_records_session_student_unique` UNIQUE(`classSessionId`,`subjectStudentId`)
);
--> statement-breakpoint
CREATE TABLE `classSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`startsAt` timestamp NOT NULL,
	`sessionState` enum('scheduled','no_class','completed') NOT NULL DEFAULT 'scheduled',
	`noClassReason` varchar(255),
	`captureAt` timestamp,
	`publishState` enum('draft','published') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `classSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `class_sessions_subject_start_unique` UNIQUE(`subjectId`,`startsAt`)
);
--> statement-breakpoint
CREATE TABLE `historyEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(48) NOT NULL,
	`entityId` int NOT NULL,
	`version` int NOT NULL,
	`action` varchar(64) NOT NULL,
	`publicChangeSummary` varchar(280) NOT NULL,
	`actorUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historyEntries_id` PRIMARY KEY(`id`),
	CONSTRAINT `history_entries_entity_version_unique` UNIQUE(`entityType`,`entityId`,`version`)
);
--> statement-breakpoint
CREATE TABLE `mediaAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`servedUrl` varchar(768) NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`byteSize` int NOT NULL,
	`altText` varchar(280),
	`publicUse` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mediaAssets_id` PRIMARY KEY(`id`),
	CONSTRAINT `media_assets_storage_key_unique` UNIQUE(`storageKey`)
);
--> statement-breakpoint
CREATE TABLE `questionsAnswers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`publicId` varchar(24) NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`tagsText` text,
	`isOfficial` boolean NOT NULL DEFAULT false,
	`publishState` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`version` int NOT NULL DEFAULT 0,
	`publicChangeSummary` varchar(280),
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questionsAnswers_id` PRIMARY KEY(`id`),
	CONSTRAINT `questions_answers_public_id_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(24) NOT NULL,
	`reportType` enum('class_attendance','all_subject_attendance') NOT NULL,
	`subjectId` int,
	`classSessionId` int,
	`publishState` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`version` int NOT NULL DEFAULT 0,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `reports_public_id_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`publicId` varchar(24) NOT NULL,
	`title` varchar(220) NOT NULL,
	`description` text NOT NULL,
	`category` varchar(80) NOT NULL,
	`resourceType` varchar(80) NOT NULL,
	`sourceDomain` varchar(255) NOT NULL,
	`destinationUrl` text NOT NULL,
	`fallbackMediaAssetId` int,
	`publishState` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`version` int NOT NULL DEFAULT 0,
	`publicChangeSummary` varchar(280),
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resources_id` PRIMARY KEY(`id`),
	CONSTRAINT `resources_public_id_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`canonicalName` varchar(255) NOT NULL,
	`aliasesText` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `students_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subjectMeetingDays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`weekday` int NOT NULL,
	`startTime` varchar(5),
	`endTime` varchar(5),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subjectMeetingDays_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subjectStudents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`studentId` int NOT NULL,
	`membershipState` enum('active','removed') NOT NULL DEFAULT 'active',
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`removedAt` timestamp,
	CONSTRAINT `subjectStudents_id` PRIMARY KEY(`id`),
	CONSTRAINT `subject_students_unique` UNIQUE(`subjectId`,`studentId`)
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`publicId` varchar(24) NOT NULL,
	`name` varchar(160) NOT NULL,
	`code` varchar(64) NOT NULL,
	`professorName` varchar(160) NOT NULL,
	`termName` varchar(120),
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`publishState` enum('draft','published') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archivedAt` timestamp,
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `subjects_public_id_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `zoomImports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classSessionId` int NOT NULL,
	`rawNamesText` text NOT NULL,
	`captureAt` timestamp NOT NULL,
	`reviewState` enum('draft','reviewing','confirmed') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `zoomImports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `zoomMatchSuggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`zoomImportId` int NOT NULL,
	`sourceName` varchar(255) NOT NULL,
	`suggestedSubjectStudentId` int,
	`reviewState` enum('clear','needs_review','no_match','confirmed') NOT NULL DEFAULT 'needs_review',
	`confirmedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`confirmedAt` timestamp,
	CONSTRAINT `zoomMatchSuggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendanceRecords` ADD CONSTRAINT `attendanceRecords_classSessionId_classSessions_id_fk` FOREIGN KEY (`classSessionId`) REFERENCES `classSessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendanceRecords` ADD CONSTRAINT `attendanceRecords_subjectStudentId_subjectStudents_id_fk` FOREIGN KEY (`subjectStudentId`) REFERENCES `subjectStudents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `classSessions` ADD CONSTRAINT `classSessions_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `historyEntries` ADD CONSTRAINT `historyEntries_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mediaAssets` ADD CONSTRAINT `mediaAssets_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questionsAnswers` ADD CONSTRAINT `questionsAnswers_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_classSessionId_classSessions_id_fk` FOREIGN KEY (`classSessionId`) REFERENCES `classSessions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resources` ADD CONSTRAINT `resources_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resources` ADD CONSTRAINT `resources_fallbackMediaAssetId_mediaAssets_id_fk` FOREIGN KEY (`fallbackMediaAssetId`) REFERENCES `mediaAssets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subjectMeetingDays` ADD CONSTRAINT `subjectMeetingDays_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subjectStudents` ADD CONSTRAINT `subjectStudents_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subjectStudents` ADD CONSTRAINT `subjectStudents_studentId_students_id_fk` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `zoomImports` ADD CONSTRAINT `zoomImports_classSessionId_classSessions_id_fk` FOREIGN KEY (`classSessionId`) REFERENCES `classSessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `zoomMatchSuggestions` ADD CONSTRAINT `zoomMatchSuggestions_zoomImportId_zoomImports_id_fk` FOREIGN KEY (`zoomImportId`) REFERENCES `zoomImports`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `zoomMatchSuggestions` ADD CONSTRAINT `zoomMatchSuggestions_suggestedSubjectStudentId_subjectStudents_id_fk` FOREIGN KEY (`suggestedSubjectStudentId`) REFERENCES `subjectStudents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `zoomMatchSuggestions` ADD CONSTRAINT `zoomMatchSuggestions_confirmedByUserId_users_id_fk` FOREIGN KEY (`confirmedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `announcements_subject_state_idx` ON `announcements` (`subjectId`,`publishState`,`publishedAt`);--> statement-breakpoint
CREATE INDEX `attendance_records_session_state_idx` ON `attendanceRecords` (`classSessionId`,`publishState`);--> statement-breakpoint
CREATE INDEX `class_sessions_subject_state_idx` ON `classSessions` (`subjectId`,`sessionState`);--> statement-breakpoint
CREATE INDEX `history_entries_entity_created_idx` ON `historyEntries` (`entityType`,`entityId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `media_assets_owner_public_idx` ON `mediaAssets` (`ownerId`,`publicUse`);--> statement-breakpoint
CREATE INDEX `questions_answers_subject_state_idx` ON `questionsAnswers` (`subjectId`,`publishState`,`publishedAt`);--> statement-breakpoint
CREATE INDEX `reports_subject_type_idx` ON `reports` (`subjectId`,`reportType`,`publishState`);--> statement-breakpoint
CREATE INDEX `resources_subject_state_idx` ON `resources` (`subjectId`,`publishState`,`publishedAt`);--> statement-breakpoint
CREATE INDEX `students_owner_name_idx` ON `students` (`ownerId`,`canonicalName`);--> statement-breakpoint
CREATE INDEX `subject_meeting_days_subject_idx` ON `subjectMeetingDays` (`subjectId`,`weekday`);--> statement-breakpoint
CREATE INDEX `subject_students_subject_state_idx` ON `subjectStudents` (`subjectId`,`membershipState`);--> statement-breakpoint
CREATE INDEX `subjects_owner_status_idx` ON `subjects` (`ownerId`,`status`);--> statement-breakpoint
CREATE INDEX `zoom_imports_session_idx` ON `zoomImports` (`classSessionId`);--> statement-breakpoint
CREATE INDEX `zoom_match_suggestions_import_idx` ON `zoomMatchSuggestions` (`zoomImportId`,`reviewState`);
CREATE TABLE `attendanceProofSubmissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classSessionId` int NOT NULL,
	`submittedName` varchar(255) NOT NULL,
	`proofStorageKey` varchar(512) NOT NULL,
	`proofUrl` varchar(768) NOT NULL,
	`proofOriginalName` varchar(255) NOT NULL,
	`proofMimeType` varchar(128) NOT NULL,
	`proofByteSize` int NOT NULL,
	`reviewState` enum('accepted','needs_review','rejected') NOT NULL DEFAULT 'needs_review',
	`matchedSubjectStudentId` int,
	`reviewSummary` varchar(500),
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendanceProofSubmissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `attendanceProofSubmissions` ADD CONSTRAINT `attendanceProofSubmissions_classSessionId_classSessions_id_fk` FOREIGN KEY (`classSessionId`) REFERENCES `classSessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendanceProofSubmissions` ADD CONSTRAINT `attendance_proof_student_fk` FOREIGN KEY (`matchedSubjectStudentId`) REFERENCES `subjectStudents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `attendance_proof_session_state_idx` ON `attendanceProofSubmissions` (`classSessionId`,`reviewState`,`createdAt`);--> statement-breakpoint
CREATE INDEX `attendance_proof_student_idx` ON `attendanceProofSubmissions` (`matchedSubjectStudentId`);

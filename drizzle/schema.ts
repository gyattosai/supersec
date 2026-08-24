import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core Manus-authenticated user. The project owner is the sole secretary in the first release. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const subjects = mysqlTable(
  "subjects",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** Opaque public identifier. It is not a secret, but avoids numeric URL guessing. */
    publicId: varchar("publicId", { length: 24 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    code: varchar("code", { length: 64 }).notNull(),
    professorName: varchar("professorName", { length: 160 }).notNull(),
    termName: varchar("termName", { length: 120 }),
    status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
    publishState: mysqlEnum("publishState", ["draft", "published"]).default("draft").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    archivedAt: timestamp("archivedAt"),
  },
  table => [
    uniqueIndex("subjects_public_id_unique").on(table.publicId),
    index("subjects_owner_status_idx").on(table.ownerId, table.status),
  ],
);

export const subjectMeetingDays = mysqlTable(
  "subjectMeetingDays",
  {
    id: int("id").autoincrement().primaryKey(),
    subjectId: int("subjectId").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    /** Sunday = 0 through Saturday = 6. */
    weekday: int("weekday").notNull(),
    startTime: varchar("startTime", { length: 5 }),
    endTime: varchar("endTime", { length: 5 }),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("subject_meeting_days_subject_idx").on(table.subjectId, table.weekday)],
);

/** A canonical student identity can be related to any number of independent Subject lists. */
export const students = mysqlTable(
  "students",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** Expected display format: SECTION_LAST NAME, FIRST NAME + MIDDLE NAME. */
    canonicalName: varchar("canonicalName", { length: 255 }).notNull(),
    aliasesText: text("aliasesText"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("students_owner_name_idx").on(table.ownerId, table.canonicalName)],
);

export const subjectStudents = mysqlTable(
  "subjectStudents",
  {
    id: int("id").autoincrement().primaryKey(),
    subjectId: int("subjectId").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    studentId: int("studentId").notNull().references(() => students.id, { onDelete: "cascade" }),
    membershipState: mysqlEnum("membershipState", ["active", "removed"]).default("active").notNull(),
    displayOrder: int("displayOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    removedAt: timestamp("removedAt"),
  },
  table => [
    uniqueIndex("subject_students_unique").on(table.subjectId, table.studentId),
    index("subject_students_subject_state_idx").on(table.subjectId, table.membershipState),
  ],
);

export const classSessions = mysqlTable(
  "classSessions",
  {
    id: int("id").autoincrement().primaryKey(),
    subjectId: int("subjectId").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    startsAt: timestamp("startsAt").notNull(),
    sessionState: mysqlEnum("sessionState", ["scheduled", "no_class", "completed"]).default("scheduled").notNull(),
    noClassReason: varchar("noClassReason", { length: 255 }),
    captureAt: timestamp("captureAt"),
    publishState: mysqlEnum("publishState", ["draft", "published"]).default("draft").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("class_sessions_subject_start_unique").on(table.subjectId, table.startsAt),
    index("class_sessions_subject_state_idx").on(table.subjectId, table.sessionState),
  ],
);

/** Private source text from Zoom. It is never included in a public query. */
export const zoomImports = mysqlTable(
  "zoomImports",
  {
    id: int("id").autoincrement().primaryKey(),
    classSessionId: int("classSessionId").notNull().references(() => classSessions.id, { onDelete: "cascade" }),
    rawNamesText: text("rawNamesText").notNull(),
    captureAt: timestamp("captureAt").notNull(),
    reviewState: mysqlEnum("reviewState", ["draft", "reviewing", "confirmed"]).default("draft").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("zoom_imports_session_idx").on(table.classSessionId)],
);

/** Private LLM/manual suggestions. A suggestion never becomes Attendance without secretary confirmation. */
export const zoomMatchSuggestions = mysqlTable(
  "zoomMatchSuggestions",
  {
    id: int("id").autoincrement().primaryKey(),
    zoomImportId: int("zoomImportId").notNull().references(() => zoomImports.id, { onDelete: "cascade" }),
    sourceName: varchar("sourceName", { length: 255 }).notNull(),
    suggestedSubjectStudentId: int("suggestedSubjectStudentId").references(() => subjectStudents.id, { onDelete: "set null" }),
    reviewState: mysqlEnum("reviewState", ["clear", "needs_review", "no_match", "confirmed"])
      .default("needs_review")
      .notNull(),
    confirmedByUserId: int("confirmedByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    confirmedAt: timestamp("confirmedAt"),
  },
  table => [index("zoom_match_suggestions_import_idx").on(table.zoomImportId, table.reviewState)],
);

export const attendanceRecords = mysqlTable(
  "attendanceRecords",
  {
    id: int("id").autoincrement().primaryKey(),
    classSessionId: int("classSessionId").notNull().references(() => classSessions.id, { onDelete: "cascade" }),
    subjectStudentId: int("subjectStudentId").notNull().references(() => subjectStudents.id, { onDelete: "cascade" }),
    attendanceStatus: mysqlEnum("attendanceStatus", ["PRESENT", "ABSENT", "NOT_SET"]).default("NOT_SET").notNull(),
    publishState: mysqlEnum("publishState", ["draft", "published"]).default("draft").notNull(),
    publishedVersion: int("publishedVersion").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("attendance_records_session_student_unique").on(table.classSessionId, table.subjectStudentId),
    index("attendance_records_session_state_idx").on(table.classSessionId, table.publishState),
  ],
);

/** File bytes are stored in managed object storage; this table keeps safe metadata and references only. */
export const mediaAssets = mysqlTable(
  "mediaAssets",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    servedUrl: varchar("servedUrl", { length: 768 }).notNull(),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 128 }).notNull(),
    byteSize: int("byteSize").notNull(),
    altText: varchar("altText", { length: 280 }),
    publicUse: boolean("publicUse").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("media_assets_storage_key_unique").on(table.storageKey),
    index("media_assets_owner_public_idx").on(table.ownerId, table.publicUse),
  ],
);

export const announcements = mysqlTable(
  "announcements",
  {
    id: int("id").autoincrement().primaryKey(),
    subjectId: int("subjectId").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    publicId: varchar("publicId", { length: 24 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    body: text("body").notNull(),
    mediaAssetId: int("mediaAssetId").references(() => mediaAssets.id, { onDelete: "set null" }),
    socialPreviewMediaAssetId: int("socialPreviewMediaAssetId").references(() => mediaAssets.id, { onDelete: "set null" }),
    publishState: mysqlEnum("publishState", ["draft", "published", "archived"]).default("draft").notNull(),
    version: int("version").default(0).notNull(),
    publicChangeSummary: varchar("publicChangeSummary", { length: 280 }),
    publishedAt: timestamp("publishedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("announcements_public_id_unique").on(table.publicId),
    index("announcements_subject_state_idx").on(table.subjectId, table.publishState, table.publishedAt),
  ],
);

export const resources = mysqlTable(
  "resources",
  {
    id: int("id").autoincrement().primaryKey(),
    subjectId: int("subjectId").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    publicId: varchar("publicId", { length: 24 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    description: text("description").notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    resourceType: varchar("resourceType", { length: 80 }).notNull(),
    sourceDomain: varchar("sourceDomain", { length: 255 }).notNull(),
    destinationUrl: text("destinationUrl").notNull(),
    fallbackMediaAssetId: int("fallbackMediaAssetId").references(() => mediaAssets.id, { onDelete: "set null" }),
    socialPreviewMediaAssetId: int("socialPreviewMediaAssetId").references(() => mediaAssets.id, { onDelete: "set null" }),
    publishState: mysqlEnum("publishState", ["draft", "published", "archived"]).default("draft").notNull(),
    version: int("version").default(0).notNull(),
    publicChangeSummary: varchar("publicChangeSummary", { length: 280 }),
    publishedAt: timestamp("publishedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("resources_public_id_unique").on(table.publicId),
    index("resources_subject_state_idx").on(table.subjectId, table.publishState, table.publishedAt),
  ],
);

export const questionsAnswers = mysqlTable(
  "questionsAnswers",
  {
    id: int("id").autoincrement().primaryKey(),
    subjectId: int("subjectId").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    publicId: varchar("publicId", { length: 24 }).notNull(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    tagsText: text("tagsText"),
    isOfficial: boolean("isOfficial").default(false).notNull(),
    socialPreviewMediaAssetId: int("socialPreviewMediaAssetId").references(() => mediaAssets.id, { onDelete: "set null" }),
    publishState: mysqlEnum("publishState", ["draft", "published", "archived"]).default("draft").notNull(),
    version: int("version").default(0).notNull(),
    publicChangeSummary: varchar("publicChangeSummary", { length: 280 }),
    publishedAt: timestamp("publishedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("questions_answers_public_id_unique").on(table.publicId),
    index("questions_answers_subject_state_idx").on(table.subjectId, table.publishState, table.publishedAt),
  ],
);

export const reports = mysqlTable(
  "reports",
  {
    id: int("id").autoincrement().primaryKey(),
    publicId: varchar("publicId", { length: 24 }).notNull(),
    reportType: mysqlEnum("reportType", ["class_attendance", "all_subject_attendance"]).notNull(),
    subjectId: int("subjectId").references(() => subjects.id, { onDelete: "set null" }),
    classSessionId: int("classSessionId").references(() => classSessions.id, { onDelete: "set null" }),
    publishState: mysqlEnum("publishState", ["draft", "published", "archived"]).default("draft").notNull(),
    version: int("version").default(0).notNull(),
    generatedAt: timestamp("generatedAt").defaultNow().notNull(),
    publishedAt: timestamp("publishedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("reports_public_id_unique").on(table.publicId),
    index("reports_subject_type_idx").on(table.subjectId, table.reportType, table.publishState),
  ],
);

/** Public-friendly History. It never stores source input, private notes, or before/after payloads. */
export const historyEntries = mysqlTable(
  "historyEntries",
  {
    id: int("id").autoincrement().primaryKey(),
    entityType: varchar("entityType", { length: 48 }).notNull(),
    entityId: int("entityId").notNull(),
    version: int("version").notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    publicChangeSummary: varchar("publicChangeSummary", { length: 280 }).notNull(),
    actorUserId: int("actorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("history_entries_entity_version_unique").on(table.entityType, table.entityId, table.version),
    index("history_entries_entity_created_idx").on(table.entityType, table.entityId, table.createdAt),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type Student = typeof students.$inferSelect;
export type ClassSession = typeof classSessions.$inferSelect;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type QuestionAnswer = typeof questionsAnswers.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type HistoryEntry = typeof historyEntries.$inferSelect;
export type MediaAsset = typeof mediaAssets.$inferSelect;

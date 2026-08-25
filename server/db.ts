import { and, asc, desc, eq, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  announcements,
  attendanceRecords,
  classSessions,
  historyEntries,
  InsertUser,
  mediaAssets,
  questionsAnswers,
  reports,
  resources,
  subjectMeetingDays,
  subjectStudents,
  subjects,
  students,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

/** Lazily create the database connection so local tests can run without a database. */
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  textFields.forEach(field => {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  });

  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export type PublicSubjectPayload = {
  publicId: string;
  name: string;
  code: string;
  professorName: string;
  meetingDays: Array<{ weekday: number; startTime: string | null; endTime: string | null }>;
  noClass: { startsAt: Date; reason: string } | null;
  latest: {
    attendance: Array<{ publicId: string; startsAt: Date }>;
    announcements: Array<{ publicId: string; title: string }>;
    resources: Array<{ publicId: string; title: string; description: string; category: string; resourceType: string; sourceDomain: string; thumbnail: { url: string; altText: string | null } | null }>;
    questions: Array<{ publicId: string; title: string }>;
  };
};

/**
 * Returns only information intentionally safe for a public Subject page.
 * Zoom input, Student records, drafts, and secretary-only notes are never selected here.
 */
export async function getPublicSubjectById(publicId: string): Promise<PublicSubjectPayload | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      id: subjects.id,
      publicId: subjects.publicId,
      name: subjects.name,
      code: subjects.code,
      professorName: subjects.professorName,
    })
    .from(subjects)
    .where(
      and(
        eq(subjects.publicId, publicId),
        eq(subjects.status, "active"),
        eq(subjects.publishState, "published"),
      ),
    )
    .limit(1);

  const subject = result[0];
  if (!subject) return null;

  const meetingDays = await db
    .select({ weekday: subjectMeetingDays.weekday, startTime: subjectMeetingDays.startTime, endTime: subjectMeetingDays.endTime })
    .from(subjectMeetingDays)
    .where(eq(subjectMeetingDays.subjectId, subject.id))
    .orderBy(asc(subjectMeetingDays.weekday), asc(subjectMeetingDays.sortOrder));

  const noClassRows = await db
    .select({ startsAt: classSessions.startsAt, reason: classSessions.noClassReason })
    .from(classSessions)
    .where(
      and(
        eq(classSessions.subjectId, subject.id),
        eq(classSessions.sessionState, "no_class"),
        eq(classSessions.publishState, "published"),
        gte(classSessions.startsAt, new Date()),
      ),
    )
    .orderBy(asc(classSessions.startsAt))
    .limit(1);

  const [attendanceRows, announcementRows, resourceRows, questionRows] = await Promise.all([
    db.select({ publicId: classSessions.publicId, startsAt: classSessions.startsAt }).from(classSessions).where(and(eq(classSessions.subjectId, subject.id), eq(classSessions.sessionState, "completed"), eq(classSessions.publishState, "published"))).orderBy(desc(classSessions.startsAt)).limit(3),
    db.select({ publicId: announcements.publicId, title: announcements.title }).from(announcements).where(and(eq(announcements.subjectId, subject.id), eq(announcements.publishState, "published"))).orderBy(desc(announcements.publishedAt)).limit(3),
    db.select({ publicId: resources.publicId, title: resources.title, description: resources.description, category: resources.category, resourceType: resources.resourceType, sourceDomain: resources.sourceDomain, thumbnailUrl: mediaAssets.servedUrl, thumbnailAltText: mediaAssets.altText }).from(resources).leftJoin(mediaAssets, and(eq(resources.fallbackMediaAssetId, mediaAssets.id), eq(mediaAssets.publicUse, true))).where(and(eq(resources.subjectId, subject.id), eq(resources.publishState, "published"))).orderBy(desc(resources.publishedAt)).limit(3),
    db.select({ publicId: questionsAnswers.publicId, title: questionsAnswers.question }).from(questionsAnswers).where(and(eq(questionsAnswers.subjectId, subject.id), eq(questionsAnswers.publishState, "published"), eq(questionsAnswers.isOfficial, true))).orderBy(desc(questionsAnswers.publishedAt)).limit(3),
  ]);
  const noClass = noClassRows[0];
  return {
    publicId: subject.publicId,
    name: subject.name,
    code: subject.code,
    professorName: subject.professorName,
    meetingDays,
    noClass: noClass && noClass.reason ? { startsAt: noClass.startsAt, reason: noClass.reason } : null,
    latest: { attendance: attendanceRows, announcements: announcementRows, resources: resourceRows.map(resource => ({ publicId: resource.publicId, title: resource.title, description: resource.description, category: resource.category, resourceType: resource.resourceType, sourceDomain: resource.sourceDomain, thumbnail: resource.thumbnailUrl ? { url: resource.thumbnailUrl, altText: resource.thumbnailAltText } : null })), questions: questionRows },
  };
}

/** Returns only published Q&A data intended for a public Subject-level browse page. */
export async function getPublicQuestionsBySubjectId(publicId: string, query?: string) {
  const db = await getDb();
  if (!db) return null;
  const subjectRows = await db
    .select({ id: subjects.id, publicId: subjects.publicId, name: subjects.name, code: subjects.code })
    .from(subjects)
    .where(and(eq(subjects.publicId, publicId), eq(subjects.status, "active"), eq(subjects.publishState, "published")))
    .limit(1);
  const subject = subjectRows[0];
  if (!subject) return null;
  const normalizedQuery = query?.trim().toLocaleLowerCase() ?? "";
  const rows = await db
    .select({ publicId: questionsAnswers.publicId, question: questionsAnswers.question, answer: questionsAnswers.answer, tagsText: questionsAnswers.tagsText, isOfficial: questionsAnswers.isOfficial, publishedAt: questionsAnswers.publishedAt })
    .from(questionsAnswers)
    .where(and(eq(questionsAnswers.subjectId, subject.id), eq(questionsAnswers.publishState, "published")))
    .orderBy(desc(questionsAnswers.publishedAt))
    .limit(100);
  const questions = normalizedQuery
    ? rows.filter(row => `${row.question} ${row.answer} ${row.tagsText ?? ""}`.toLocaleLowerCase().includes(normalizedQuery))
    : rows;
  return { subject: { publicId: subject.publicId, name: subject.name, code: subject.code }, questions };
}

export async function getPublicHistory(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ version: historyEntries.version, action: historyEntries.action, summary: historyEntries.publicChangeSummary, createdAt: historyEntries.createdAt })
    .from(historyEntries)
    .where(and(eq(historyEntries.entityType, entityType), eq(historyEntries.entityId, entityId)))
    .orderBy(asc(historyEntries.version));
}

export type PublicContentPayload = {
  kind: "announcement" | "resource" | "question";
  publicId: string;
  title: string;
  body: string;
  version: number;
  publishedAt: Date | null;
  subject: { publicId: string; name: string; code: string; professorName: string };
  destinationUrl?: string;
  category?: string;
  resourceType?: string;
  sourceDomain?: string;
  tagsText?: string | null;
  isOfficial?: boolean;
  media?: { url: string; altText: string | null } | null;
  socialPreviewMedia?: { url: string; altText: string | null } | null;
};

/** Selects only an explicitly published item and its published subject context. */
export async function getPublicContentItem(kind: PublicContentPayload["kind"], publicId: string): Promise<PublicContentPayload | null> {
  const db = await getDb();
  if (!db) return null;
  const publishedSubject = and(eq(subjects.status, "active"), eq(subjects.publishState, "published"));
  if (kind === "announcement") {
    const rows = await db.select({ publicId: announcements.publicId, title: announcements.title, body: announcements.body, version: announcements.version, publishedAt: announcements.publishedAt, mediaUrl: mediaAssets.servedUrl, mediaAltText: mediaAssets.altText, subjectPublicId: subjects.publicId, subjectName: subjects.name, subjectCode: subjects.code, professorName: subjects.professorName }).from(announcements).innerJoin(subjects, eq(announcements.subjectId, subjects.id)).leftJoin(mediaAssets, and(eq(announcements.mediaAssetId, mediaAssets.id), eq(mediaAssets.publicUse, true))).where(and(eq(announcements.publicId, publicId), eq(announcements.publishState, "published"), publishedSubject)).limit(1);
    const row = rows[0]; return row ? { kind, publicId: row.publicId, title: row.title, body: row.body, version: row.version, publishedAt: row.publishedAt, media: row.mediaUrl ? { url: row.mediaUrl, altText: row.mediaAltText } : null, subject: { publicId: row.subjectPublicId, name: row.subjectName, code: row.subjectCode, professorName: row.professorName } } : null;
  }
  if (kind === "resource") {
    const rows = await db.select({ publicId: resources.publicId, title: resources.title, body: resources.description, version: resources.version, publishedAt: resources.publishedAt, destinationUrl: resources.destinationUrl, category: resources.category, resourceType: resources.resourceType, sourceDomain: resources.sourceDomain, mediaUrl: mediaAssets.servedUrl, mediaAltText: mediaAssets.altText, subjectPublicId: subjects.publicId, subjectName: subjects.name, subjectCode: subjects.code, professorName: subjects.professorName }).from(resources).innerJoin(subjects, eq(resources.subjectId, subjects.id)).leftJoin(mediaAssets, and(eq(resources.fallbackMediaAssetId, mediaAssets.id), eq(mediaAssets.publicUse, true))).where(and(eq(resources.publicId, publicId), eq(resources.publishState, "published"), publishedSubject)).limit(1);
    const row = rows[0]; return row ? { kind, publicId: row.publicId, title: row.title, body: row.body, version: row.version, publishedAt: row.publishedAt, destinationUrl: row.destinationUrl, category: row.category, resourceType: row.resourceType, sourceDomain: row.sourceDomain, media: row.mediaUrl ? { url: row.mediaUrl, altText: row.mediaAltText } : null, subject: { publicId: row.subjectPublicId, name: row.subjectName, code: row.subjectCode, professorName: row.professorName } } : null;
  }
  const rows = await db.select({ publicId: questionsAnswers.publicId, title: questionsAnswers.question, body: questionsAnswers.answer, version: questionsAnswers.version, publishedAt: questionsAnswers.publishedAt, tagsText: questionsAnswers.tagsText, isOfficial: questionsAnswers.isOfficial, mediaUrl: mediaAssets.servedUrl, mediaAltText: mediaAssets.altText, subjectPublicId: subjects.publicId, subjectName: subjects.name, subjectCode: subjects.code, professorName: subjects.professorName }).from(questionsAnswers).innerJoin(subjects, eq(questionsAnswers.subjectId, subjects.id)).leftJoin(mediaAssets, and(eq(questionsAnswers.socialPreviewMediaAssetId, mediaAssets.id), eq(mediaAssets.publicUse, true))).where(and(eq(questionsAnswers.publicId, publicId), eq(questionsAnswers.publishState, "published"), publishedSubject)).limit(1);
  const row = rows[0]; return row ? { kind, publicId: row.publicId, title: `${row.isOfficial ? "Official" : "Unofficial"} answer — ${row.title}`, body: row.body, version: row.version, publishedAt: row.publishedAt, tagsText: row.tagsText, isOfficial: row.isOfficial, socialPreviewMedia: row.mediaUrl ? { url: row.mediaUrl, altText: row.mediaAltText } : null, subject: { publicId: row.subjectPublicId, name: row.subjectName, code: row.subjectCode, professorName: row.professorName } } : null;
}

/** Public History requires a published public ID; numeric entity IDs never become an anonymous API contract. */
export async function getPublicContentHistory(kind: PublicContentPayload["kind"], publicId: string) {
  const item = await getPublicContentItem(kind, publicId);
  if (!item) return null;
  const db = await getDb();
  if (!db) return null;
  const table = kind === "announcement" ? announcements : kind === "resource" ? resources : questionsAnswers;
  const entityType = kind === "question" ? "question" : kind;
  const rows = await db.select({ id: table.id }).from(table).where(eq(table.publicId, publicId)).limit(1);
  if (!rows[0]) return null;
  return getPublicHistory(entityType, rows[0].id);
}

export type PublicAttendancePayload = {
  publicId: string;
  startsAt: Date;
  version: number;
  subject: { publicId: string; name: string; code: string; professorName: string };
  records: Array<{ canonicalName: string; status: "PRESENT" | "ABSENT" | "NOT_SET" }>;
  history: Awaited<ReturnType<typeof getPublicHistory>>;
};

/**
 * An opaque published Attendance link returns only final canonical names, statuses, and public
 * History. Raw Zoom text, normalization candidates, AI suggestions, aliases, and owner data are
 * never selected for an anonymous caller.
 */
export async function getPublicAttendanceById(publicId: string): Promise<PublicAttendancePayload | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ id: classSessions.id, publicId: classSessions.publicId, startsAt: classSessions.startsAt, version: attendanceRecords.publishedVersion, subjectPublicId: subjects.publicId, subjectName: subjects.name, subjectCode: subjects.code, professorName: subjects.professorName })
    .from(classSessions)
    .innerJoin(subjects, eq(classSessions.subjectId, subjects.id))
    .leftJoin(attendanceRecords, eq(attendanceRecords.classSessionId, classSessions.id))
    .where(and(eq(classSessions.publicId, publicId), eq(classSessions.sessionState, "completed"), eq(classSessions.publishState, "published"), eq(subjects.status, "active")))
    .orderBy(asc(attendanceRecords.id))
    .limit(1);
  const session = rows[0];
  if (!session) return null;
  const records = await db
    .select({ canonicalName: students.canonicalName, status: attendanceRecords.attendanceStatus })
    .from(attendanceRecords)
    .innerJoin(subjectStudents, eq(attendanceRecords.subjectStudentId, subjectStudents.id))
    .innerJoin(students, eq(subjectStudents.studentId, students.id))
    .where(and(eq(attendanceRecords.classSessionId, session.id), eq(attendanceRecords.publishState, "published")))
    .orderBy(asc(students.canonicalName));
  const history = await getPublicHistory("attendance", session.id);
  return {
    publicId: session.publicId,
    startsAt: session.startsAt,
    version: session.version ?? 0,
    subject: { publicId: session.subjectPublicId, name: session.subjectName, code: session.subjectCode, professorName: session.professorName },
    records,
    history,
  };
}

export type PublicReportPayload = {
  publicId: string;
  reportType: "class_attendance" | "all_subject_attendance";
  version: number;
  publishedAt: Date | null;
  title: string;
  startsAt?: Date;
  totals?: { present: number; absent: number; notSet: number };
  subjects?: Array<{ subjectName: string; subjectCode: string; present: number; absent: number; notSet: number }>;
};

/** Published reports expose aggregates only—never roster records, Zoom input, suggestions, or owner data. */
export async function getPublicReportById(publicId: string): Promise<PublicReportPayload | null> {
  const db = await getDb();
  if (!db) return null;
  const reportRows = await db.select({ id: reports.id, ownerId: reports.ownerId, reportType: reports.reportType, classSessionId: reports.classSessionId, version: reports.version, publishedAt: reports.publishedAt }).from(reports).where(and(eq(reports.publicId, publicId), eq(reports.publishState, "published"))).limit(1);
  const report = reportRows[0];
  if (!report) return null;
  if (report.reportType === "class_attendance" && report.classSessionId) {
    const rows = await db.select({ startsAt: classSessions.startsAt, subjectName: subjects.name, subjectCode: subjects.code, status: attendanceRecords.attendanceStatus }).from(classSessions).innerJoin(subjects, eq(classSessions.subjectId, subjects.id)).leftJoin(attendanceRecords, eq(attendanceRecords.classSessionId, classSessions.id)).where(and(eq(classSessions.id, report.classSessionId), eq(subjects.ownerId, report.ownerId))).orderBy(asc(attendanceRecords.id));
    if (!rows[0]) return null;
    const totals = rows.reduce((result, row) => { if (row.status === "PRESENT") result.present += 1; else if (row.status === "ABSENT") result.absent += 1; else result.notSet += 1; return result; }, { present: 0, absent: 0, notSet: 0 });
    return { publicId, reportType: "class_attendance", version: report.version, publishedAt: report.publishedAt, title: `${rows[0].subjectName} Attendance`, startsAt: rows[0].startsAt, totals };
  }
  const rows = await db.select({ subjectId: subjects.id, subjectName: subjects.name, subjectCode: subjects.code, status: attendanceRecords.attendanceStatus }).from(subjects).leftJoin(subjectStudents, and(eq(subjectStudents.subjectId, subjects.id), eq(subjectStudents.membershipState, "active"))).leftJoin(attendanceRecords, eq(attendanceRecords.subjectStudentId, subjectStudents.id)).where(and(eq(subjects.ownerId, report.ownerId), eq(subjects.status, "active")));
  const grouped = new Map<number, { subjectName: string; subjectCode: string; present: number; absent: number; notSet: number }>();
  for (const row of rows) { const current = grouped.get(row.subjectId) ?? { subjectName: row.subjectName, subjectCode: row.subjectCode, present: 0, absent: 0, notSet: 0 }; if (row.status === "PRESENT") current.present += 1; else if (row.status === "ABSENT") current.absent += 1; else current.notSet += 1; grouped.set(row.subjectId, current); }
  return { publicId, reportType: "all_subject_attendance", version: report.version, publishedAt: report.publishedAt, title: "All Subject Attendance", subjects: Array.from(grouped.values()) };
}

export async function createPublicHistoryEntry(input: {
  entityType: string;
  entityId: number;
  version: number;
  action: string;
  publicChangeSummary: string;
  actorUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(historyEntries).values(input);
}

export async function createMediaReference(input: {
  ownerId: number;
  storageKey: string;
  servedUrl: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  altText?: string | null;
  publicUse: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [row] = await db.insert(mediaAssets).values(input).$returningId();
  return row.id;
}

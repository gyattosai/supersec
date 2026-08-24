import { and, asc, desc, eq, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  announcements,
  classSessions,
  historyEntries,
  InsertUser,
  mediaAssets,
  questionsAnswers,
  resources,
  subjectMeetingDays,
  subjects,
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
    announcements: Array<{ publicId: string; title: string }>;
    resources: Array<{ publicId: string; title: string }>;
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

  const [announcementRows, resourceRows, questionRows] = await Promise.all([
    db.select({ publicId: announcements.publicId, title: announcements.title }).from(announcements).where(and(eq(announcements.subjectId, subject.id), eq(announcements.publishState, "published"))).orderBy(desc(announcements.publishedAt)).limit(3),
    db.select({ publicId: resources.publicId, title: resources.title }).from(resources).where(and(eq(resources.subjectId, subject.id), eq(resources.publishState, "published"))).orderBy(desc(resources.publishedAt)).limit(3),
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
    latest: { announcements: announcementRows, resources: resourceRows, questions: questionRows },
  };
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
};

/** Selects only an explicitly published item and its published subject context. */
export async function getPublicContentItem(kind: PublicContentPayload["kind"], publicId: string): Promise<PublicContentPayload | null> {
  const db = await getDb();
  if (!db) return null;
  const publishedSubject = and(eq(subjects.status, "active"), eq(subjects.publishState, "published"));
  if (kind === "announcement") {
    const rows = await db.select({ publicId: announcements.publicId, title: announcements.title, body: announcements.body, version: announcements.version, publishedAt: announcements.publishedAt, subjectPublicId: subjects.publicId, subjectName: subjects.name, subjectCode: subjects.code, professorName: subjects.professorName }).from(announcements).innerJoin(subjects, eq(announcements.subjectId, subjects.id)).where(and(eq(announcements.publicId, publicId), eq(announcements.publishState, "published"), publishedSubject)).limit(1);
    const row = rows[0]; return row ? { kind, publicId: row.publicId, title: row.title, body: row.body, version: row.version, publishedAt: row.publishedAt, subject: { publicId: row.subjectPublicId, name: row.subjectName, code: row.subjectCode, professorName: row.professorName } } : null;
  }
  if (kind === "resource") {
    const rows = await db.select({ publicId: resources.publicId, title: resources.title, body: resources.description, version: resources.version, publishedAt: resources.publishedAt, destinationUrl: resources.destinationUrl, category: resources.category, resourceType: resources.resourceType, sourceDomain: resources.sourceDomain, subjectPublicId: subjects.publicId, subjectName: subjects.name, subjectCode: subjects.code, professorName: subjects.professorName }).from(resources).innerJoin(subjects, eq(resources.subjectId, subjects.id)).where(and(eq(resources.publicId, publicId), eq(resources.publishState, "published"), publishedSubject)).limit(1);
    const row = rows[0]; return row ? { kind, publicId: row.publicId, title: row.title, body: row.body, version: row.version, publishedAt: row.publishedAt, destinationUrl: row.destinationUrl, category: row.category, resourceType: row.resourceType, sourceDomain: row.sourceDomain, subject: { publicId: row.subjectPublicId, name: row.subjectName, code: row.subjectCode, professorName: row.professorName } } : null;
  }
  const rows = await db.select({ publicId: questionsAnswers.publicId, title: questionsAnswers.question, body: questionsAnswers.answer, version: questionsAnswers.version, publishedAt: questionsAnswers.publishedAt, tagsText: questionsAnswers.tagsText, isOfficial: questionsAnswers.isOfficial, subjectPublicId: subjects.publicId, subjectName: subjects.name, subjectCode: subjects.code, professorName: subjects.professorName }).from(questionsAnswers).innerJoin(subjects, eq(questionsAnswers.subjectId, subjects.id)).where(and(eq(questionsAnswers.publicId, publicId), eq(questionsAnswers.publishState, "published"), publishedSubject)).limit(1);
  const row = rows[0]; return row ? { kind, publicId: row.publicId, title: row.title, body: row.body, version: row.version, publishedAt: row.publishedAt, tagsText: row.tagsText, isOfficial: row.isOfficial, subject: { publicId: row.subjectPublicId, name: row.subjectName, code: row.subjectCode, professorName: row.professorName } } : null;
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
  await db.insert(mediaAssets).values(input);
}

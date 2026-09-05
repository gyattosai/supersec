import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { Client, Databases, Query, ID } from "node-appwrite";
import { compareByLastNameAsc } from "../shared/attendanceSorting";
import {
  announcements,
  attendanceRecords,
  classSessions,
  historyEntries,
  InsertUser,
  mediaAssets,
  questionsAnswers,
  resourceAttachments,
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

/** Lazily create Appwrite Databases service */
export function getAppwriteDb(): { databases: Databases; dbId: string } | null {
  if (!ENV.appwriteProjectId || !ENV.appwriteApiKey) {
    return null;
  }
  const client = new Client()
    .setEndpoint(ENV.appwriteEndpoint)
    .setProject(ENV.appwriteProjectId)
    .setKey(ENV.appwriteApiKey);
  return {
    databases: new Databases(client),
    dbId: ENV.appwriteDatabaseId,
  };
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const appwrite = getAppwriteDb();
  if (appwrite) {
    try {
      const existing = await appwrite.databases.listDocuments(appwrite.dbId, "users", [
        Query.equal("openId", user.openId),
        Query.limit(1),
      ]);
      const data: Record<string, unknown> = {
        openId: user.openId,
        name: user.name ?? "Class Secretary",
        email: user.email ?? null,
        loginMethod: user.loginMethod ?? "appwrite",
        role: user.role ?? "admin",
        lastSignedIn: (user.lastSignedIn ?? new Date()).toISOString(),
      };
      if (existing.documents.length > 0) {
        await appwrite.databases.updateDocument(
          appwrite.dbId,
          "users",
          existing.documents[0].$id,
          data
        );
      } else {
        await appwrite.databases.createDocument(
          appwrite.dbId,
          "users",
          ID.unique(),
          data
        );
      }
      return;
    } catch (error) {
      console.warn("[Appwrite DB] User upsert warning:", error);
    }
  }

  const db = await getDb();
  if (!db) {
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

  const isConfiguredOwner = user.openId.trim() === ENV.ownerOpenId.trim() && ENV.ownerOpenId.trim().length > 0;
  if (user.role !== undefined || isConfiguredOwner) {
    values.role = user.role ?? "admin";
    updateSet.role = values.role;
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const appwrite = getAppwriteDb();
  if (appwrite) {
    try {
      const res = await appwrite.databases.listDocuments(appwrite.dbId, "users", [
        Query.equal("openId", openId),
        Query.limit(1),
      ]);
      if (res.documents.length > 0) {
        const doc = res.documents[0];
        return {
          id: 1,
          openId: doc.openId as string,
          name: (doc.name as string) || null,
          email: (doc.email as string) || null,
          loginMethod: (doc.loginMethod as string) || null,
          role: (doc.role as "user" | "admin") || "user",
          createdAt: new Date(doc.$createdAt),
          updatedAt: new Date(doc.$updatedAt),
          lastSignedIn: doc.lastSignedIn ? new Date(doc.lastSignedIn as string) : new Date(),
        };
      }
    } catch (error) {
      console.warn("[Appwrite DB] getUserByOpenId error:", error);
    }
  }

  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const appwrite = getAppwriteDb();
  if (appwrite) {
    try {
      const res = await appwrite.databases.listDocuments(appwrite.dbId, "users", [
        Query.equal("email", normalized),
        Query.limit(1),
      ]);
      if (res.documents.length > 0) {
        const doc = res.documents[0];
        return {
          id: 1,
          openId: doc.openId as string,
          name: (doc.name as string) || null,
          email: (doc.email as string) || null,
          loginMethod: (doc.loginMethod as string) || null,
          role: (doc.role as "user" | "admin") || "user",
          createdAt: new Date(doc.$createdAt),
          updatedAt: new Date(doc.$updatedAt),
          lastSignedIn: doc.lastSignedIn ? new Date(doc.lastSignedIn as string) : new Date(),
        };
      }
    } catch (error) {
      console.warn("[Appwrite DB] getUserByEmail error:", error);
    }
  }

  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  return result[0];
}

export type PublicSubjectPayload = {
  publicId: string;
  name: string;
  code: string;
  viewOnlyShortMark: string | null;
  viewOnlyName: string | null;
  professorName: string;
  meetingDays: Array<{ weekday: number; startTime: string | null; endTime: string | null }>;
  noClass: { startsAt: Date; reason: string } | null;
  students?: Array<{ canonicalName: string; hasScheduleConflict: boolean }>;
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
      viewOnlyShortMark: subjects.viewOnlyShortMark,
      viewOnlyName: subjects.viewOnlyName,
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

  const [attendanceRows, announcementRows, resourceRows, questionRows, studentRows] = await Promise.all([
    db.select({ publicId: classSessions.publicId, startsAt: classSessions.startsAt, sessionState: classSessions.sessionState, noClassReason: classSessions.noClassReason }).from(classSessions).where(and(eq(classSessions.subjectId, subject.id), eq(classSessions.publishState, "published"))).orderBy(desc(classSessions.startsAt)).limit(50),
    db.select({ publicId: announcements.publicId, title: announcements.title, body: announcements.body, publishedAt: announcements.publishedAt }).from(announcements).where(and(eq(announcements.subjectId, subject.id), eq(announcements.publishState, "published"))).orderBy(desc(announcements.publishedAt)).limit(50),
    db.select({ publicId: resources.publicId, title: resources.title, description: resources.description, category: resources.category, resourceType: resources.resourceType, sourceDomain: resources.sourceDomain, publishedAt: resources.publishedAt, thumbnailUrl: mediaAssets.servedUrl, thumbnailAltText: mediaAssets.altText }).from(resources).leftJoin(mediaAssets, and(eq(resources.fallbackMediaAssetId, mediaAssets.id), eq(mediaAssets.publicUse, true))).where(and(eq(resources.subjectId, subject.id), eq(resources.publishState, "published"))).orderBy(desc(resources.publishedAt)).limit(50),
    db.select({ publicId: questionsAnswers.publicId, title: questionsAnswers.question, question: questionsAnswers.question, answer: questionsAnswers.answer, isOfficial: questionsAnswers.isOfficial, tagsText: questionsAnswers.tagsText, publishedAt: questionsAnswers.publishedAt }).from(questionsAnswers).where(and(eq(questionsAnswers.subjectId, subject.id), eq(questionsAnswers.publishState, "published"))).orderBy(desc(questionsAnswers.publishedAt)).limit(50),
    db.select({
      canonicalName: students.canonicalName,
      hasScheduleConflict: subjectStudents.hasScheduleConflict,
      lastName: students.lastName,
      firstName: students.firstName,
      displayOrder: subjectStudents.displayOrder,
    })
      .from(subjectStudents)
      .innerJoin(students, eq(subjectStudents.studentId, students.id))
      .where(
        and(
          eq(subjectStudents.subjectId, subject.id),
          eq(subjectStudents.membershipState, "active")
        )
      )
      .orderBy(asc(students.lastName), asc(students.firstName), asc(subjectStudents.displayOrder)),
  ]);
  const noClass = noClassRows[0];
  return {
    publicId: subject.publicId,
    name: subject.name,
    code: subject.code,
    viewOnlyShortMark: subject.viewOnlyShortMark,
    viewOnlyName: subject.viewOnlyName,
    professorName: subject.professorName,
    meetingDays,
    noClass: noClass && noClass.reason ? { startsAt: noClass.startsAt, reason: noClass.reason } : null,
    students: studentRows.map(s => ({
      canonicalName: s.canonicalName,
      hasScheduleConflict: Boolean(s.hasScheduleConflict),
    })),
    latest: {
      attendance: attendanceRows.map(r => ({
        publicId: r.publicId,
        startsAt: r.startsAt,
        sessionState: r.sessionState || "completed",
        noClassReason: r.noClassReason || null,
        version: 1,
        title: `Session on ${new Date(r.startsAt).toLocaleDateString()}`,
      })),
      announcements: announcementRows.map(r => ({
        publicId: r.publicId,
        title: r.title,
        body: r.body,
        publishedAt: r.publishedAt,
      })),
      resources: resourceRows.map(resource => ({
        publicId: resource.publicId,
        title: resource.title,
        description: resource.description,
        category: resource.category,
        resourceType: resource.resourceType,
        sourceDomain: resource.sourceDomain,
        publishedAt: resource.publishedAt,
        thumbnail: resource.thumbnailUrl ? { url: resource.thumbnailUrl, altText: resource.thumbnailAltText } : null,
      })),
      questions: questionRows.map(q => ({
        publicId: q.publicId,
        title: q.title || q.question || "",
        question: q.question,
        answer: q.answer,
        isOfficial: Boolean(q.isOfficial),
        tagsText: q.tagsText,
        publishedAt: q.publishedAt,
      })),
    },
  };
}

/** Returns only published Q&A data intended for a public Subject-level browse page. */
export async function getPublicQuestionsBySubjectId(publicId: string, query?: string) {
  const db = await getDb();
  if (!db) return null;
  const subjectRows = await db
    .select({ id: subjects.id, publicId: subjects.publicId, name: subjects.name, code: subjects.code, viewOnlyShortMark: subjects.viewOnlyShortMark, viewOnlyName: subjects.viewOnlyName })
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
  return { subject: { publicId: subject.publicId, name: subject.name, code: subject.code, viewOnlyShortMark: subject.viewOnlyShortMark, viewOnlyName: subject.viewOnlyName }, questions };
}

export async function getPublicHistory(entityType: string, entityId: number | string) {
  const appwrite = getAppwriteDb();
  if (appwrite) {
    try {
      const res = await appwrite.databases.listDocuments(
        ENV.appwriteDatabaseHistoryId,
        "historyEntries",
        [
          Query.equal("entityType", entityType),
          Query.equal("entityId", String(entityId)),
          Query.orderAsc("version"),
        ]
      );
      return res.documents.map(doc => ({
        version: (doc.version as number) || 0,
        action: (doc.action as string) || "",
        summary: (doc.publicChangeSummary as string) || "",
        createdAt: new Date(doc.$createdAt),
      }));
    } catch {
      // Fallback
    }
  }
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ version: historyEntries.version, action: historyEntries.action, summary: historyEntries.publicChangeSummary, createdAt: historyEntries.createdAt })
    .from(historyEntries)
    .where(and(eq(historyEntries.entityType, entityType), eq(historyEntries.entityId, typeof entityId === "number" ? entityId : Number(entityId))))
    .orderBy(asc(historyEntries.version));
}

export type PublicContentPayload = {
  kind: "announcement" | "resource" | "question";
  publicId: string;
  title: string;
  body: string;
  version: number;
  publishedAt: Date | null;
  subject: { publicId: string; name: string; code: string; viewOnlyShortMark: string | null; viewOnlyName: string | null; professorName: string };
  destinationUrl?: string;
  category?: string;
  resourceType?: string;
  sourceDomain?: string;
  tagsText?: string | null;
  isOfficial?: boolean;
  media?: { url: string; altText: string | null } | null;
  socialPreviewMedia?: { url: string; altText: string | null } | null;
  attachments?: Array<{ id: number; url: string; originalName: string; mimeType: string; byteSize: number; altText: string | null }>;
};

/** Selects only an explicitly published item and its published subject context. */
export async function getPublicContentItem(kind: PublicContentPayload["kind"], publicId: string): Promise<PublicContentPayload | null> {
  const db = await getDb();
  if (!db) return null;
  const publishedSubject = and(eq(subjects.status, "active"), eq(subjects.publishState, "published"));
  if (kind === "announcement") {
    const rows = await db.select({ publicId: announcements.publicId, title: announcements.title, body: announcements.body, version: announcements.version, publishedAt: announcements.publishedAt, mediaUrl: mediaAssets.servedUrl, mediaAltText: mediaAssets.altText, subjectPublicId: subjects.publicId, subjectName: subjects.name, subjectCode: subjects.code, subjectViewOnlyShortMark: subjects.viewOnlyShortMark, subjectViewOnlyName: subjects.viewOnlyName, professorName: subjects.professorName }).from(announcements).innerJoin(subjects, eq(announcements.subjectId, subjects.id)).leftJoin(mediaAssets, and(eq(announcements.mediaAssetId, mediaAssets.id), eq(mediaAssets.publicUse, true))).where(and(eq(announcements.publicId, publicId), eq(announcements.publishState, "published"), publishedSubject)).limit(1);
    const row = rows[0]; return row ? { kind, publicId: row.publicId, title: row.title, body: row.body, version: row.version, publishedAt: row.publishedAt, media: row.mediaUrl ? { url: row.mediaUrl, altText: row.mediaAltText } : null, subject: { publicId: row.subjectPublicId, name: row.subjectName, code: row.subjectCode, viewOnlyShortMark: row.subjectViewOnlyShortMark, viewOnlyName: row.subjectViewOnlyName, professorName: row.professorName } } : null;
  }
  if (kind === "resource") {
    const rows = await db.select({ id: resources.id, publicId: resources.publicId, title: resources.title, body: resources.description, version: resources.version, publishedAt: resources.publishedAt, destinationUrl: resources.destinationUrl, category: resources.category, resourceType: resources.resourceType, sourceDomain: resources.sourceDomain, mediaUrl: mediaAssets.servedUrl, mediaAltText: mediaAssets.altText, subjectPublicId: subjects.publicId, subjectName: subjects.name, subjectCode: subjects.code, subjectViewOnlyShortMark: subjects.viewOnlyShortMark, subjectViewOnlyName: subjects.viewOnlyName, professorName: subjects.professorName }).from(resources).innerJoin(subjects, eq(resources.subjectId, subjects.id)).leftJoin(mediaAssets, and(eq(resources.fallbackMediaAssetId, mediaAssets.id), eq(mediaAssets.publicUse, true))).where(and(eq(resources.publicId, publicId), eq(resources.publishState, "published"), publishedSubject)).limit(1);
    const row = rows[0];
    if (!row) return null;
    const attachments = await db.select({ id: mediaAssets.id, url: mediaAssets.servedUrl, originalName: mediaAssets.originalName, mimeType: mediaAssets.mimeType, byteSize: mediaAssets.byteSize, altText: mediaAssets.altText }).from(resourceAttachments).innerJoin(mediaAssets, eq(resourceAttachments.mediaAssetId, mediaAssets.id)).where(and(eq(resourceAttachments.resourceId, row.id), eq(mediaAssets.publicUse, true))).orderBy(asc(resourceAttachments.displayOrder));
    return { kind, publicId: row.publicId, title: row.title, body: row.body, version: row.version, publishedAt: row.publishedAt, destinationUrl: row.destinationUrl, category: row.category, resourceType: row.resourceType, sourceDomain: row.sourceDomain, media: row.mediaUrl ? { url: row.mediaUrl, altText: row.mediaAltText } : null, attachments, subject: { publicId: row.subjectPublicId, name: row.subjectName, code: row.subjectCode, viewOnlyShortMark: row.subjectViewOnlyShortMark, viewOnlyName: row.subjectViewOnlyName, professorName: row.professorName } };
  }
  const rows = await db.select({ publicId: questionsAnswers.publicId, title: questionsAnswers.question, body: questionsAnswers.answer, version: questionsAnswers.version, publishedAt: questionsAnswers.publishedAt, tagsText: questionsAnswers.tagsText, isOfficial: questionsAnswers.isOfficial, mediaUrl: mediaAssets.servedUrl, mediaAltText: mediaAssets.altText, subjectPublicId: subjects.publicId, subjectName: subjects.name, subjectCode: subjects.code, subjectViewOnlyShortMark: subjects.viewOnlyShortMark, subjectViewOnlyName: subjects.viewOnlyName, professorName: subjects.professorName }).from(questionsAnswers).innerJoin(subjects, eq(questionsAnswers.subjectId, subjects.id)).leftJoin(mediaAssets, and(eq(questionsAnswers.socialPreviewMediaAssetId, mediaAssets.id), eq(mediaAssets.publicUse, true))).where(and(eq(questionsAnswers.publicId, publicId), eq(questionsAnswers.publishState, "published"), publishedSubject)).limit(1);
  const row = rows[0]; return row ? { kind, publicId: row.publicId, title: `${row.isOfficial ? "Official" : "Unofficial"} answer — ${row.title}`, body: row.body, version: row.version, publishedAt: row.publishedAt, tagsText: row.tagsText, isOfficial: row.isOfficial, socialPreviewMedia: row.mediaUrl ? { url: row.mediaUrl, altText: row.mediaAltText } : null, subject: { publicId: row.subjectPublicId, name: row.subjectName, code: row.subjectCode, viewOnlyShortMark: row.subjectViewOnlyShortMark, viewOnlyName: row.subjectViewOnlyName, professorName: row.professorName } } : null;
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
  subject: { publicId: string; name: string; code: string; viewOnlyShortMark: string | null; viewOnlyName: string | null; professorName: string };
  records: Array<{ canonicalName: string; status: "PRESENT" | "ABSENT" | "EXCUSED" | "CONFLICT" | "NOT_SET" }>;
  history: Awaited<ReturnType<typeof getPublicHistory>>;
  sessionState?: "completed" | "scheduled" | "no_class";
  noClassReason?: string | null;
};

/**
 * An opaque published Attendance link returns only final canonical names, statuses, and public
 * History. Raw Zoom text, normalization candidates, AI suggestions, aliases, and owner data are
 * never selected for an anonymous caller.
 */
export async function getPublicAttendanceById(publicId: string): Promise<PublicAttendancePayload | null> {
  const appwrite = getAppwriteDb();
  if (appwrite) {
    try {
      const sessionRes = await appwrite.databases.listDocuments(appwrite.dbId, "classSessions", [
        Query.equal("publicId", publicId),
        Query.limit(1),
      ]);
      if (sessionRes.documents.length > 0) {
        const sessionDoc: any = sessionRes.documents[0];
        const [subjectDoc, recordsRes, historyRes, studentsRes, subjectStudentsRes] = await Promise.all([
          sessionDoc.subjectId
            ? (appwrite.databases.getDocument(appwrite.dbId, "subjects", sessionDoc.subjectId).catch(() => null) as Promise<any>)
            : Promise.resolve(null),
          appwrite.databases.listDocuments(appwrite.dbId, "attendanceRecords", [
            Query.equal("classSessionId", sessionDoc.$id),
            Query.limit(200),
          ]).catch(() => ({ documents: [] })),
          appwrite.databases.listDocuments(ENV.appwriteDatabaseHistoryId, "historyEntries", [
            Query.equal("entityType", "attendance"),
            Query.equal("entityId", sessionDoc.$id),
            Query.orderAsc("version"),
            Query.limit(50),
          ]).catch(() => ({ documents: [] })),
          appwrite.databases.listDocuments(appwrite.dbId, "students", [
            Query.limit(500),
          ]).catch(() => ({ documents: [] })),
          sessionDoc.subjectId
            ? appwrite.databases.listDocuments(appwrite.dbId, "subjectStudents", [
                Query.equal("subjectId", sessionDoc.subjectId),
                Query.limit(200),
              ]).catch(() => ({ documents: [] }))
            : Promise.resolve({ documents: [] }),
        ]);

        const studentMap = new Map<string, string>();
        for (const s of studentsRes.documents) {
          studentMap.set(s.$id, (s as any).canonicalName || `${(s as any).lastName}, ${(s as any).firstName}`);
        }
        const memberToName = new Map<string, string>();
        for (const m of subjectStudentsRes.documents) {
          const name = studentMap.get((m as any).studentId);
          if (name) memberToName.set(m.$id, name);
        }

        const maxRecVersion = recordsRes.documents.reduce((max: number, r: any) => Math.max(max, r.publishedVersion || 0), 0);
        const historyMaxVersion = historyRes.documents.reduce((max: number, h: any) => Math.max(max, h.version || 0), 0);
        const version = historyMaxVersion || maxRecVersion || (sessionDoc.version as number) || 1;

        const history = historyRes.documents.map((doc: any) => ({
          version: doc.version || 1,
          action: doc.action || "published",
          summary: doc.publicChangeSummary || "Attendance updated",
          createdAt: new Date(doc.$createdAt),
        }));

        const records = recordsRes.documents
          .filter((r: any) => r.publishState === "published")
          .map((r: any) => ({
            canonicalName: memberToName.get(r.subjectStudentId) || r.canonicalName || "Student",
            status: (r.attendanceStatus?.toUpperCase() as any) || "NOT_SET",
          }))
          .sort(compareByLastNameAsc);

        return {
          publicId: sessionDoc.publicId,
          startsAt: new Date(sessionDoc.startsAt),
          version,
          sessionState: sessionDoc.sessionState || "completed",
          noClassReason: sessionDoc.noClassReason || null,
          subject: subjectDoc ? {
            publicId: subjectDoc.publicId,
            name: subjectDoc.name,
            code: subjectDoc.code,
            viewOnlyShortMark: subjectDoc.viewOnlyShortMark,
            viewOnlyName: subjectDoc.viewOnlyName,
            professorName: subjectDoc.professorName,
          } : { publicId: "", name: "Class", code: "SUBJ", viewOnlyShortMark: null, viewOnlyName: null, professorName: "Professor" },
          records,
          history,
        };
      }
    } catch (err) {
      console.warn("[Appwrite DB] getPublicAttendanceById error:", err);
    }
  }

  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      id: classSessions.id,
      publicId: classSessions.publicId,
      startsAt: classSessions.startsAt,
      sessionState: classSessions.sessionState,
      noClassReason: classSessions.noClassReason,
      version: attendanceRecords.publishedVersion,
      subjectPublicId: subjects.publicId,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      subjectViewOnlyShortMark: subjects.viewOnlyShortMark,
      subjectViewOnlyName: subjects.viewOnlyName,
      professorName: subjects.professorName,
    })
    .from(classSessions)
    .innerJoin(subjects, eq(classSessions.subjectId, subjects.id))
    .leftJoin(attendanceRecords, eq(attendanceRecords.classSessionId, classSessions.id))
    .where(and(eq(classSessions.publicId, publicId), inArray(classSessions.sessionState, ["completed", "no_class", "scheduled"]), eq(classSessions.publishState, "published"), eq(subjects.status, "active")))
    .orderBy(asc(attendanceRecords.id))
    .limit(1);
  const session = rows[0];
  if (!session) return null;
  const records = await db
    .select({ canonicalName: students.canonicalName, status: attendanceRecords.attendanceStatus, publishedVersion: attendanceRecords.publishedVersion })
    .from(attendanceRecords)
    .innerJoin(subjectStudents, eq(attendanceRecords.subjectStudentId, subjectStudents.id))
    .innerJoin(students, eq(subjectStudents.studentId, students.id))
    .where(and(eq(attendanceRecords.classSessionId, session.id), eq(attendanceRecords.publishState, "published")))
    .orderBy(asc(students.lastName), asc(students.firstName));
  const history = await getPublicHistory("attendance", session.id);
  const maxVersionFromRecords = records.reduce((max, r) => Math.max(max, r.publishedVersion || 0), 0);
  const latestVersion = (history[history.length - 1]?.version as number) || maxVersionFromRecords || session.version || 1;
  return {
    publicId: session.publicId,
    startsAt: session.startsAt,
    version: latestVersion,
    sessionState: session.sessionState || "completed",
    noClassReason: session.noClassReason || null,
    subject: { publicId: session.subjectPublicId, name: session.subjectName, code: session.subjectCode, viewOnlyShortMark: session.subjectViewOnlyShortMark, viewOnlyName: session.subjectViewOnlyName, professorName: session.professorName },
    records: records.map(r => ({ canonicalName: r.canonicalName, status: r.status })),
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
  totals?: { present: number; absent: number; excused: number; conflict?: number; notSet: number };
  subjects?: Array<{ subjectName: string; subjectCode: string; present: number; absent: number; excused: number; notSet: number }>;
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
    const totals = rows.reduce((result, row) => { if (row.status === "PRESENT") result.present += 1; else if (row.status === "ABSENT") result.absent += 1; else if (row.status === "EXCUSED") result.excused += 1; else result.notSet += 1; return result; }, { present: 0, absent: 0, excused: 0, notSet: 0 });
    return { publicId, reportType: "class_attendance", version: report.version, publishedAt: report.publishedAt, title: `${rows[0].subjectName} Attendance`, startsAt: rows[0].startsAt, totals };
  }
  const rows = await db.select({ subjectId: subjects.id, subjectName: subjects.name, subjectCode: subjects.code, status: attendanceRecords.attendanceStatus }).from(subjects).leftJoin(subjectStudents, and(eq(subjectStudents.subjectId, subjects.id), eq(subjectStudents.membershipState, "active"))).leftJoin(attendanceRecords, eq(attendanceRecords.subjectStudentId, subjectStudents.id)).where(and(eq(subjects.ownerId, report.ownerId), eq(subjects.status, "active")));
  const grouped = new Map<number, { subjectName: string; subjectCode: string; present: number; absent: number; excused: number; notSet: number }>();
  for (const row of rows) { const current = grouped.get(row.subjectId) ?? { subjectName: row.subjectName, subjectCode: row.subjectCode, present: 0, absent: 0, excused: 0, notSet: 0 }; if (row.status === "PRESENT") current.present += 1; else if (row.status === "ABSENT") current.absent += 1; else if (row.status === "EXCUSED") current.excused += 1; else current.notSet += 1; grouped.set(row.subjectId, current); }
  return { publicId, reportType: "all_subject_attendance", version: report.version, publishedAt: report.publishedAt, title: "All Subject Attendance", subjects: Array.from(grouped.values()) };
}

export async function createPublicHistoryEntry(input: {
  entityType: string;
  entityId: number | string;
  version: number;
  action: string;
  publicChangeSummary: string;
  actorUserId: number | string;
}) {
  const appwrite = getAppwriteDb();
  if (appwrite) {
    try {
      await appwrite.databases.createDocument(
        ENV.appwriteDatabaseHistoryId,
        "historyEntries",
        ID.unique(),
        {
          entityType: input.entityType,
          entityId: String(input.entityId),
          version: input.version,
          action: input.action,
          publicChangeSummary: input.publicChangeSummary,
          actorUserId: String(input.actorUserId),
        }
      );
      return;
    } catch (error) {
      console.warn("[Appwrite DB] createPublicHistoryEntry error:", error);
    }
  }

  const db = await getDb();
  if (!db) return;
  await db.insert(historyEntries).values({
    ...input,
    entityId: typeof input.entityId === "number" ? input.entityId : Number(input.entityId),
    actorUserId: typeof input.actorUserId === "number" ? input.actorUserId : Number(input.actorUserId),
  });
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

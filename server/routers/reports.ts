import { and, asc, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { attendanceRecords, classSessions, reports, students, subjectStudents, subjects } from "../../drizzle/schema";
import { getDb } from "../db";
import { router } from "../_core/trpc";
import { ownerProcedure } from "./guards";

async function databaseOrThrow() { const database = await getDb(); if (!database) throw new Error("Database is not available"); return database; }

export const reportsRouter = router({
  classAttendance: ownerProcedure.input(z.object({ sessionId: z.union([z.string(), z.number()]) })).query(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    const sessionIdNum = Number(input.sessionId);
    const sessionRows = await db.select({ sessionId: classSessions.id, subjectId: classSessions.subjectId, startsAt: classSessions.startsAt, subjectName: subjects.name, subjectCode: subjects.code }).from(classSessions).innerJoin(subjects, eq(classSessions.subjectId, subjects.id)).where(and(eq(classSessions.id, sessionIdNum), eq(subjects.ownerId, ctx.user.id))).limit(1);
    const session = sessionRows[0]; if (!session) throw new Error("Class session not found");
    const rows = await db.select({ canonicalName: students.canonicalName, status: attendanceRecords.attendanceStatus, excuseReason: attendanceRecords.excuseReason, hasScheduleConflict: subjectStudents.hasScheduleConflict }).from(subjectStudents).innerJoin(students, eq(subjectStudents.studentId, students.id)).leftJoin(attendanceRecords, and(eq(attendanceRecords.subjectStudentId, subjectStudents.id), eq(attendanceRecords.classSessionId, session.sessionId))).where(and(eq(subjectStudents.subjectId, session.subjectId), eq(subjectStudents.membershipState, "active"))).orderBy(asc(students.canonicalName));
    const roster = rows.map(row => ({ canonicalName: row.canonicalName, status: (row.status ?? "NOT_SET") as "PRESENT" | "ABSENT" | "EXCUSED" | "CONFLICT" | "NOT_SET", excuseReason: row.excuseReason ?? null, hasScheduleConflict: Boolean(row.hasScheduleConflict) }));
    const totals = roster.reduce((result, row) => { if (row.status === "PRESENT") result.present += 1; else if (row.status === "ABSENT") result.absent += 1; else if (row.status === "EXCUSED") result.excused += 1; else if (row.status === "CONFLICT") result.conflict += 1; else result.notSet += 1; return result; }, { present: 0, absent: 0, excused: 0, conflict: 0, notSet: 0 });
    return { sessionId: session.sessionId, startsAt: session.startsAt, subjectName: session.subjectName, subjectCode: session.subjectCode, students: roster, ...totals };
  }),
  allSubjectAttendance: ownerProcedure.query(async ({ ctx }) => {
    const db = await databaseOrThrow(); const rows = await db.select({ subjectId: subjects.id, subjectName: subjects.name, subjectCode: subjects.code, status: attendanceRecords.attendanceStatus }).from(subjects).leftJoin(subjectStudents, and(eq(subjectStudents.subjectId, subjects.id), eq(subjectStudents.membershipState, "active"))).leftJoin(attendanceRecords, eq(attendanceRecords.subjectStudentId, subjectStudents.id)).where(and(eq(subjects.ownerId, ctx.user.id), eq(subjects.status, "active"))); const bySubject = new Map<number, { subjectId: number; subjectName: string; subjectCode: string; present: number; absent: number; excused: number; conflict: number; notSet: number }>(); for (const row of rows) { const current = bySubject.get(row.subjectId) ?? { subjectId: row.subjectId, subjectName: row.subjectName, subjectCode: row.subjectCode, present: 0, absent: 0, excused: 0, conflict: 0, notSet: 0 }; if (row.status === "PRESENT") current.present += 1; else if (row.status === "ABSENT") current.absent += 1; else if (row.status === "EXCUSED") current.excused += 1; else if (row.status === "CONFLICT") current.conflict += 1; else current.notSet += 1; bySubject.set(row.subjectId, current); } return Array.from(bySubject.values());
  }),
  list: ownerProcedure.query(async ({ ctx }) => { const db = await databaseOrThrow(); return db.select({ id: reports.id, publicId: reports.publicId, reportType: reports.reportType, subjectId: reports.subjectId, classSessionId: reports.classSessionId, publishState: reports.publishState, version: reports.version, generatedAt: reports.generatedAt, publishedAt: reports.publishedAt, subjectName: subjects.name, subjectCode: subjects.code, sessionStartsAt: classSessions.startsAt }).from(reports).leftJoin(subjects, eq(reports.subjectId, subjects.id)).leftJoin(classSessions, eq(reports.classSessionId, classSessions.id)).where(eq(reports.ownerId, ctx.user.id)).orderBy(desc(reports.updatedAt)); }),
  create: ownerProcedure.input(z.object({ reportType: z.enum(["class_attendance", "all_subject_attendance"]), subjectId: z.union([z.string(), z.number()]).nullable().optional(), classSessionId: z.union([z.string(), z.number()]).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    const classSessionIdNum = input.classSessionId ? Number(input.classSessionId) : null;
    let subjectIdNum = input.subjectId ? Number(input.subjectId) : null;

    if (input.reportType === "class_attendance" && !classSessionIdNum) throw new Error("A class Attendance report requires a session");
    if (classSessionIdNum) {
      const session = await db.select({ subjectId: classSessions.subjectId }).from(classSessions).innerJoin(subjects, eq(classSessions.subjectId, subjects.id)).where(and(eq(classSessions.id, classSessionIdNum), eq(subjects.ownerId, ctx.user.id))).limit(1);
      if (!session[0]) throw new Error("Class session not found");
      if (subjectIdNum && subjectIdNum !== session[0].subjectId) throw new Error("Report Subject does not match its class session");
      subjectIdNum = session[0].subjectId;
    } else if (subjectIdNum) {
      const subject = await db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, subjectIdNum), eq(subjects.ownerId, ctx.user.id))).limit(1);
      if (!subject[0]) throw new Error("Subject not found");
    }
    const [row] = await db.insert(reports).values({ ownerId: ctx.user.id, publicId: nanoid(12), reportType: input.reportType, subjectId: subjectIdNum, classSessionId: classSessionIdNum }).$returningId(); return { id: row.id };
  }),
  publish: ownerProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).mutation(async ({ ctx, input }) => { const db = await databaseOrThrow(); const idNum = Number(input.id); const row = await db.select({ id: reports.id, version: reports.version }).from(reports).where(and(eq(reports.id, idNum), eq(reports.ownerId, ctx.user.id))).limit(1); if (!row[0]) throw new Error("Report not found"); const version = row[0].version + 1; await db.update(reports).set({ publishState: "published", version, publishedAt: new Date() }).where(eq(reports.id, idNum)); return { version }; }),
  archive: ownerProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).mutation(async ({ ctx, input }) => { const db = await databaseOrThrow(); const idNum = Number(input.id); const row = await db.select({ id: reports.id }).from(reports).where(and(eq(reports.id, idNum), eq(reports.ownerId, ctx.user.id))).limit(1); if (!row[0]) throw new Error("Report not found"); await db.update(reports).set({ publishState: "archived" }).where(eq(reports.id, idNum)); return { success: true as const }; }),
  restore: ownerProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).mutation(async ({ ctx, input }) => { const db = await databaseOrThrow(); const idNum = Number(input.id); const row = await db.select({ id: reports.id }).from(reports).where(and(eq(reports.id, idNum), eq(reports.ownerId, ctx.user.id))).limit(1); if (!row[0]) throw new Error("Report not found"); await db.update(reports).set({ publishState: "draft" }).where(eq(reports.id, idNum)); return { success: true as const }; }),
});

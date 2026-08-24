import { and, asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { attendanceRecords, classSessions, reports, subjectStudents, subjects } from "../../drizzle/schema";
import { getDb } from "../db";
import { router } from "../_core/trpc";
import { ownerProcedure } from "./guards";

async function databaseOrThrow() { const database = await getDb(); if (!database) throw new Error("Database is not available"); return database; }

export const reportsRouter = router({
  classAttendance: ownerProcedure.input(z.object({ sessionId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    const rows = await db.select({ sessionId: classSessions.id, startsAt: classSessions.startsAt, subjectName: subjects.name, subjectCode: subjects.code, status: attendanceRecords.attendanceStatus }).from(classSessions).innerJoin(subjects, eq(classSessions.subjectId, subjects.id)).leftJoin(attendanceRecords, eq(attendanceRecords.classSessionId, classSessions.id)).where(and(eq(classSessions.id, input.sessionId), eq(subjects.ownerId, ctx.user.id))).orderBy(asc(attendanceRecords.id));
    if (!rows[0]) throw new Error("Class session not found");
    const totals = rows.reduce((result, row) => { if (row.status === "PRESENT") result.present += 1; else if (row.status === "ABSENT") result.absent += 1; else result.notSet += 1; return result; }, { present: 0, absent: 0, notSet: 0 });
    return { sessionId: rows[0].sessionId, startsAt: rows[0].startsAt, subjectName: rows[0].subjectName, subjectCode: rows[0].subjectCode, ...totals };
  }),
  allSubjectAttendance: ownerProcedure.query(async ({ ctx }) => {
    const db = await databaseOrThrow();
    const rows = await db.select({ subjectId: subjects.id, subjectName: subjects.name, subjectCode: subjects.code, status: attendanceRecords.attendanceStatus }).from(subjects).leftJoin(subjectStudents, and(eq(subjectStudents.subjectId, subjects.id), eq(subjectStudents.membershipState, "active"))).leftJoin(attendanceRecords, eq(attendanceRecords.subjectStudentId, subjectStudents.id)).where(and(eq(subjects.ownerId, ctx.user.id), eq(subjects.status, "active")));
    const bySubject = new Map<number, { subjectId: number; subjectName: string; subjectCode: string; present: number; absent: number; notSet: number }>();
    for (const row of rows) { const current = bySubject.get(row.subjectId) ?? { subjectId: row.subjectId, subjectName: row.subjectName, subjectCode: row.subjectCode, present: 0, absent: 0, notSet: 0 }; if (row.status === "PRESENT") current.present += 1; else if (row.status === "ABSENT") current.absent += 1; else current.notSet += 1; bySubject.set(row.subjectId, current); }
    return Array.from(bySubject.values());
  }),
  create: ownerProcedure.input(z.object({ reportType: z.enum(["class_attendance", "all_subject_attendance"]), subjectId: z.number().int().positive().nullable(), classSessionId: z.number().int().positive().nullable() })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    if (input.reportType === "class_attendance" && !input.classSessionId) throw new Error("A class Attendance report requires a session");
    if (input.classSessionId) {
      const session = await db.select({ subjectId: classSessions.subjectId }).from(classSessions).innerJoin(subjects, eq(classSessions.subjectId, subjects.id)).where(and(eq(classSessions.id, input.classSessionId), eq(subjects.ownerId, ctx.user.id))).limit(1);
      if (!session[0]) throw new Error("Class session not found");
      if (input.subjectId && input.subjectId !== session[0].subjectId) throw new Error("Report Subject does not match its class session");
      input.subjectId = session[0].subjectId;
    } else if (input.subjectId) {
      const subject = await db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, input.subjectId), eq(subjects.ownerId, ctx.user.id))).limit(1);
      if (!subject[0]) throw new Error("Subject not found");
    }
    const [row] = await db.insert(reports).values({ publicId: nanoid(12), reportType: input.reportType, subjectId: input.subjectId, classSessionId: input.classSessionId }).$returningId();
    return { id: row.id };
  }),
});

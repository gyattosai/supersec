import { and, asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { classSessions, historyEntries, subjectMeetingDays, subjectStudents, subjects, students } from "../../drizzle/schema";
import { getDb } from "../db";
import { router } from "../_core/trpc";
import { ownerProcedure } from "./guards";

const meetingDayInput = z.object({ weekday: z.number().int().min(0).max(6), startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(), endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional() });
const subjectInput = z.object({
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().min(2).max(64),
  professorName: z.string().trim().min(2).max(160),
  termName: z.string().trim().max(120).nullable().optional(),
  meetingDays: z.array(meetingDayInput).min(1).max(7),
});

async function databaseOrThrow() {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database;
}

async function meetingDaysFor(database: Awaited<ReturnType<typeof databaseOrThrow>>, subjectId: number) {
  return database
    .select({ id: subjectMeetingDays.id, weekday: subjectMeetingDays.weekday, startTime: subjectMeetingDays.startTime, endTime: subjectMeetingDays.endTime, sortOrder: subjectMeetingDays.sortOrder })
    .from(subjectMeetingDays)
    .where(eq(subjectMeetingDays.subjectId, subjectId))
    .orderBy(asc(subjectMeetingDays.weekday), asc(subjectMeetingDays.sortOrder));
}

async function ownerSubject(database: Awaited<ReturnType<typeof databaseOrThrow>>, ownerId: number, subjectId: number) {
  const result = await database.select().from(subjects).where(and(eq(subjects.id, subjectId), eq(subjects.ownerId, ownerId))).limit(1);
  if (!result[0]) throw new Error("Subject not found");
  return result[0];
}

export const subjectsRouter = router({
  list: ownerProcedure.query(async ({ ctx }) => {
    const database = await databaseOrThrow();
    const rows = await database.select().from(subjects).where(eq(subjects.ownerId, ctx.user.id)).orderBy(asc(subjects.status), asc(subjects.name));
    return Promise.all(rows.map(async subject => ({ ...subject, meetingDays: await meetingDaysFor(database, subject.id) })));
  }),
  get: ownerProcedure.input(z.object({ subjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const database = await databaseOrThrow();
    const subject = await ownerSubject(database, ctx.user.id, input.subjectId);
    return { ...subject, meetingDays: await meetingDaysFor(database, subject.id) };
  }),
  create: ownerProcedure.input(subjectInput).mutation(async ({ ctx, input }) => {
    const database = await databaseOrThrow();
    const publicId = nanoid(12);
    const [created] = await database.insert(subjects).values({
      ownerId: ctx.user.id,
      publicId,
      name: input.name,
      code: input.code,
      professorName: input.professorName,
      termName: input.termName ?? null,
      status: "active",
      publishState: "draft",
    }).$returningId();
    await database.insert(subjectMeetingDays).values(input.meetingDays.map((day, sortOrder) => ({ subjectId: created.id, weekday: day.weekday, startTime: day.startTime ?? null, endTime: day.endTime ?? null, sortOrder })));
    return { id: created.id, publicId };
  }),
  update: ownerProcedure.input(z.object({ subjectId: z.number().int().positive(), ...subjectInput.shape })).mutation(async ({ ctx, input }) => {
    const database = await databaseOrThrow();
    await ownerSubject(database, ctx.user.id, input.subjectId);
    await database.update(subjects).set({ name: input.name, code: input.code, professorName: input.professorName, termName: input.termName ?? null }).where(eq(subjects.id, input.subjectId));
    await database.delete(subjectMeetingDays).where(eq(subjectMeetingDays.subjectId, input.subjectId));
    await database.insert(subjectMeetingDays).values(input.meetingDays.map((day, sortOrder) => ({ subjectId: input.subjectId, weekday: day.weekday, startTime: day.startTime ?? null, endTime: day.endTime ?? null, sortOrder })));
    return { success: true as const };
  }),
  publish: ownerProcedure.input(z.object({ subjectId: z.number().int().positive(), publish: z.boolean() })).mutation(async ({ ctx, input }) => {
    const database = await databaseOrThrow();
    await ownerSubject(database, ctx.user.id, input.subjectId);
    await database.update(subjects).set({ publishState: input.publish ? "published" : "draft" }).where(eq(subjects.id, input.subjectId));
    if (input.publish) {
      const version = (await database.select({ id: historyEntries.id }).from(historyEntries).where(and(eq(historyEntries.entityType, "subject"), eq(historyEntries.entityId, input.subjectId)))).length + 1;
      await database.insert(historyEntries).values({ entityType: "subject", entityId: input.subjectId, version, action: "published", publicChangeSummary: "Subject information was published.", actorUserId: ctx.user.id });
    }
    return { success: true as const };
  }),
  archive: ownerProcedure.input(z.object({ subjectId: z.number().int().positive(), archive: z.boolean() })).mutation(async ({ ctx, input }) => {
    const database = await databaseOrThrow();
    await ownerSubject(database, ctx.user.id, input.subjectId);
    await database.update(subjects).set({ status: input.archive ? "archived" : "active", archivedAt: input.archive ? new Date() : null }).where(eq(subjects.id, input.subjectId));
    return { success: true as const };
  }),
  students: router({
    list: ownerProcedure.input(z.object({ subjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const database = await databaseOrThrow();
      await ownerSubject(database, ctx.user.id, input.subjectId);
      return database.select({ membershipId: subjectStudents.id, state: subjectStudents.membershipState, displayOrder: subjectStudents.displayOrder, studentId: students.id, canonicalName: students.canonicalName, aliasesText: students.aliasesText }).from(subjectStudents).innerJoin(students, eq(subjectStudents.studentId, students.id)).where(eq(subjectStudents.subjectId, input.subjectId)).orderBy(asc(subjectStudents.displayOrder), asc(students.canonicalName));
    }),
    add: ownerProcedure.input(z.object({ subjectId: z.number().int().positive(), canonicalName: z.string().trim().min(3).max(255), aliasesText: z.string().max(1000).nullable().optional() })).mutation(async ({ ctx, input }) => {
      const database = await databaseOrThrow();
      await ownerSubject(database, ctx.user.id, input.subjectId);
      const existing = await database.select().from(students).where(and(eq(students.ownerId, ctx.user.id), eq(students.canonicalName, input.canonicalName))).limit(1);
      const student = existing[0] ?? (await database.insert(students).values({ ownerId: ctx.user.id, canonicalName: input.canonicalName, aliasesText: input.aliasesText ?? null }).$returningId()).map(row => ({ id: row.id }))[0];
      await database.insert(subjectStudents).values({ subjectId: input.subjectId, studentId: student.id, membershipState: "active" }).onDuplicateKeyUpdate({ set: { membershipState: "active", removedAt: null } });
      return { success: true as const };
    }),
    remove: ownerProcedure.input(z.object({ membershipId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const database = await databaseOrThrow();
      const membership = await database.select({ id: subjectStudents.id, subjectId: subjectStudents.subjectId }).from(subjectStudents).where(eq(subjectStudents.id, input.membershipId)).limit(1);
      if (!membership[0]) throw new Error("Student membership not found");
      await ownerSubject(database, ctx.user.id, membership[0].subjectId);
      await database.update(subjectStudents).set({ membershipState: "removed", removedAt: new Date() }).where(eq(subjectStudents.id, input.membershipId));
      return { success: true as const };
    }),
  }),
  sessions: router({
    list: ownerProcedure.input(z.object({ subjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const database = await databaseOrThrow();
      await ownerSubject(database, ctx.user.id, input.subjectId);
      return database.select().from(classSessions).where(eq(classSessions.subjectId, input.subjectId)).orderBy(asc(classSessions.startsAt));
    }),
    create: ownerProcedure.input(z.object({ subjectId: z.number().int().positive(), startsAt: z.coerce.date() })).mutation(async ({ ctx, input }) => {
      const database = await databaseOrThrow();
      await ownerSubject(database, ctx.user.id, input.subjectId);
      const [created] = await database.insert(classSessions).values({ subjectId: input.subjectId, startsAt: input.startsAt, sessionState: "scheduled", publishState: "draft" }).$returningId();
      return { id: created.id };
    }),
    setNoClass: ownerProcedure.input(z.object({ sessionId: z.number().int().positive(), noClass: z.boolean(), reason: z.string().trim().max(255).nullable().optional(), publish: z.boolean().default(true) })).mutation(async ({ ctx, input }) => {
      const database = await databaseOrThrow();
      const session = await database.select().from(classSessions).where(eq(classSessions.id, input.sessionId)).limit(1);
      if (!session[0]) throw new Error("Class session not found");
      await ownerSubject(database, ctx.user.id, session[0].subjectId);
      await database.update(classSessions).set({ sessionState: input.noClass ? "no_class" : "scheduled", noClassReason: input.noClass ? (input.reason ?? "No Class") : null, publishState: input.publish ? "published" : "draft" }).where(eq(classSessions.id, input.sessionId));
      return { success: true as const };
    }),
  }),
});

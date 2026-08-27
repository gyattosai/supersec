import { and, asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { classSessions, historyEntries, subjectMeetingDays, subjectStudents, subjects, students } from "../../drizzle/schema";
import { getDb } from "../db";
import { router } from "../_core/trpc";
import { ownerProcedure } from "./guards";
import { invokeLLM } from "../_core/llm";

const meetingDayInput = z.object({ weekday: z.number().int().min(0).max(6), startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(), endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional() });
const subjectInput = z.object({
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().min(2).max(64),
  viewOnlyShortMark: z.string().trim().min(1).max(16).nullable().optional(),
  viewOnlyName: z.string().trim().min(2).max(80).nullable().optional(),
  professorName: z.string().trim().min(2).max(160),
  termName: z.string().trim().max(120).nullable().optional(),
  meetingDays: z.array(meetingDayInput).min(1).max(7),
});

export type StudentNameInput = { firstName: string; middleName: string; lastName: string; privateNotes?: string | null };
const studentNameInput = z.object({ firstName: z.string().trim().min(1).max(120), middleName: z.string().trim().max(120).optional().default(""), lastName: z.string().trim().min(1).max(120), privateNotes: z.string().trim().max(8000).nullable().optional() });

function normalizeStudentNamePart(value: string) { return value.trim().replace(/\s+/g, " "); }
function removeSectionPrefix(value: string) { return normalizeStudentNamePart(value).replace(/^[A-Z]{2,10}\d{0,6}_/i, ""); }
export function studentDisplayName({ firstName, middleName, lastName }: StudentNameInput) { return `${normalizeStudentNamePart(lastName)}, ${normalizeStudentNamePart(firstName)}${normalizeStudentNamePart(middleName) ? ` ${normalizeStudentNamePart(middleName)}` : ""}`; }
export function studentNameKey({ firstName, middleName, lastName }: StudentNameInput) { return [lastName, firstName, middleName].map(value => normalizeStudentNamePart(value).toLocaleUpperCase()).join("|"); }

function splitDelimitedLine(line: string) {
  const delimiter = line.includes("\t") ? "\t" : ",";
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { cells.push(normalizeStudentNamePart(value)); value = ""; }
    else value += char;
  }
  cells.push(normalizeStudentNamePart(value));
  return cells;
}

function fromSingleName(value: string): StudentNameInput | null {
  const [rawLast, rawRest] = value.split(/,(.+)/).map(part => normalizeStudentNamePart(part));
  if (!rawLast || !rawRest) return null;
  const [firstName = "", ...middleParts] = rawRest.split(/\s+/);
  const lastName = removeSectionPrefix(rawLast);
  return firstName && lastName ? { firstName, middleName: middleParts.join(" "), lastName } : null;
}

export function parseStudentImportText(value: string) {
  const rows = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean).slice(0, 250);
  const candidates: StudentNameInput[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  const firstCells = rows[0] ? splitDelimitedLine(rows[0]) : [];
  const header = firstCells.map(cell => cell.toLocaleLowerCase().replace(/[^a-z]/g, ""));
  const hasHeader = header.some(cell => ["firstname", "middlename", "lastname", "surname"].includes(cell));
  const headerIndex = (names: string[]) => header.findIndex(cell => names.includes(cell));
  const firstIndex = headerIndex(["firstname", "givenname", "first"]);
  const middleIndex = headerIndex(["middlename", "middle"]);
  const lastIndex = headerIndex(["lastname", "surname", "last"]);
  for (let index = 0; index < rows.length; index += 1) {
    const line = rows[index];
    if (hasHeader && index === 0) continue;
    const cells = splitDelimitedLine(line);
    const candidate = hasHeader
      ? { firstName: firstIndex >= 0 ? cells[firstIndex] ?? "" : "", middleName: middleIndex >= 0 ? cells[middleIndex] ?? "" : "", lastName: lastIndex >= 0 ? removeSectionPrefix(cells[lastIndex] ?? "") : "" }
      : cells.length >= 2
        ? (() => { const [firstName = "", ...middleParts] = normalizeStudentNamePart(cells[1] ?? "").split(/\s+/); return { firstName, middleName: cells[2] ?? middleParts.join(" "), lastName: removeSectionPrefix(cells[0] ?? "") }; })()
        : fromSingleName(line);
    if (!candidate || !candidate.firstName || !candidate.lastName || candidate.firstName.length > 120 || candidate.middleName.length > 120 || candidate.lastName.length > 120) {
      skipped += 1;
      continue;
    }
    const normalized: StudentNameInput = { firstName: normalizeStudentNamePart(candidate.firstName), middleName: normalizeStudentNamePart(candidate.middleName), lastName: normalizeStudentNamePart(candidate.lastName) };
    const key = studentNameKey(normalized);
    if (seen.has(key)) { skipped += 1; continue; }
    seen.add(key);
    candidates.push(normalized);
  }
  return { candidates, skipped, sourceRows: rows.length };
}

/** Legacy test helper preserved while structured import callers use parseStudentImportText. */
export function parseBulkStudentNames(value: string) {
  const parsed = parseStudentImportText(value);
  return { names: parsed.candidates.map(studentDisplayName), skipped: parsed.skipped };
}

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
      viewOnlyShortMark: input.viewOnlyShortMark ?? null,
      viewOnlyName: input.viewOnlyName ?? null,
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
    await database.update(subjects).set({ name: input.name, code: input.code, viewOnlyShortMark: input.viewOnlyShortMark ?? null, viewOnlyName: input.viewOnlyName ?? null, professorName: input.professorName, termName: input.termName ?? null }).where(eq(subjects.id, input.subjectId));
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
      return database.select({ membershipId: subjectStudents.id, state: subjectStudents.membershipState, hasScheduleConflict: subjectStudents.hasScheduleConflict, displayOrder: subjectStudents.displayOrder, studentId: students.id, canonicalName: students.canonicalName, firstName: students.firstName, middleName: students.middleName, lastName: students.lastName, privateNotes: students.privateNotes, aliasesText: students.aliasesText }).from(subjectStudents).innerJoin(students, eq(subjectStudents.studentId, students.id)).where(eq(subjectStudents.subjectId, input.subjectId)).orderBy(asc(students.lastName), asc(students.firstName), asc(students.middleName), asc(subjectStudents.displayOrder));
    }),
    add: ownerProcedure.input(z.union([z.object({ subjectId: z.number().int().positive(), student: studentNameInput }), z.object({ subjectId: z.number().int().positive(), canonicalName: z.string().trim().min(3).max(255) })])).mutation(async ({ ctx, input }) => {
      const database = await databaseOrThrow();
      await ownerSubject(database, ctx.user.id, input.subjectId);
      const legacyCandidate = "canonicalName" in input ? fromSingleName(input.canonicalName) : null;
      const candidate = "student" in input ? { ...input.student, privateNotes: input.student.privateNotes?.trim() || null } : legacyCandidate;
      if (!candidate) throw new Error("Use separate first and last name fields for this Student");
      const existing = await database.select({ id: students.id, firstName: students.firstName, middleName: students.middleName, lastName: students.lastName }).from(students).where(eq(students.ownerId, ctx.user.id));
      const student = existing.find(item => studentNameKey(item) === studentNameKey(candidate)) ?? (await database.insert(students).values({ ownerId: ctx.user.id, canonicalName: studentDisplayName(candidate), firstName: candidate.firstName, middleName: candidate.middleName, lastName: candidate.lastName, privateNotes: candidate.privateNotes, aliasesText: null }).$returningId()).map(row => ({ id: row.id }))[0];
      await database.insert(subjectStudents).values({ subjectId: input.subjectId, studentId: student.id, membershipState: "active" }).onDuplicateKeyUpdate({ set: { membershipState: "active", removedAt: null } });
      return { success: true as const };
    }),
    reviewBulkImport: ownerProcedure.input(z.object({ sourceText: z.string().trim().min(1).max(12000) })).mutation(async ({ input }) => {
      const parsed = parseStudentImportText(input.sourceText);
      try {
        const result = await invokeLLM({ model: "gpt-5-mini", maxTokens: 3000, messages: [{ role: "system", content: "Extract a student roster from pasted text. Return only firstName, middleName, and lastName for rows that clearly identify a person. Remove class or section codes from lastName. Do not invent names or notes. This is a private secretary review; output remains advisory." }, { role: "user", content: input.sourceText }], outputSchema: { name: "student_import_review", strict: true, schema: { type: "object", properties: { students: { type: "array", items: { type: "object", properties: { firstName: { type: "string" }, middleName: { type: "string" }, lastName: { type: "string" } }, required: ["firstName", "middleName", "lastName"], additionalProperties: false } } }, required: ["students"], additionalProperties: false } } });
        const content = result.choices[0]?.message.content;
        const aiStudents = typeof content === "string" ? JSON.parse(content) as { students: StudentNameInput[] } : null;
        if (aiStudents?.students?.length) {
          const cleaned = aiStudents.students.slice(0, 250).map(student => ({ firstName: normalizeStudentNamePart(student.firstName), middleName: normalizeStudentNamePart(student.middleName), lastName: removeSectionPrefix(student.lastName) })).filter(student => student.firstName && student.lastName && student.firstName.length <= 120 && student.middleName.length <= 120 && student.lastName.length <= 120);
          const deduped = Array.from(new Map(cleaned.map(student => [studentNameKey(student), student])).values());
          return { candidates: deduped, skipped: Math.max(0, parsed.sourceRows - deduped.length), sourceRows: parsed.sourceRows, aiUsed: true as const };
        }
      } catch { /* Deterministic parsing keeps private intake usable if the advisory service is unavailable. */ }
      return { ...parsed, aiUsed: false as const };
    }),
    addBulk: ownerProcedure.input(z.union([z.object({ subjectId: z.number().int().positive(), students: z.array(studentNameInput).min(1).max(250) }), z.object({ subjectId: z.number().int().positive(), namesText: z.string().trim().min(1).max(12000) })])).mutation(async ({ ctx, input }) => {
      const database = await databaseOrThrow();
      await ownerSubject(database, ctx.user.id, input.subjectId);
      const importStudents = "students" in input ? input.students : parseStudentImportText(input.namesText).candidates;
      const ownerStudents = await database.select({ id: students.id, firstName: students.firstName, middleName: students.middleName, lastName: students.lastName }).from(students).where(eq(students.ownerId, ctx.user.id));
      const studentByName = new Map(ownerStudents.map(student => [studentNameKey(student), student]));
      let added = 0;
      let reactivated = 0;
      let skipped = 0;
      for (const candidate of importStudents) {
        const key = studentNameKey(candidate);
        let student = studentByName.get(key);
        if (!student) {
          const [created] = await database.insert(students).values({ ownerId: ctx.user.id, canonicalName: studentDisplayName(candidate), firstName: candidate.firstName, middleName: candidate.middleName, lastName: candidate.lastName, privateNotes: candidate.privateNotes?.trim() || null, aliasesText: null }).$returningId();
          student = { id: created.id, firstName: candidate.firstName, middleName: candidate.middleName, lastName: candidate.lastName };
          studentByName.set(key, student);
        }
        const membership = await database.select({ id: subjectStudents.id, state: subjectStudents.membershipState }).from(subjectStudents).where(and(eq(subjectStudents.subjectId, input.subjectId), eq(subjectStudents.studentId, student.id))).limit(1);
        if (!membership[0]) {
          await database.insert(subjectStudents).values({ subjectId: input.subjectId, studentId: student.id, membershipState: "active" });
          added += 1;
        } else if (membership[0].state === "removed") {
          await database.update(subjectStudents).set({ membershipState: "active", removedAt: null }).where(eq(subjectStudents.id, membership[0].id));
          reactivated += 1;
        } else {
          skipped += 1;
        }
      }
      return { added, reactivated, skipped, processed: importStudents.length };
    }),
    update: ownerProcedure.input(z.object({ membershipId: z.number().int().positive(), student: studentNameInput })).mutation(async ({ ctx, input }) => {
      const database = await databaseOrThrow();
      const membership = await database.select({ subjectId: subjectStudents.subjectId, studentId: subjectStudents.studentId }).from(subjectStudents).where(eq(subjectStudents.id, input.membershipId)).limit(1);
      if (!membership[0]) throw new Error("Student membership not found");
      await ownerSubject(database, ctx.user.id, membership[0].subjectId);
      const candidate = { ...input.student, privateNotes: input.student.privateNotes?.trim() || null };
      await database.update(students).set({ canonicalName: studentDisplayName(candidate), firstName: candidate.firstName, middleName: candidate.middleName, lastName: candidate.lastName, privateNotes: candidate.privateNotes }).where(eq(students.id, membership[0].studentId));
      return { success: true as const };
    }),
    setScheduleConflict: ownerProcedure.input(z.object({ membershipId: z.number().int().positive(), hasScheduleConflict: z.boolean() })).mutation(async ({ ctx, input }) => {
      const database = await databaseOrThrow();
      const membership = await database.select({ id: subjectStudents.id, subjectId: subjectStudents.subjectId }).from(subjectStudents).where(eq(subjectStudents.id, input.membershipId)).limit(1);
      if (!membership[0]) throw new Error("Student membership not found");
      await ownerSubject(database, ctx.user.id, membership[0].subjectId);
      await database.update(subjectStudents).set({ hasScheduleConflict: input.hasScheduleConflict }).where(eq(subjectStudents.id, input.membershipId));
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
      const publicId = nanoid(12);
      const [created] = await database.insert(classSessions).values({ subjectId: input.subjectId, publicId, startsAt: input.startsAt, sessionState: "scheduled", publishState: "draft" }).$returningId();
      return { id: created.id, publicId };
    }),
    createNoClass: ownerProcedure.input(z.object({ subjectId: z.number().int().positive(), startsAt: z.coerce.date(), reason: z.string().trim().min(1).max(255) })).mutation(async ({ ctx, input }) => {
      const database = await databaseOrThrow();
      await ownerSubject(database, ctx.user.id, input.subjectId);
      const publicId = nanoid(12);
      const [created] = await database.insert(classSessions).values({ subjectId: input.subjectId, publicId, startsAt: input.startsAt, sessionState: "no_class", noClassReason: input.reason, publishState: "published" }).$returningId();
      return { id: created.id, publicId };
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

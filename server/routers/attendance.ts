import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { attendanceRecords, classSessions, historyEntries, subjectStudents, students, zoomImports, zoomMatchSuggestions } from "../../drizzle/schema";
import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { router } from "../_core/trpc";
import { ownerProcedure } from "./guards";

async function databaseOrThrow() { const database = await getDb(); if (!database) throw new Error("Database is not available"); return database; }
function normalize(value: string) { return value.toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function parseParticipantLines(value: string) { return value.split(/\r?\n/).map(line => line.trim().replace(/\s+/g, " ")).filter(line => line.length > 1 && !/^participants?$/i.test(line)).slice(0, 300); }
function normalizeZoomDisplayName(value: string) { const compact = value.trim().replace(/\s+/g, " ").toUpperCase(); return compact.replace(/\s*,\s*/g, ", "); }

async function ownerSession(database: Awaited<ReturnType<typeof databaseOrThrow>>, ownerId: number, sessionId: number) {
  const session = await database.select({ id: classSessions.id, subjectId: classSessions.subjectId, startsAt: classSessions.startsAt }).from(classSessions).innerJoin((await import("../../drizzle/schema")).subjects, eq(classSessions.subjectId, (await import("../../drizzle/schema")).subjects.id)).where(and(eq(classSessions.id, sessionId), eq((await import("../../drizzle/schema")).subjects.ownerId, ownerId))).limit(1);
  if (!session[0]) throw new Error("Class session not found");
  return session[0];
}

async function ensureRecords(database: Awaited<ReturnType<typeof databaseOrThrow>>, sessionId: number, subjectId: number) {
  const memberships = await database.select({ id: subjectStudents.id }).from(subjectStudents).where(and(eq(subjectStudents.subjectId, subjectId), eq(subjectStudents.membershipState, "active")));
  if (memberships.length) await database.insert(attendanceRecords).values(memberships.map(member => ({ classSessionId: sessionId, subjectStudentId: member.id, attendanceStatus: "NOT_SET" as const, publishState: "draft" as const }))).onDuplicateKeyUpdate({ set: { classSessionId: sessionId } });
}

export const attendanceRouter = router({
  list: ownerProcedure.input(z.object({ sessionId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const database = await databaseOrThrow(); const session = await ownerSession(database, ctx.user.id, input.sessionId); await ensureRecords(database, session.id, session.subjectId);
    return database.select({ recordId: attendanceRecords.id, membershipId: subjectStudents.id, canonicalName: students.canonicalName, status: attendanceRecords.attendanceStatus, publishState: attendanceRecords.publishState, version: attendanceRecords.publishedVersion }).from(attendanceRecords).innerJoin(subjectStudents, eq(attendanceRecords.subjectStudentId, subjectStudents.id)).innerJoin(students, eq(subjectStudents.studentId, students.id)).where(eq(attendanceRecords.classSessionId, session.id)).orderBy(asc(students.canonicalName));
  }),
  setStatus: ownerProcedure.input(z.object({ recordId: z.number().int().positive(), status: z.enum(["PRESENT", "ABSENT", "NOT_SET"]) })).mutation(async ({ ctx, input }) => {
    const database = await databaseOrThrow();
    const record = await database.select({ id: attendanceRecords.id, sessionId: attendanceRecords.classSessionId }).from(attendanceRecords).where(eq(attendanceRecords.id, input.recordId)).limit(1);
    if (!record[0]) throw new Error("Attendance record not found"); await ownerSession(database, ctx.user.id, record[0].sessionId);
    await database.update(attendanceRecords).set({ attendanceStatus: input.status, publishState: "draft" }).where(eq(attendanceRecords.id, input.recordId)); return { success: true as const };
  }),
  importZoomNames: ownerProcedure.input(z.object({ sessionId: z.number().int().positive(), rawNamesText: z.string().trim().min(1).max(12000), captureAt: z.coerce.date() })).mutation(async ({ ctx, input }) => {
    const database = await databaseOrThrow(); const session = await ownerSession(database, ctx.user.id, input.sessionId); await ensureRecords(database, session.id, session.subjectId);
    const [importRow] = await database.insert(zoomImports).values({ classSessionId: session.id, rawNamesText: input.rawNamesText, captureAt: input.captureAt, reviewState: "reviewing" }).$returningId();
    const roster = await database.select({ membershipId: subjectStudents.id, canonicalName: students.canonicalName }).from(subjectStudents).innerJoin(students, eq(subjectStudents.studentId, students.id)).where(and(eq(subjectStudents.subjectId, session.subjectId), eq(subjectStudents.membershipState, "active")));
    const sourceNames = parseParticipantLines(input.rawNamesText).map(normalizeZoomDisplayName);
    let suggestions = sourceNames.map(sourceName => {
      const exact = roster.find(student => normalize(student.canonicalName) === normalize(sourceName));
      const loose = !exact ? roster.filter(student => normalize(student.canonicalName).includes(normalize(sourceName)) || normalize(sourceName).includes(normalize(student.canonicalName))) : [];
      return { sourceName, suggestedSubjectStudentId: exact?.membershipId ?? (loose.length === 1 ? loose[0].membershipId : null), reviewState: exact || loose.length === 1 ? "clear" as const : loose.length ? "needs_review" as const : "no_match" as const };
    });
    try {
      const result = await invokeLLM({ model: "gpt-5-mini", maxTokens: 3000, messages: [{ role: "system", content: "Match Zoom display names to a class roster. Return only structured data. Never invent a match. Use needs_review if uncertain." }, { role: "user", content: JSON.stringify({ requiredFormat: "SECTION_LAST NAME, FIRST NAME + MIDDLE NAME", roster, names: sourceNames }) }], outputSchema: { name: "zoom_name_matches", strict: true, schema: { type: "object", properties: { matches: { type: "array", items: { type: "object", properties: { sourceName: { type: "string" }, membershipId: { type: ["integer", "null"] }, state: { type: "string", enum: ["clear", "needs_review", "no_match"] } }, required: ["sourceName", "membershipId", "state"], additionalProperties: false } } }, required: ["matches"], additionalProperties: false } } });
      const content = result.choices[0]?.message.content; const parsed = typeof content === "string" ? JSON.parse(content) as { matches: Array<{ sourceName: string; membershipId: number | null; state: "clear" | "needs_review" | "no_match" }> } : null;
      if (parsed?.matches?.length) suggestions = parsed.matches.filter(match => sourceNames.includes(match.sourceName)).map(match => ({ sourceName: match.sourceName, suggestedSubjectStudentId: roster.some(student => student.membershipId === match.membershipId) ? match.membershipId : null, reviewState: match.state }));
    } catch { /* The local matching fallback keeps the secretary workflow available. */ }
    if (suggestions.length) await database.insert(zoomMatchSuggestions).values(suggestions.map(suggestion => ({ zoomImportId: importRow.id, ...suggestion })));
    return { importId: importRow.id, count: suggestions.length };
  }),
  suggestions: ownerProcedure.input(z.object({ importId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const database = await databaseOrThrow();
    const rows = await database.select({ id: zoomMatchSuggestions.id, sourceName: zoomMatchSuggestions.sourceName, suggestedSubjectStudentId: zoomMatchSuggestions.suggestedSubjectStudentId, reviewState: zoomMatchSuggestions.reviewState, sessionId: zoomImports.classSessionId }).from(zoomMatchSuggestions).innerJoin(zoomImports, eq(zoomMatchSuggestions.zoomImportId, zoomImports.id)).where(eq(zoomMatchSuggestions.zoomImportId, input.importId));
    if (rows[0]) await ownerSession(database, ctx.user.id, rows[0].sessionId); return rows;
  }),
  confirmSuggestion: ownerProcedure.input(z.object({ suggestionId: z.number().int().positive(), membershipId: z.number().int().positive().nullable() })).mutation(async ({ ctx, input }) => {
    const database = await databaseOrThrow();
    const row = await database.select({ id: zoomMatchSuggestions.id, importId: zoomMatchSuggestions.zoomImportId, sessionId: zoomImports.classSessionId }).from(zoomMatchSuggestions).innerJoin(zoomImports, eq(zoomMatchSuggestions.zoomImportId, zoomImports.id)).where(eq(zoomMatchSuggestions.id, input.suggestionId)).limit(1);
    if (!row[0]) throw new Error("Zoom suggestion not found"); const session = await ownerSession(database, ctx.user.id, row[0].sessionId);
    await database.update(zoomMatchSuggestions).set({ suggestedSubjectStudentId: input.membershipId, reviewState: "confirmed", confirmedByUserId: ctx.user.id, confirmedAt: new Date() }).where(eq(zoomMatchSuggestions.id, input.suggestionId));
    if (input.membershipId) await database.update(attendanceRecords).set({ attendanceStatus: "PRESENT", publishState: "draft" }).where(and(eq(attendanceRecords.classSessionId, session.id), eq(attendanceRecords.subjectStudentId, input.membershipId)));
    return { success: true as const };
  }),
  publish: ownerProcedure.input(z.object({ sessionId: z.number().int().positive(), summary: z.string().trim().min(3).max(280).default("Attendance was published.") })).mutation(async ({ ctx, input }) => {
    const database = await databaseOrThrow(); const session = await ownerSession(database, ctx.user.id, input.sessionId); await ensureRecords(database, session.id, session.subjectId);
    const existing = await database.select({ version: historyEntries.version }).from(historyEntries).where(and(eq(historyEntries.entityType, "attendance"), eq(historyEntries.entityId, session.id))).orderBy(asc(historyEntries.version)); const version = (existing.at(-1)?.version ?? 0) + 1;
    await database.update(attendanceRecords).set({ publishState: "published", publishedVersion: version }).where(eq(attendanceRecords.classSessionId, session.id));
    await database.update(classSessions).set({ sessionState: "completed", publishState: "published" }).where(eq(classSessions.id, session.id));
    await database.insert(historyEntries).values({ entityType: "attendance", entityId: session.id, version, action: "published", publicChangeSummary: input.summary, actorUserId: ctx.user.id });
    return { version };
  }),
});

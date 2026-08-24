import { and, asc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { attendanceRecords, classSessions, historyEntries, subjectStudents, students, zoomImports, zoomMatchSuggestions } from "../../drizzle/schema";
import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { router } from "../_core/trpc";
import { ownerProcedure } from "./guards";

type ZoomNormalizationFlag = "reordered" | "missing_section" | "missing_comma" | "ambiguous_delimiters";
type ZoomNameNormalization = {
  sourceName: string;
  normalizedCandidate: string | null;
  normalizationState: "canonical" | "normalized" | "review_required";
  flags: ZoomNormalizationFlag[];
  reviewNote: string | null;
};

async function databaseOrThrow() { const database = await getDb(); if (!database) throw new Error("Database is not available"); return database; }
function normalize(value: string) { return value.toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function compactDisplayName(value: string) { return value.trim().replace(/\s+/g, " ").replace(/\s*,\s*/g, ", "); }
function canonicalSegment(value: string) { return value.trim().replace(/\s+/g, " ").toUpperCase(); }
function isSectionSurnameSegment(value: string) { return /^[A-Z0-9][A-Z0-9-]*_[A-Z0-9][A-Z0-9 .'-]*$/.test(canonicalSegment(value)); }

export function parseParticipantLines(value: string) { return value.split(/\r?\n/).map(line => line.trim().replace(/\s+/g, " ")).filter(line => line.length > 1 && !/^participants?$/i.test(line)).slice(0, 300); }

/**
 * Produces a private review candidate only where the section/surname and given-name boundary is explicit.
 * Inputs without that boundary deliberately remain unresolved: the secretary, not a parser or model, decides.
 */
export function normalizeZoomParticipantName(value: string): ZoomNameNormalization {
  const sourceName = compactDisplayName(value);
  const parts = sourceName.split(",");
  const alternateBoundary = parts.length === 1 ? sourceName.match(/^(.+?)\s(?:-|–|—|\||\/)\s(.+)$/) : null;
  if (alternateBoundary) {
    const [, left, right] = alternateBoundary;
    if (isSectionSurnameSegment(left)) {
      return {
        sourceName,
        normalizedCandidate: `${canonicalSegment(left)}, ${canonicalSegment(right)}`,
        normalizationState: "normalized",
        flags: ["missing_comma"],
        reviewNote: "An explicit separator was converted to the required comma format for review.",
      };
    }
    if (isSectionSurnameSegment(right)) {
      return {
        sourceName,
        normalizedCandidate: `${canonicalSegment(right)}, ${canonicalSegment(left)}`,
        normalizationState: "normalized",
        flags: ["missing_comma", "reordered"],
        reviewNote: "An explicit separator and reversed order were converted to the required comma format for review.",
      };
    }
  }
  if (parts.length !== 2) {
    return {
      sourceName,
      normalizedCandidate: null,
      normalizationState: "review_required",
      flags: [parts.length > 2 ? "ambiguous_delimiters" : "missing_comma"],
      reviewNote: parts.length > 2 ? "More than one comma makes the name order unclear." : "The required comma between the section/surname and given name is missing.",
    };
  }

  const [left, right] = parts.map(part => part.trim());
  if (!left || !right) {
    return { sourceName, normalizedCandidate: null, normalizationState: "review_required", flags: ["ambiguous_delimiters"], reviewNote: "Both sides of the required comma need a name." };
  }

  if (isSectionSurnameSegment(left)) {
    const normalizedCandidate = `${canonicalSegment(left)}, ${canonicalSegment(right)}`;
    return {
      sourceName,
      normalizedCandidate,
      normalizationState: sourceName === normalizedCandidate ? "canonical" : "normalized",
      flags: [],
      reviewNote: null,
    };
  }

  if (isSectionSurnameSegment(right)) {
    return {
      sourceName,
      normalizedCandidate: `${canonicalSegment(right)}, ${canonicalSegment(left)}`,
      normalizationState: "normalized",
      flags: ["reordered"],
      reviewNote: "The section/surname was after the given name, so the candidate was reordered for review.",
    };
  }

  return {
    sourceName,
    normalizedCandidate: null,
    normalizationState: "review_required",
    flags: ["missing_section"],
    reviewNote: "No recognizable section prefix was provided, so a required-format candidate was not invented.",
  };
}

/** Kept for existing callers that need display cleanup; structured consumers should use normalizeZoomParticipantName. */
export function normalizeZoomDisplayName(value: string) { const normalized = normalizeZoomParticipantName(value); return normalized.normalizedCandidate ?? canonicalSegment(normalized.sourceName); }

async function ownerSession(database: Awaited<ReturnType<typeof databaseOrThrow>>, ownerId: number, sessionId: number) {
  const session = await database.select({ id: classSessions.id, subjectId: classSessions.subjectId, publicId: classSessions.publicId, startsAt: classSessions.startsAt, publishState: classSessions.publishState }).from(classSessions).innerJoin((await import("../../drizzle/schema")).subjects, eq(classSessions.subjectId, (await import("../../drizzle/schema")).subjects.id)).where(and(eq(classSessions.id, sessionId), eq((await import("../../drizzle/schema")).subjects.ownerId, ownerId))).limit(1);
  if (!session[0]) throw new Error("Class session not found");
  return session[0];
}

async function ensureRecords(database: Awaited<ReturnType<typeof databaseOrThrow>>, sessionId: number, subjectId: number) {
  const memberships = await database.select({ id: subjectStudents.id }).from(subjectStudents).where(and(eq(subjectStudents.subjectId, subjectId), eq(subjectStudents.membershipState, "active")));
  if (memberships.length) await database.insert(attendanceRecords).values(memberships.map(member => ({ classSessionId: sessionId, subjectStudentId: member.id, attendanceStatus: "NOT_SET" as const, publishState: "draft" as const }))).onDuplicateKeyUpdate({ set: { classSessionId: sessionId } });
}

export const attendanceRouter = router({
  session: ownerProcedure.input(z.object({ sessionId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const database = await databaseOrThrow();
    return ownerSession(database, ctx.user.id, input.sessionId);
  }),
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
    const normalizedNames = parseParticipantLines(input.rawNamesText).map(normalizeZoomParticipantName);
    let suggestions = normalizedNames.map(name => {
      const comparableName = name.normalizedCandidate;
      const exact = comparableName ? roster.find(student => normalize(student.canonicalName) === normalize(comparableName)) : undefined;
      const loose = comparableName && !exact ? roster.filter(student => normalize(student.canonicalName).includes(normalize(comparableName)) || normalize(comparableName).includes(normalize(student.canonicalName))) : [];
      return { sourceName: name.sourceName, suggestedSubjectStudentId: exact?.membershipId ?? (loose.length === 1 ? loose[0].membershipId : null), reviewState: name.normalizationState === "review_required" ? "needs_review" as const : exact || loose.length === 1 ? "clear" as const : loose.length ? "needs_review" as const : "no_match" as const };
    });
    try {
      const result = await invokeLLM({ model: "gpt-5-mini", maxTokens: 3000, messages: [{ role: "system", content: "Match Zoom display names to a class roster. Return only structured data. Never invent a match. Use needs_review if uncertain. A name with no normalizedCandidate is structurally uncertain and must never be clear." }, { role: "user", content: JSON.stringify({ requiredFormat: "SECTION_LAST NAME, FIRST NAME + MIDDLE NAME", roster, names: normalizedNames }) }], outputSchema: { name: "zoom_name_matches", strict: true, schema: { type: "object", properties: { matches: { type: "array", items: { type: "object", properties: { sourceName: { type: "string" }, membershipId: { type: ["integer", "null"] }, state: { type: "string", enum: ["clear", "needs_review", "no_match"] } }, required: ["sourceName", "membershipId", "state"], additionalProperties: false } } }, required: ["matches"], additionalProperties: false } } });
      const content = result.choices[0]?.message.content; const parsed = typeof content === "string" ? JSON.parse(content) as { matches: Array<{ sourceName: string; membershipId: number | null; state: "clear" | "needs_review" | "no_match" }> } : null;
      if (parsed?.matches?.length) suggestions = parsed.matches.filter(match => normalizedNames.some(name => name.sourceName === match.sourceName)).map(match => {
        const normalized = normalizedNames.find(name => name.sourceName === match.sourceName);
        const structurallyUncertain = normalized?.normalizationState === "review_required";
        return { sourceName: match.sourceName, suggestedSubjectStudentId: roster.some(student => student.membershipId === match.membershipId) ? match.membershipId : null, reviewState: structurallyUncertain && match.state === "clear" ? "needs_review" as const : match.state };
      });
    } catch { /* The local matching fallback keeps the secretary workflow available. */ }
    if (suggestions.length) await database.insert(zoomMatchSuggestions).values(suggestions.map(suggestion => ({ zoomImportId: importRow.id, ...suggestion })));
    return { importId: importRow.id, count: suggestions.length };
  }),
  suggestions: ownerProcedure.input(z.object({ importId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const database = await databaseOrThrow();
    const rows = await database.select({ id: zoomMatchSuggestions.id, sourceName: zoomMatchSuggestions.sourceName, suggestedSubjectStudentId: zoomMatchSuggestions.suggestedSubjectStudentId, reviewState: zoomMatchSuggestions.reviewState, sessionId: zoomImports.classSessionId }).from(zoomMatchSuggestions).innerJoin(zoomImports, eq(zoomMatchSuggestions.zoomImportId, zoomImports.id)).where(eq(zoomMatchSuggestions.zoomImportId, input.importId));
    if (rows[0]) await ownerSession(database, ctx.user.id, rows[0].sessionId);
    return rows.map(row => ({ ...row, ...normalizeZoomParticipantName(row.sourceName) }));
  }),
  suggestionsForSession: ownerProcedure.input(z.object({ sessionId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const database = await databaseOrThrow(); const session = await ownerSession(database, ctx.user.id, input.sessionId);
    const rows = await database.select({ id: zoomMatchSuggestions.id, sourceName: zoomMatchSuggestions.sourceName, suggestedSubjectStudentId: zoomMatchSuggestions.suggestedSubjectStudentId, reviewState: zoomMatchSuggestions.reviewState, createdAt: zoomMatchSuggestions.createdAt }).from(zoomMatchSuggestions).innerJoin(zoomImports, eq(zoomMatchSuggestions.zoomImportId, zoomImports.id)).where(eq(zoomImports.classSessionId, session.id)).orderBy(asc(zoomMatchSuggestions.createdAt));
    return rows.map(row => ({ ...row, ...normalizeZoomParticipantName(row.sourceName) }));
  }),
  confirmSuggestion: ownerProcedure.input(z.object({ suggestionId: z.number().int().positive(), membershipId: z.number().int().positive().nullable() })).mutation(async ({ ctx, input }) => {
    const database = await databaseOrThrow();
    const row = await database.select({ id: zoomMatchSuggestions.id, importId: zoomMatchSuggestions.zoomImportId, sessionId: zoomImports.classSessionId }).from(zoomMatchSuggestions).innerJoin(zoomImports, eq(zoomMatchSuggestions.zoomImportId, zoomImports.id)).where(eq(zoomMatchSuggestions.id, input.suggestionId)).limit(1);
    if (!row[0]) throw new Error("Zoom suggestion not found"); const session = await ownerSession(database, ctx.user.id, row[0].sessionId);
    if (input.membershipId) {
      const membership = await database.select({ id: subjectStudents.id }).from(subjectStudents).where(and(eq(subjectStudents.id, input.membershipId), eq(subjectStudents.subjectId, session.subjectId), eq(subjectStudents.membershipState, "active"))).limit(1);
      if (!membership[0]) throw new Error("Selected Student does not belong to this Subject");
    }
    await database.update(zoomMatchSuggestions).set({ suggestedSubjectStudentId: input.membershipId, reviewState: "confirmed", confirmedByUserId: ctx.user.id, confirmedAt: new Date() }).where(eq(zoomMatchSuggestions.id, input.suggestionId));
    if (input.membershipId) await database.update(attendanceRecords).set({ attendanceStatus: "PRESENT", publishState: "draft" }).where(and(eq(attendanceRecords.classSessionId, session.id), eq(attendanceRecords.subjectStudentId, input.membershipId)));
    return { success: true as const };
  }),
  publish: ownerProcedure.input(z.object({ sessionId: z.number().int().positive(), summary: z.string().trim().min(3).max(280).default("Attendance was published.") })).mutation(async ({ ctx, input }) => {
    const database = await databaseOrThrow(); const session = await ownerSession(database, ctx.user.id, input.sessionId); await ensureRecords(database, session.id, session.subjectId);
    const unresolvedSuggestion = await database.select({ id: zoomMatchSuggestions.id }).from(zoomMatchSuggestions).innerJoin(zoomImports, eq(zoomMatchSuggestions.zoomImportId, zoomImports.id)).where(and(eq(zoomImports.classSessionId, session.id), ne(zoomMatchSuggestions.reviewState, "confirmed"))).limit(1);
    if (unresolvedSuggestion[0]) throw new Error("Confirm every Zoom suggestion or mark it as No roster match before publishing Attendance.");
    const existing = await database.select({ version: historyEntries.version }).from(historyEntries).where(and(eq(historyEntries.entityType, "attendance"), eq(historyEntries.entityId, session.id))).orderBy(asc(historyEntries.version)); const version = (existing.at(-1)?.version ?? 0) + 1;
    await database.update(attendanceRecords).set({ publishState: "published", publishedVersion: version }).where(eq(attendanceRecords.classSessionId, session.id));
    await database.update(classSessions).set({ sessionState: "completed", publishState: "published" }).where(eq(classSessions.id, session.id));
    await database.insert(historyEntries).values({ entityType: "attendance", entityId: session.id, version, action: "published", publicChangeSummary: input.summary, actorUserId: ctx.user.id });
    return { version };
  }),
});

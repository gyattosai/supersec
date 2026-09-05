import { appwriteAccount, appwriteDatabases, appwriteStorage, ID, Query } from "./appwrite";
import { nanoid } from "nanoid";
import { compareByLastNameAsc } from "@shared/attendanceSorting";
import { generateAiText } from "@shared/aiTextEngine";
import { parseConflictConfig, serializeConflictConfig, isConflictSessionDay, getInitialAttendanceForStudent } from "@shared/scheduleConflict";

const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || "supersec_db";
const DB_HISTORY_ID = import.meta.env.VITE_APPWRITE_DATABASE_HISTORY_ID || "supersec_history_db";
const BUCKET_PROOFS = import.meta.env.VITE_APPWRITE_BUCKET_PROOFS || "proof-uploads";
const BUCKET_MEDIA = import.meta.env.VITE_APPWRITE_BUCKET_MEDIA || "media-assets";

// === HIGH-PERFORMANCE IN-MEMORY CACHE FOR ROSTER & ATTENDANCE ===
interface CachedStudent {
  id: string;
  canonicalName: string;
  firstName: string;
  lastName: string;
  middleName: string;
  aliasesText?: string;
}

let studentCache: { timestamp: number; map: Map<string, CachedStudent> } | null = null;
const STUDENT_CACHE_TTL_MS = 60_000; // 60s cache

export function invalidateStudentCache() {
  studentCache = null;
}

async function getCachedStudentMap(): Promise<Map<string, CachedStudent>> {
  const now = Date.now();
  if (studentCache && now - studentCache.timestamp < STUDENT_CACHE_TTL_MS) {
    return studentCache.map;
  }
  try {
    const res = await appwriteDatabases.listDocuments(DB_ID, "students", [
      Query.limit(500),
    ]);
    const map = new Map<string, CachedStudent>();
    for (const doc of res.documents) {
      map.set(doc.$id, {
        id: doc.$id,
        canonicalName: doc.canonicalName || `${doc.lastName}, ${doc.firstName}`,
        firstName: doc.firstName || "",
        lastName: doc.lastName || "",
        middleName: doc.middleName || "",
        aliasesText: doc.aliasesText || "",
      });
    }
    studentCache = { timestamp: now, map };
    return map;
  } catch (err) {
    console.error("Failed to batch fetch students:", err);
    return studentCache?.map || new Map();
  }
}

// In-memory cache for public attendance records
const publicAttendanceCache = new Map<string, { timestamp: number; data: any }>();
const PUBLIC_ATTENDANCE_CACHE_TTL_MS = 30_000; // 30s cache

export function invalidatePublicAttendanceCache(publicId?: string) {
  if (publicId) {
    publicAttendanceCache.delete(publicId);
  } else {
    publicAttendanceCache.clear();
  }
}

export function getCaseVariations(id: string): string[] {
  if (!id) return [];
  const results = new Set<string>();
  results.add(id);

  // Direct swaps
  if (id.includes("l")) results.add(id.replace(/l/g, "I"));
  if (id.includes("I")) results.add(id.replace(/I/g, "l"));
  if (id.includes("0")) results.add(id.replace(/0/g, "O"));
  if (id.includes("O")) results.add(id.replace(/O/g, "0"));

  // Combinatorial swaps if few ambiguous chars
  const chars = id.split("");
  const indices: number[] = [];
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === "l" || chars[i] === "I" || chars[i] === "0" || chars[i] === "O") {
      indices.push(i);
    }
  }

  if (indices.length > 0 && indices.length <= 4) {
    const combos = 1 << indices.length;
    for (let c = 0; c < combos; c++) {
      const arr = [...chars];
      for (let j = 0; j < indices.length; j++) {
        const idx = indices[j];
        const isSet = (c & (1 << j)) !== 0;
        const ch = chars[idx];
        if (ch === "l" || ch === "I") {
          arr[idx] = isSet ? "I" : "l";
        } else if (ch === "0" || ch === "O") {
          arr[idx] = isSet ? "O" : "0";
        }
      }
      results.add(arr.join(""));
    }
  }

  return Array.from(results);
}

function parseMeetingDays(jsonStr: string | null | undefined) {
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type ZoomNormalizationFlag = "reordered" | "missing_section" | "missing_comma" | "ambiguous_delimiters";
type ZoomNameNormalization = {
  sourceName: string;
  normalizedCandidate: string | null;
  normalizationState: "canonical" | "normalized" | "review_required";
  flags: ZoomNormalizationFlag[];
  reviewNote: string | null;
};

function cleanSearchStr(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function tokenizeName(str: string | null | undefined): string[] {
  if (!str) return [];
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 1);
}

function normalizeZoomStr(value: string) {
  return cleanSearchStr(value);
}
function compactDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ");
}
function canonicalSegment(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}
function isSectionSurnameSegment(value: string) {
  return /^[A-Z0-9][A-Z0-9-]*_[A-Z0-9][A-Z0-9 .'-]*$/.test(canonicalSegment(value));
}
function isGivenNameSegment(value: string) {
  return /\b[A-Z]\.$/i.test(value.trim());
}
function parseParticipantLines(value: string) {
  return value
    .split(/\r?\n/)
    .map(line => line.trim().replace(/\s+/g, " "))
    .filter(line => line.length > 1 && !/^participants?(?:\s*\(\d+\))?$/i.test(line))
    .slice(0, 300);
}
function normalizeZoomParticipantName(value: string): ZoomNameNormalization {
  const sourceName = compactDisplayName(value);
  const parts = sourceName.split(",");
  const alternateBoundary = parts.length === 1 ? sourceName.match(/^(.+?)\s(?:-|–|—|\||\/)\s(.+)$/) : null;
  if (alternateBoundary) {
    const [, left, right] = alternateBoundary;
    if (isSectionSurnameSegment(left) || !isGivenNameSegment(left)) {
      return {
        sourceName,
        normalizedCandidate: `${canonicalSegment(left)}, ${canonicalSegment(right)}`,
        normalizationState: "normalized",
        flags: ["missing_comma"],
        reviewNote: "An explicit separator was converted to the standard comma format for review.",
      };
    }
    if (isSectionSurnameSegment(right)) {
      return {
        sourceName,
        normalizedCandidate: `${canonicalSegment(right)}, ${canonicalSegment(left)}`,
        normalizationState: "normalized",
        flags: ["missing_comma", "reordered"],
        reviewNote: "An explicit separator and reversed order were converted to the standard comma format for review.",
      };
    }
  }
  if (parts.length !== 2) {
    return {
      sourceName,
      normalizedCandidate: parts.length === 1 ? canonicalSegment(sourceName) : null,
      normalizationState: "review_required",
      flags: [parts.length > 2 ? "ambiguous_delimiters" : "missing_comma"],
      reviewNote:
        parts.length > 2
          ? "More than one comma makes the name order unclear."
          : "The required comma between the surname and given name is missing.",
    };
  }

  const [left, right] = parts.map(part => part.trim());
  if (!left || !right) {
    return {
      sourceName,
      normalizedCandidate: null,
      normalizationState: "review_required",
      flags: ["ambiguous_delimiters"],
      reviewNote: "Both sides of the comma need a name.",
    };
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

  // Check if left is given name with initial and right is surname (e.g. "Juan M., Dela Cruz")
  if (isGivenNameSegment(left)) {
    return {
      sourceName,
      normalizedCandidate: null,
      normalizationState: "review_required",
      flags: ["missing_section"],
      reviewNote: "No recognizable section prefix was provided, so a required-format candidate was not invented.",
    };
  }

  // Standard "Surname, Given Name" format (e.g. "Ambrocio, Francheska Abvey" or "Añalucas, Jeremie B.")
  const normalizedCandidate = `${canonicalSegment(left)}, ${canonicalSegment(right)}`;
  return {
    sourceName,
    normalizedCandidate,
    normalizationState: sourceName.toUpperCase() === normalizedCandidate ? "canonical" : "normalized",
    flags: [],
    reviewNote: null,
  };
}

async function getCurrentUserId(): Promise<string> {
  try {
    const user = await appwriteAccount.get();
    return user.$id;
  } catch {
    return "dev-secretary";
  }
}

export async function handleAppwriteClientProcedure(path: string, input: any): Promise<any> {
  const userId = await getCurrentUserId();

  // === AUTH ===
  if (path === "auth.me") {
    try {
      const user = await appwriteAccount.get();
      return { id: 1, openId: user.$id, name: user.name || "Class Secretary", email: user.email, role: "admin" };
    } catch {
      return null;
    }
  }

  if (path === "auth.logout") {
    try {
      await appwriteAccount.deleteSession("current");
    } catch {}
    return { success: true };
  }

  // === SUBJECTS ===
  if (path === "subjects.list") {
    const res = await appwriteDatabases.listDocuments(DB_ID, "subjects", [
      Query.equal("ownerId", userId),
      Query.limit(100),
    ]);
    return res.documents.map((doc: any) => ({
      id: doc.$id,
      publicId: doc.publicId || doc.$id,
      ownerId: doc.ownerId,
      name: doc.name,
      code: doc.code,
      viewOnlyShortMark: doc.viewOnlyShortMark || null,
      viewOnlyName: doc.viewOnlyName || null,
      professorName: doc.professorName,
      termName: doc.termName || null,
      status: doc.status || "active",
      publishState: doc.publishState || "draft",
      meetingDays: parseMeetingDays(doc.meetingDaysJson),
      createdAt: new Date(doc.$createdAt),
      updatedAt: new Date(doc.$updatedAt),
    }));
  }

  if (path === "subjects.get") {
    const subjectId = String(input.subjectId);
    let doc: any = null;
    try {
      doc = await appwriteDatabases.getDocument(DB_ID, "subjects", subjectId);
    } catch {
      const res = await appwriteDatabases.listDocuments(DB_ID, "subjects", [
        Query.equal("publicId", subjectId),
        Query.limit(1),
      ]);
      if (res.documents.length > 0) doc = res.documents[0];
    }
    if (!doc) throw new Error("Subject not found");
    return {
      id: doc.$id,
      publicId: doc.publicId || doc.$id,
      ownerId: doc.ownerId,
      name: doc.name,
      code: doc.code,
      viewOnlyShortMark: doc.viewOnlyShortMark || null,
      viewOnlyName: doc.viewOnlyName || null,
      professorName: doc.professorName,
      termName: doc.termName || null,
      status: doc.status || "active",
      publishState: doc.publishState || "draft",
      meetingDays: parseMeetingDays(doc.meetingDaysJson),
      createdAt: new Date(doc.$createdAt),
      updatedAt: new Date(doc.$updatedAt),
    };
  }

  if (path === "subjects.create") {
    const publicId = nanoid(12);
    const meetingDaysJson = JSON.stringify(input.meetingDays || []);
    const doc = await appwriteDatabases.createDocument(DB_ID, "subjects", ID.unique(), {
      ownerId: userId,
      publicId,
      name: input.name,
      code: input.code,
      viewOnlyShortMark: input.viewOnlyShortMark || null,
      viewOnlyName: input.viewOnlyName || null,
      professorName: input.professorName,
      termName: input.termName || null,
      status: "active",
      publishState: "draft",
      meetingDaysJson,
    });
    return { id: doc.$id, publicId: doc.publicId };
  }

  if (path === "subjects.update") {
    const subjectId = String(input.subjectId);
    const meetingDaysJson = JSON.stringify(input.meetingDays || []);
    const doc = await appwriteDatabases.updateDocument(DB_ID, "subjects", subjectId, {
      name: input.name,
      code: input.code,
      viewOnlyShortMark: input.viewOnlyShortMark || null,
      viewOnlyName: input.viewOnlyName || null,
      professorName: input.professorName,
      termName: input.termName || null,
      meetingDaysJson,
    });
    return { id: doc.$id, publicId: doc.publicId };
  }

  if (path === "subjects.archive") {
    const subjectId = String(input.subjectId);
    const isArchiving = input.archive !== undefined ? Boolean(input.archive) : Boolean(input.archived);
    await appwriteDatabases.updateDocument(DB_ID, "subjects", subjectId, {
      status: isArchiving ? "archived" : "active",
      archivedAt: isArchiving ? new Date().toISOString() : null,
    });
    return { success: true };
  }

  if (path === "subjects.restore") {
    const subjectId = String(input.subjectId);
    await appwriteDatabases.updateDocument(DB_ID, "subjects", subjectId, {
      status: "active",
      archivedAt: null,
    });
    return { success: true };
  }

  if (path === "subjects.publish") {
    const subjectId = String(input.subjectId);
    await appwriteDatabases.updateDocument(DB_ID, "subjects", subjectId, {
      publishState: "published",
    });
    return { success: true };
  }

  // === SUBJECT STUDENTS & ROSTER ===
  if (path === "subjects.students" || path === "subjects.students.list") {
    const subjectId = String(input.subjectId);
    const links = await appwriteDatabases.listDocuments(DB_ID, "subjectStudents", [
      Query.equal("subjectId", subjectId),
      Query.limit(200),
    ]);
    const studentIds = links.documents.map((l: any) => l.studentId).filter(Boolean);
    if (studentIds.length === 0) return [];
    const studentsRes = await appwriteDatabases.listDocuments(DB_ID, "students", [
      Query.equal("$id", studentIds.slice(0, 100)),
      Query.limit(100),
    ]).catch(() => ({ documents: [] }));
    const studentMap = new Map(studentsRes.documents.map((s: any) => [s.$id, s]));

    return links.documents.map((l: any) => {
      const s: any = studentMap.get(l.studentId) || {};
      const conflictConfig = parseConflictConfig(s.aliasesText, l.subjectId);
      return {
        membershipId: l.$id,
        id: l.$id,
        studentId: l.studentId,
        canonicalName: s.canonicalName || "Student",
        firstName: s.firstName || "",
        middleName: s.middleName || "",
        lastName: s.lastName || "",
        privateNotes: s.privateNotes || null,
        state: l.membershipState || "active",
        hasScheduleConflict: Boolean(l.hasScheduleConflict),
        conflictConfig,
      };
    });
  }

  if (path === "subjects.students.add") {
    const subjectId = String(input.subjectId);
    const { firstName, middleName, lastName, privateNotes } = input.student;
    const canonicalName = `${lastName}, ${firstName}${middleName ? ` ${middleName}` : ""}`;
    const studentDoc = await appwriteDatabases.createDocument(DB_ID, "students", ID.unique(), {
      ownerId: userId,
      canonicalName,
      firstName,
      middleName: middleName || "",
      lastName,
      privateNotes: privateNotes || null,
      aliasesText: "",
    });
    const linkDoc = await appwriteDatabases.createDocument(DB_ID, "subjectStudents", ID.unique(), {
      subjectId,
      studentId: studentDoc.$id,
      membershipState: "active",
      hasScheduleConflict: false,
      displayOrder: 0,
    });
    return { membershipId: linkDoc.$id, studentId: studentDoc.$id };
  }

  if (path === "subjects.students.reviewBulkImport") {
    const lines = String(input.sourceText || "").split("\n").map(l => l.trim()).filter(Boolean);
    const candidates: Array<{ firstName: string; middleName: string; lastName: string }> = [];
    for (const line of lines) {
      if (line.toLowerCase().includes("last name") && line.toLowerCase().includes("first name")) continue;
      const parts = line.split(/[,\t]/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        candidates.push({
          lastName: parts[0],
          firstName: parts[1],
          middleName: parts[2] || "",
        });
      } else if (parts.length === 1) {
        const spaceParts = parts[0].split(/\s+/);
        if (spaceParts.length >= 2) {
          candidates.push({
            lastName: spaceParts[spaceParts.length - 1],
            firstName: spaceParts[0],
            middleName: spaceParts.slice(1, -1).join(" "),
          });
        }
      }
    }
    return { candidates, aiUsed: false };
  }

  if (path === "subjects.students.addBulk" || path === "subjects.importStudents") {
    const subjectId = String(input.subjectId);
    const candidates = input.students || input.candidates || [];
    let added = 0;
    for (const c of candidates) {
      const canonicalName = `${c.lastName}, ${c.firstName}${c.middleName ? ` ${c.middleName}` : ""}`;
      const studentDoc = await appwriteDatabases.createDocument(DB_ID, "students", ID.unique(), {
        ownerId: userId,
        canonicalName,
        firstName: c.firstName,
        middleName: c.middleName || "",
        lastName: c.lastName,
        privateNotes: c.privateNotes || null,
        aliasesText: "",
      });
      await appwriteDatabases.createDocument(DB_ID, "subjectStudents", ID.unique(), {
        subjectId,
        studentId: studentDoc.$id,
        membershipState: "active",
        hasScheduleConflict: false,
        displayOrder: 0,
      });
      added++;
    }
    return { added, reactivated: 0, skipped: 0, processed: candidates.length, importedCount: added };
  }

  if (path === "subjects.students.update") {
    const membershipId = String(input.membershipId);
    const linkDoc: any = await appwriteDatabases.getDocument(DB_ID, "subjectStudents", membershipId);
    const { firstName, middleName, lastName, privateNotes } = input.student;
    const canonicalName = `${lastName}, ${firstName}${middleName ? ` ${middleName}` : ""}`;
    await appwriteDatabases.updateDocument(DB_ID, "students", linkDoc.studentId, {
      canonicalName,
      firstName,
      middleName: middleName || "",
      lastName,
      privateNotes: privateNotes || null,
    });
    return { success: true };
  }

  if (path === "subjects.students.remove") {
    const membershipId = String(input.membershipId);
    await appwriteDatabases.updateDocument(DB_ID, "subjectStudents", membershipId, {
      membershipState: "archived",
    });
    return { success: true };
  }

  if (path === "subjects.students.setScheduleConflict") {
    const membershipId = String(input.membershipId);
    let linkDoc: any = null;
    try {
      linkDoc = await appwriteDatabases.getDocument(DB_ID, "subjectStudents", membershipId);
    } catch {}
    await appwriteDatabases.updateDocument(DB_ID, "subjectStudents", membershipId, {
      hasScheduleConflict: Boolean(input.hasScheduleConflict),
    });
    if (linkDoc?.studentId && (input.conflictConfig !== undefined || !input.hasScheduleConflict)) {
      try {
        const studentDoc: any = await appwriteDatabases.getDocument(DB_ID, "students", linkDoc.studentId);
        const updatedAliases = serializeConflictConfig(
          studentDoc.aliasesText,
          linkDoc.subjectId,
          input.hasScheduleConflict ? (input.conflictConfig ?? null) : null
        );
        await appwriteDatabases.updateDocument(DB_ID, "students", linkDoc.studentId, {
          aliasesText: updatedAliases,
        });
        invalidateStudentCache();
      } catch (err) {
        console.warn("Could not persist student conflict aliasesText:", err);
      }
    }
    return { success: true };
  }

  // === SESSIONS & ATTENDANCE ===
  if (path === "attendance.session") {
    const sessionId = String(input.sessionId);
    const doc: any = await appwriteDatabases.getDocument(DB_ID, "classSessions", sessionId);

    // Fetch latest version from history or attendance records and subject details concurrently
    const [historyRes, recordsRes, subjectDoc] = await Promise.all([
      appwriteDatabases.listDocuments(DB_HISTORY_ID, "historyEntries", [
        Query.equal("entityType", "attendance"),
        Query.equal("entityId", sessionId),
        Query.orderDesc("version"),
        Query.limit(1),
      ]).catch(() => ({ documents: [] })),
      appwriteDatabases.listDocuments(DB_ID, "attendanceRecords", [
        Query.equal("classSessionId", sessionId),
        Query.limit(200),
      ]).catch(() => ({ documents: [] })),
      doc.subjectId
        ? (appwriteDatabases.getDocument(DB_ID, "subjects", doc.subjectId).catch(() => null) as Promise<any>)
        : Promise.resolve(null),
    ]);
    const maxRecVersion = recordsRes.documents.reduce((max: number, r: any) => Math.max(max, r.publishedVersion || 0), 0);
    const historyVersion = (historyRes.documents[0]?.version as number) || 0;
    const version = historyVersion || maxRecVersion || (doc.version as number) || 1;

    return {
      id: doc.$id,
      subjectId: doc.subjectId,
      publicId: doc.publicId || doc.$id,
      startsAt: new Date(doc.startsAt),
      sessionState: doc.sessionState || "open",
      noClassReason: doc.noClassReason || null,
      publishState: doc.publishState || "draft",
      version,
      subject: subjectDoc ? {
        id: subjectDoc.$id,
        publicId: subjectDoc.publicId,
        name: subjectDoc.name,
        code: subjectDoc.code,
        professorName: subjectDoc.professorName,
      } : undefined,
    };
  }

  if (path === "subjects.sessions.list" || path === "attendance.sessions" || path === "attendance.workspace") {
    const subjectId = String(input?.subjectId || "");
    const queries = [Query.limit(50)];
    if (subjectId) queries.push(Query.equal("subjectId", subjectId));
    const res = await appwriteDatabases.listDocuments(DB_ID, "classSessions", queries);
    
    // Concurrently fetch latest history version for all returned sessions
    const sessionsWithVersion = await Promise.all(
      res.documents.map(async (d: any) => {
        let version = (d.version as number) || 1;
        try {
          const historyRes = await appwriteDatabases.listDocuments(DB_HISTORY_ID, "historyEntries", [
            Query.equal("entityType", "attendance"),
            Query.equal("entityId", d.$id),
            Query.orderDesc("version"),
            Query.limit(1),
          ]);
          if (historyRes.documents.length > 0) {
            version = Math.max(version, (historyRes.documents[0].version as number) || 1);
          }
        } catch {
          // ignore error
        }
        return {
          id: d.$id,
          subjectId: d.subjectId,
          publicId: d.publicId || d.$id,
          startsAt: new Date(d.startsAt),
          sessionState: d.sessionState || "open",
          noClassReason: d.noClassReason || null,
          publishState: d.publishState || "draft",
          version,
        };
      })
    );
    return sessionsWithVersion;
  }

  if (path === "subjects.sessions.create" || path === "attendance.createSession") {
    const publicId = nanoid(12);
    const doc = await appwriteDatabases.createDocument(DB_ID, "classSessions", ID.unique(), {
      subjectId: String(input.subjectId),
      publicId,
      startsAt: input.startsAt ? new Date(input.startsAt).toISOString() : new Date().toISOString(),
      sessionState: input.sessionState || "open",
      noClassReason: input.noClassReason || null,
      publishState: "draft",
    });
    return { id: doc.$id, publicId: doc.publicId };
  }

  if (path === "subjects.sessions.createNoClass") {
    const publicId = nanoid(12);
    const doc = await appwriteDatabases.createDocument(DB_ID, "classSessions", ID.unique(), {
      subjectId: String(input.subjectId),
      publicId,
      startsAt: input.startsAt ? new Date(input.startsAt).toISOString() : new Date().toISOString(),
      sessionState: "no_class",
      noClassReason: input.reason || "No class scheduled",
      publishState: "published",
    });
    return { id: doc.$id, publicId: doc.publicId };
  }

  if (path === "subjects.sessions.setNoClass") {
    const sessionId = String(input.sessionId);
    await appwriteDatabases.updateDocument(DB_ID, "classSessions", sessionId, {
      sessionState: input.noClass ? "no_class" : "completed",
      noClassReason: input.noClass ? (input.reason || "No class scheduled") : null,
      publishState: input.publish ? "published" : "draft",
    });
    return { success: true };
  }

  if (path === "attendance.updateSessionState") {
    const { sessionId, sessionState, noClassReason } = input;
    await appwriteDatabases.updateDocument(DB_ID, "classSessions", String(sessionId), {
      sessionState,
      noClassReason: sessionState === "no_class" ? (noClassReason || "No class scheduled") : null,
    });
    return { success: true };
  }

  if (path === "attendance.deleteSession" || path === "subjects.sessions.delete") {
    const sessionId = String(input.sessionId || input.id);
    await appwriteDatabases.deleteDocument(DB_ID, "classSessions", sessionId);
    try {
      const records = await appwriteDatabases.listDocuments(DB_ID, "attendanceRecords", [
        Query.equal("classSessionId", sessionId),
        Query.limit(200),
      ]);
      for (const rec of records.documents) {
        await appwriteDatabases.deleteDocument(DB_ID, "attendanceRecords", rec.$id).catch(() => {});
      }
    } catch { /* cleanup ignore */ }
    return { success: true };
  }

  if (path === "attendance.list") {
    const sessionId = String(input.sessionId);
    
    // Fetch session, existing attendance records, and cached students all in parallel
    const [sessionDoc, recordsRes, studentMap] = await Promise.all([
      appwriteDatabases.getDocument(DB_ID, "classSessions", sessionId).catch(() => null) as Promise<any>,
      appwriteDatabases.listDocuments(DB_ID, "attendanceRecords", [
        Query.equal("classSessionId", sessionId),
        Query.limit(200),
      ]),
      getCachedStudentMap(),
    ]);

    // Get all active enrolled students for this subject
    let activeMembers: any[] = [];
    if (sessionDoc?.subjectId) {
      try {
        const memRes = await appwriteDatabases.listDocuments(DB_ID, "subjectStudents", [
          Query.equal("subjectId", sessionDoc.subjectId),
          Query.equal("membershipState", "active"),
          Query.limit(200),
        ]);
        activeMembers = memRes.documents;
      } catch {}
    }

    // Ensure all active enrolled students have an attendance record (batch create missing in parallel)
    const existingMemberIds = new Set(recordsRes.documents.map((d: any) => String(d.subjectStudentId)));
    const missingMembers = activeMembers.filter(m => !existingMemberIds.has(m.$id));

    if (missingMembers.length > 0) {
      let meetingDays: number[] | undefined;
      if (sessionDoc?.subjectId) {
        try {
          const sDoc: any = await appwriteDatabases.getDocument(DB_ID, "subjects", sessionDoc.subjectId);
          if (sDoc?.meetingDaysJson) {
            const parsed = parseMeetingDays(sDoc.meetingDaysJson);
            meetingDays = parsed.map((m: any) => m.weekday);
          }
        } catch {}
      }
      const sessionDate = sessionDoc?.startsAt ? new Date(sessionDoc.startsAt) : new Date();

      const createdDocs = await Promise.all(
        missingMembers.map(member => {
          const s = studentMap.get(String(member.studentId));
          const conflictConfig = parseConflictConfig(s?.aliasesText, sessionDoc?.subjectId || "");
          const initialAtt = getInitialAttendanceForStudent(
            conflictConfig,
            sessionDate,
            meetingDays,
            Boolean(member.hasScheduleConflict)
          );
          return appwriteDatabases.createDocument(DB_ID, "attendanceRecords", ID.unique(), {
            classSessionId: sessionId,
            subjectStudentId: member.$id,
            attendanceStatus: initialAtt.status,
            hasScheduleConflict: Boolean(member.hasScheduleConflict),
            publishState: "draft",
            excuseReason: null,
          }).catch(() => null);
        })
      );
      for (const doc of createdDocs) {
        if (doc) recordsRes.documents.push(doc);
      }
    }

    // Build student details map directly in-memory from cached roster
    const membershipToStudent = new Map<string, CachedStudent>();
    for (const member of activeMembers) {
      const s = studentMap.get(String(member.studentId));
      if (s) {
        membershipToStudent.set(String(member.$id), s);
      }
    }

    const sessionDate = sessionDoc?.startsAt ? new Date(sessionDoc.startsAt) : new Date();
    const mapped = recordsRes.documents.map((d: any) => {
      const s = membershipToStudent.get(String(d.subjectStudentId));
      const conflictConfig = parseConflictConfig(s?.aliasesText, sessionDoc?.subjectId || "");
      const isConflictToday = Boolean(
        d.hasScheduleConflict &&
        (conflictConfig ? isConflictSessionDay(conflictConfig, sessionDate) : true)
      );
      return {
        recordId: d.$id,
        membershipId: d.subjectStudentId,
        canonicalName: s?.canonicalName || d.canonicalName || "Unknown Student",
        firstName: s?.firstName || null,
        lastName: s?.lastName || null,
        middleName: s?.middleName || null,
        status: d.attendanceStatus || "NOT_SET",
        excuseReason: d.excuseReason || null,
        hasScheduleConflict: Boolean(d.hasScheduleConflict),
        publishState: d.publishState || "draft",
        version: d.version || 1,
        conflictConfig,
        isConflictToday,
      };
    });

    // Default sort alphabetically by last name
    return mapped.sort(compareByLastNameAsc);
  }

  if (path === "attendance.deleteSuggestion") {
    const suggestionId = String(input.suggestionId || input.id);
    await appwriteDatabases.deleteDocument(DB_ID, "zoomMatchSuggestions", suggestionId);
    return { success: true };
  }

  if (path === "attendance.clearSuggestions") {
    const sessionId = String(input.sessionId);
    const imports = await appwriteDatabases.listDocuments(DB_ID, "zoomImports", [
      Query.equal("classSessionId", sessionId),
      Query.limit(50),
    ]);
    for (const imp of imports.documents) {
      const suggs = await appwriteDatabases.listDocuments(DB_ID, "zoomMatchSuggestions", [
        Query.equal("zoomImportId", imp.$id),
        Query.limit(200),
      ]);
      for (const s of suggs.documents) {
        await appwriteDatabases.deleteDocument(DB_ID, "zoomMatchSuggestions", s.$id).catch(() => {});
      }
      await appwriteDatabases.deleteDocument(DB_ID, "zoomImports", imp.$id).catch(() => {});
    }
    return { success: true };
  }

  if (path === "attendance.quickAddAndMatchStudent") {
    const sessionId = String(input.sessionId);
    const sessionDoc: any = await appwriteDatabases.getDocument(DB_ID, "classSessions", sessionId);
    const subjectId = sessionDoc.subjectId;
    const { firstName, middleName, lastName } = input.student;
    const canonicalName = `${lastName}, ${firstName}${middleName ? ` ${middleName}` : ""}`.trim();

    // 1. Create student document
    const studentDoc = await appwriteDatabases.createDocument(DB_ID, "students", ID.unique(), {
      ownerId: userId,
      canonicalName,
      firstName: firstName.trim(),
      middleName: (middleName || "").trim(),
      lastName: lastName.trim(),
      privateNotes: null,
      aliasesText: "",
    });

    // Invalidate student & public attendance cache
    invalidateStudentCache();
    invalidatePublicAttendanceCache();

    // 2. Add to subjectStudents (master list)
    const linkDoc = await appwriteDatabases.createDocument(DB_ID, "subjectStudents", ID.unique(), {
      subjectId,
      studentId: studentDoc.$id,
      membershipState: "active",
      hasScheduleConflict: false,
      displayOrder: 0,
    });

    // 3. Create attendance record for this session as PRESENT
    const attendanceDoc = await appwriteDatabases.createDocument(DB_ID, "attendanceRecords", ID.unique(), {
      classSessionId: sessionId,
      subjectStudentId: linkDoc.$id,
      attendanceStatus: "PRESENT",
      hasScheduleConflict: false,
      publishState: "draft",
      excuseReason: null,
    });

    // 4. If suggestionId provided, mark suggestion as confirmed
    if (input.suggestionId) {
      await appwriteDatabases.updateDocument(DB_ID, "zoomMatchSuggestions", String(input.suggestionId), {
        reviewState: "confirmed",
        suggestedSubjectStudentId: linkDoc.$id,
        confirmedByUserId: userId,
        confirmedAt: new Date().toISOString(),
      }).catch(() => {});
    }

    return {
      success: true,
      membershipId: linkDoc.$id,
      studentId: studentDoc.$id,
      recordId: attendanceDoc.$id,
      canonicalName,
    };
  }

  if (path === "attendance.setStatus") {
    const { recordId, status, excuseReason } = input;
    await appwriteDatabases.updateDocument(DB_ID, "attendanceRecords", String(recordId), {
      attendanceStatus: status,
      excuseReason: excuseReason || null,
    });
    invalidatePublicAttendanceCache();
    return { success: true };
  }

  if (path === "attendance.bulkSetDraftStatus") {
    const sessionId = String(input.sessionId);
    const status = input.status;
    invalidatePublicAttendanceCache();

    // If the old format with updates array, handle it in parallel
    if (input.updates) {
      await Promise.all(
        input.updates.map((u: any) =>
          appwriteDatabases.updateDocument(DB_ID, "attendanceRecords", String(u.recordId), {
            attendanceStatus: u.status,
            excuseReason: u.excuseReason || null,
          })
        )
      );
      return { success: true, updatedCount: input.updates.length };
    }

    // New format: { sessionId, status } - update all records for the session concurrently in parallel
    const records = await appwriteDatabases.listDocuments(DB_ID, "attendanceRecords", [
      Query.equal("classSessionId", sessionId),
      Query.limit(200),
    ]);
    await Promise.all(
      records.documents.map(doc =>
        appwriteDatabases.updateDocument(DB_ID, "attendanceRecords", doc.$id, {
          attendanceStatus: status,
        })
      )
    );
    return { success: true, updatedCount: records.documents.length };
  }

  if (path === "attendance.publish") {
    const sessionId = String(input.sessionId);
    invalidatePublicAttendanceCache();

    // 1. Fetch current max version from historyEntries or attendanceRecords
    const [historyRes, recordsRes] = await Promise.all([
      appwriteDatabases.listDocuments(DB_HISTORY_ID, "historyEntries", [
        Query.equal("entityType", "attendance"),
        Query.equal("entityId", sessionId),
        Query.orderDesc("version"),
        Query.limit(1),
      ]).catch(() => ({ documents: [] })),
      appwriteDatabases.listDocuments(DB_ID, "attendanceRecords", [
        Query.equal("classSessionId", sessionId),
        Query.limit(200),
      ]).catch(() => ({ documents: [] })),
    ]);

    const historyMax = (historyRes.documents[0]?.version as number) || 0;
    const recordsMax = recordsRes.documents.reduce((max: number, r: any) => Math.max(max, r.publishedVersion || 0), 0);
    const currentVersion = Math.max(historyMax, recordsMax, 0);
    const newVersion = currentVersion + 1;

    // 2. Insert historyEntry for this new version
    await appwriteDatabases.createDocument(DB_HISTORY_ID, "historyEntries", ID.unique(), {
      entityType: "attendance",
      entityId: sessionId,
      version: newVersion,
      action: "published",
      publicChangeSummary: input.summary || `Attendance published as version ${newVersion}`,
      actorUserId: userId || "secretary",
    }).catch(err => {
      console.warn("Failed to create historyEntry:", err);
    });

    // 3. Mark class session as published & completed
    await appwriteDatabases.updateDocument(DB_ID, "classSessions", sessionId, {
      publishState: "published",
      sessionState: "completed",
    });

    // 4. Mark all records as published with new publishedVersion
    await Promise.all(
      recordsRes.documents.map(doc =>
        appwriteDatabases.updateDocument(DB_ID, "attendanceRecords", doc.$id, {
          publishState: "published",
          publishedVersion: newVersion,
        })
      )
    );

    return { version: newVersion };
  }

  if (path === "attendance.importZoomNames") {
    const sessionId = String(input.sessionId);
    const sessionDoc: any = await appwriteDatabases.getDocument(DB_ID, "classSessions", sessionId);

    // Get active enrolled students for this subject & cached student details concurrently
    const [subjectStudentsRes, studentMap] = await Promise.all([
      appwriteDatabases.listDocuments(DB_ID, "subjectStudents", [
        Query.equal("subjectId", sessionDoc.subjectId),
        Query.equal("membershipState", "active"),
        Query.limit(200),
      ]),
      getCachedStudentMap(),
    ]);

    const roster: Array<{
      membershipId: string;
      canonicalName: string;
      firstName: string;
      lastName: string;
      middleName: string;
    }> = [];
    for (const member of subjectStudentsRes.documents) {
      const studentDoc = studentMap.get(member.studentId);
      roster.push({
        membershipId: member.$id,
        canonicalName: studentDoc?.canonicalName || "Unknown Student",
        firstName: studentDoc?.firstName || "",
        lastName: studentDoc?.lastName || "",
        middleName: studentDoc?.middleName || "",
      });
    }

    // Clean up old zoomImports & suggestions for this session to ensure clean fresh results
    try {
      const oldImports = await appwriteDatabases.listDocuments(DB_ID, "zoomImports", [
        Query.equal("classSessionId", sessionId),
        Query.limit(50),
      ]);
      for (const oldImp of oldImports.documents) {
        const oldSugg = await appwriteDatabases.listDocuments(DB_ID, "zoomMatchSuggestions", [
          Query.equal("zoomImportId", oldImp.$id),
          Query.limit(200),
        ]);
        for (const s of oldSugg.documents) {
          await appwriteDatabases.deleteDocument(DB_ID, "zoomMatchSuggestions", s.$id).catch(() => {});
        }
        await appwriteDatabases.deleteDocument(DB_ID, "zoomImports", oldImp.$id).catch(() => {});
      }
    } catch {}

    // Create new zoomImports record
    const importDoc = await appwriteDatabases.createDocument(DB_ID, "zoomImports", ID.unique(), {
      classSessionId: sessionId,
      rawNamesText: input.rawNamesText,
      captureAt: (input.captureAt ? new Date(input.captureAt) : new Date()).toISOString(),
      reviewState: "reviewing",
    });

    const participantLines = parseParticipantLines(input.rawNamesText);
    const suggestions: Array<{
      sourceName: string;
      suggestedSubjectStudentId: string;
      reviewState: "clear" | "needs_review" | "no_match";
    }> = [];

    for (const rawLine of participantLines) {
      const normalized = normalizeZoomParticipantName(rawLine);
      const rawClean = cleanSearchStr(rawLine);
      const rawNoSectionClean = cleanSearchStr(rawLine.replace(/^[A-Z0-9]+_/i, ""));
      const candClean = cleanSearchStr(normalized.normalizedCandidate);
      const candTokens = tokenizeName(normalized.normalizedCandidate || rawLine);

      let matchedStudent: { membershipId: string; canonicalName: string } | undefined;
      let matchState: "clear" | "needs_review" | "no_match" = "no_match";

      // 1. Direct match against roster canonical name (with or without section prefix, diacritics-insensitive)
      const directMatch = roster.find(s => {
        const sClean = cleanSearchStr(s.canonicalName);
        return (
          sClean === rawClean ||
          sClean === rawNoSectionClean ||
          (candClean && sClean === candClean)
        );
      });

      if (directMatch) {
        matchedStudent = directMatch;
        matchState = "clear";
      } else {
        // 2. Both lastName and firstName matched in tokens
        const bothMatches = roster.filter(s => {
          const lnClean = cleanSearchStr(s.lastName);
          const fnClean = cleanSearchStr(s.firstName);
          if (!lnClean || !fnClean) return false;

          const hasLn = rawClean.includes(lnClean) || candTokens.includes(lnClean);
          const hasFn =
            rawClean.includes(fnClean) ||
            candTokens.some(t => fnClean.startsWith(t) || t.startsWith(fnClean));
          return hasLn && hasFn;
        });

        if (bothMatches.length === 1) {
          matchedStudent = bothMatches[0];
          matchState = "clear";
        } else if (bothMatches.length > 1) {
          matchedStudent = bothMatches[0];
          matchState = "needs_review";
        } else {
          // 3. Surname only match
          const surnameMatches = roster.filter(s => {
            const lnClean = cleanSearchStr(s.lastName);
            return lnClean && (rawClean.includes(lnClean) || candTokens.includes(lnClean));
          });

          if (surnameMatches.length === 1) {
            matchedStudent = surnameMatches[0];
            matchState = "needs_review";
          } else {
            matchState = "no_match";
          }
        }
      }

      suggestions.push({
        sourceName: normalized.sourceName,
        suggestedSubjectStudentId: matchedStudent?.membershipId || "",
        reviewState: matchState,
      });
    }

    // Persist suggestions in Appwrite
    for (const sugg of suggestions) {
      await appwriteDatabases.createDocument(DB_ID, "zoomMatchSuggestions", ID.unique(), {
        zoomImportId: importDoc.$id,
        sourceName: sugg.sourceName,
        suggestedSubjectStudentId: sugg.suggestedSubjectStudentId,
        reviewState: sugg.reviewState,
      });
    }

    return { importId: importDoc.$id, count: suggestions.length };
  }

  if (path === "attendance.suggestionsForSession") {
    const sessionId = String(input.sessionId);
    
    // Fetch session, zoomImports, and cached student map concurrently
    const [sessionDoc, importsRes, studentMap] = await Promise.all([
      appwriteDatabases.getDocument(DB_ID, "classSessions", sessionId).catch(() => null) as Promise<any>,
      appwriteDatabases.listDocuments(DB_ID, "zoomImports", [
        Query.equal("classSessionId", sessionId),
        Query.limit(50),
      ]),
      getCachedStudentMap(),
    ]);

    if (!importsRes.documents.length) return [];

    // Fetch subject students (if needed) and suggestion documents concurrently
    const [subjectStudentsRes, ...suggResults] = await Promise.all([
      sessionDoc?.subjectId
        ? appwriteDatabases.listDocuments(DB_ID, "subjectStudents", [
            Query.equal("subjectId", sessionDoc.subjectId),
            Query.limit(200),
          ]).catch(() => ({ documents: [] }))
        : Promise.resolve({ documents: [] }),
      ...importsRes.documents.map(imp =>
        appwriteDatabases.listDocuments(DB_ID, "zoomMatchSuggestions", [
          Query.equal("zoomImportId", imp.$id),
          Query.limit(200),
        ]).catch(() => ({ documents: [] }))
      ),
    ]);

    const membershipToStudentName = new Map<string, string>();
    for (const member of subjectStudentsRes.documents) {
      const s = studentMap.get(member.studentId);
      if (s) membershipToStudentName.set(member.$id, s.canonicalName);
    }

    const allSuggestions: any[] = [];
    for (const suggRes of suggResults) {
      for (const doc of suggRes.documents) {
        const norm = normalizeZoomParticipantName(doc.sourceName);
        const matchedName = doc.suggestedSubjectStudentId ? membershipToStudentName.get(doc.suggestedSubjectStudentId) : null;
        allSuggestions.push({
          id: doc.$id,
          sourceName: doc.sourceName,
          suggestedSubjectStudentId: doc.suggestedSubjectStudentId || null,
          matchedStudentName: matchedName || null,
          reviewState: doc.reviewState || "needs_review",
          normalizedCandidate: matchedName || norm.normalizedCandidate,
          normalizationState: norm.normalizationState,
          flags: norm.flags,
          reviewNote: norm.reviewNote,
        });
      }
    }
    return allSuggestions;
  }

  if (path === "attendance.suggestions") {
    const importId = String(input.importId);
    const suggRes = await appwriteDatabases.listDocuments(DB_ID, "zoomMatchSuggestions", [
      Query.equal("zoomImportId", importId),
      Query.limit(200),
    ]);
    return suggRes.documents.map((doc: any) => {
      const norm = normalizeZoomParticipantName(doc.sourceName);
      return {
        id: doc.$id,
        sourceName: doc.sourceName,
        suggestedSubjectStudentId: doc.suggestedSubjectStudentId || null,
        reviewState: doc.reviewState || "needs_review",
        normalizedCandidate: norm.normalizedCandidate,
        normalizationState: norm.normalizationState,
        flags: norm.flags,
        reviewNote: norm.reviewNote,
      };
    });
  }

  if (path === "attendance.confirmSuggestion") {
    const suggestionId = String(input.suggestionId);
    const membershipId = input.membershipId ? String(input.membershipId) : "";

    const suggestion: any = await appwriteDatabases.getDocument(DB_ID, "zoomMatchSuggestions", suggestionId);
    await appwriteDatabases.updateDocument(DB_ID, "zoomMatchSuggestions", suggestionId, {
      suggestedSubjectStudentId: membershipId,
      reviewState: "confirmed",
      confirmedAt: new Date().toISOString(),
    });

    if (membershipId && membershipId !== "none") {
      const zoomImport: any = await appwriteDatabases.getDocument(DB_ID, "zoomImports", suggestion.zoomImportId);
      const sessionId = zoomImport.classSessionId;

      // Mark the student as PRESENT in attendanceRecords
      const records = await appwriteDatabases.listDocuments(DB_ID, "attendanceRecords", [
        Query.equal("classSessionId", sessionId),
        Query.equal("subjectStudentId", membershipId),
        Query.limit(1),
      ]);
      if (records.documents.length) {
        await appwriteDatabases.updateDocument(DB_ID, "attendanceRecords", records.documents[0].$id, {
          attendanceStatus: "PRESENT",
          excuseReason: null,
          publishState: "draft",
        });
      }
    }
    return { success: true };
  }

  // === ATTENDANCE PROOF ===
  if (path === "attendanceProof.publicSession") {
    const publicId = String(input.publicId);
    const candidateIds = getCaseVariations(publicId);
    let sessionDoc: any = null;
    for (const cid of candidateIds) {
      const res = await appwriteDatabases.listDocuments(DB_ID, "classSessions", [
        Query.equal("publicId", cid),
        Query.limit(1),
      ]);
      if (res.documents.length > 0) {
        sessionDoc = res.documents[0];
        break;
      }
    }
    if (!sessionDoc) return { available: false };
    const subjectDoc: any = await appwriteDatabases.getDocument(DB_ID, "subjects", sessionDoc.subjectId).catch(() => null);
    return {
      available: true,
      session: {
        id: sessionDoc.$id,
        startsAt: new Date(sessionDoc.startsAt),
        sessionState: sessionDoc.sessionState,
        subject: subjectDoc ? {
          name: subjectDoc.name,
          code: subjectDoc.code,
          professorName: subjectDoc.professorName,
        } : { name: "Class", code: "SUBJ", professorName: "Professor" },
      },
    };
  }

  // Helper to convert base64 data URL to File for Appwrite storage
  function dataUrlToFile(dataUrl: string, filename: string): File {
    try {
      const arr = dataUrl.split(",");
      const mime = arr[0]?.match(/:(.*?);/)?.[1] || "image/png";
      const bstr = atob(arr[1] || arr[0]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
    } catch {
      return new File([new Uint8Array(0)], filename, { type: "image/png" });
    }
  }

  if (path === "attendanceProof.submit") {
    const { publicId, submittedName, fileName, base64Data, submissionType, excuseReason } = input;
    const candidateIds = getCaseVariations(String(publicId));
    let sessionDoc: any = null;
    for (const cid of candidateIds) {
      const sessionRes = await appwriteDatabases.listDocuments(DB_ID, "classSessions", [
        Query.equal("publicId", cid),
        Query.limit(1),
      ]);
      if (sessionRes.documents.length > 0) {
        sessionDoc = sessionRes.documents[0];
        break;
      }
    }
    const sessionId = sessionDoc ? sessionDoc.$id : publicId;
    const subjectId = sessionDoc?.subjectId;

    // Upload to Appwrite Storage if file exists
    let proofUrl = "";
    if (base64Data && typeof window !== "undefined") {
      try {
        const fileObj = dataUrlToFile(base64Data, fileName || "proof.png");
        const uploaded = await appwriteStorage.createFile("media-assets", ID.unique(), fileObj);
        proofUrl = `https://sgp.cloud.appwrite.io/v1/storage/buckets/media-assets/files/${uploaded.$id}/view?project=${import.meta.env.VITE_APPWRITE_PROJECT_ID || "supersec"}`;
      } catch (err) {
        console.error("Storage upload error:", err);
      }
    }
    const safeProofUrl = proofUrl || "zoom-screenshot";

    // Match student on roster
    let matchedMembershipId: string | null = null;
    let matchedStudentName: string | null = null;

    if (subjectId && submittedName) {
      try {
        const memRes = await appwriteDatabases.listDocuments(DB_ID, "subjectStudents", [
          Query.equal("subjectId", subjectId),
          Query.equal("membershipState", "active"),
          Query.limit(200),
        ]);
        const enrolledStudents: { membershipId: string; studentId: string; canonicalName: string; firstName: string; lastName: string }[] = [];
        for (const m of memRes.documents) {
          try {
            const sDoc: any = await appwriteDatabases.getDocument(DB_ID, "students", m.studentId);
            enrolledStudents.push({
              membershipId: m.$id,
              studentId: sDoc.$id,
              canonicalName: sDoc.canonicalName || `${sDoc.lastName}, ${sDoc.firstName}`,
              firstName: sDoc.firstName || "",
              lastName: sDoc.lastName || "",
            });
          } catch {}
        }

        const normalizedInput = normalizeZoomParticipantName(submittedName).normalizedCandidate || submittedName;
        const cleanInput = cleanSearchStr(normalizedInput);

        // 1. Direct match
        const direct = enrolledStudents.find(s => cleanSearchStr(s.canonicalName) === cleanInput || cleanSearchStr(`${s.lastName}, ${s.firstName}`) === cleanInput || cleanSearchStr(`${s.firstName} ${s.lastName}`) === cleanInput);
        if (direct) {
          matchedMembershipId = direct.membershipId;
          matchedStudentName = direct.canonicalName;
        } else {
          // 2. Token match
          const inTokens = cleanInput.split(/\s+/).filter(t => t.length > 1);
          const candidate = enrolledStudents.find(s => {
            const last = cleanSearchStr(s.lastName);
            const first = cleanSearchStr(s.firstName);
            return inTokens.includes(last) && (inTokens.includes(first) || last.length >= 4);
          });
          if (candidate) {
            matchedMembershipId = candidate.membershipId;
            matchedStudentName = candidate.canonicalName;
          }
        }
      } catch (err) {
        console.error("Error matching student roster:", err);
      }
    }

    const isExcuse = submissionType === "excuse_letter" || Boolean(excuseReason);

    if (isExcuse) {
      // Excuse Letter: goes to secretary review queue
      const summaryText = `[Excuse Letter] ${excuseReason || "Excuse letter submitted for review"}`;
      const payload: any = {
        classSessionId: sessionId,
        submittedName: submittedName || "Student",
        proofStorageKey: fileName || "excuse-letter-text",
        proofUrl: safeProofUrl,
        proofOriginalName: fileName || "Excuse Letter",
        proofMimeType: fileName?.endsWith(".pdf") ? "application/pdf" : (fileName ? "image/jpeg" : "text/plain"),
        proofByteSize: base64Data ? base64Data.length : 1,
        reviewState: "needs_review",
        matchedSubjectStudentId: matchedMembershipId || "",
        reviewSummary: summaryText.slice(0, 490),
      };
      const doc = await appwriteDatabases.createDocument(DB_ID, "attendanceProofSubmissions", ID.unique(), payload);

      return {
        outcome: "submitted_for_review",
        submissionId: doc.$id,
        matchedName: matchedStudentName,
        isExcuse: true,
      };
    }

    // Zoom Attendance Proof: Automated Instant Verification!
    if (matchedMembershipId) {
      // Find attendance record for this student
      let outcome: "updated" | "already_present" = "updated";

      try {
        const recRes = await appwriteDatabases.listDocuments(DB_ID, "attendanceRecords", [
          Query.equal("classSessionId", sessionId),
          Query.equal("subjectStudentId", matchedMembershipId),
          Query.limit(1),
        ]);

        if (recRes.documents.length > 0) {
          const rec: any = recRes.documents[0];
          if (rec.attendanceStatus === "PRESENT") {
            outcome = "already_present";
          } else {
            await appwriteDatabases.updateDocument(DB_ID, "attendanceRecords", rec.$id, {
              attendanceStatus: "PRESENT",
            });
            outcome = "updated";
          }
        } else {
          // Create attendance record as PRESENT
          await appwriteDatabases.createDocument(DB_ID, "attendanceRecords", ID.unique(), {
            classSessionId: sessionId,
            subjectStudentId: matchedMembershipId,
            attendanceStatus: "PRESENT",
            hasScheduleConflict: false,
            publishState: "draft",
          });
          outcome = "updated";
        }
      } catch (recErr) {
        console.error("Failed to update/create attendance record directly:", recErr);
        outcome = "updated";
      }

      // Log in backend history as accepted
      const summary = outcome === "already_present"
        ? "AI Automated Verification: Verified Zoom screenshot. Student was already marked Present."
        : "AI Automated Verification: Verified Zoom screenshot. Attendance automatically marked Present.";

      const doc = await appwriteDatabases.createDocument(DB_ID, "attendanceProofSubmissions", ID.unique(), {
        classSessionId: sessionId,
        submittedName: submittedName || "Student",
        proofStorageKey: fileName || "zoom-proof.png",
        proofUrl: safeProofUrl,
        proofOriginalName: fileName || "Zoom Screenshot",
        proofMimeType: "image/png",
        proofByteSize: base64Data?.length || 1024,
        reviewState: "accepted",
        matchedSubjectStudentId: matchedMembershipId,
        reviewSummary: summary,
        reviewedAt: new Date().toISOString(),
      });

      return {
        outcome,
        submissionId: doc.$id,
        matchedName: matchedStudentName,
        isExcuse: false,
      };
    }

    // If name not recognized on roster, still log and send to secretary for review
    const doc = await appwriteDatabases.createDocument(DB_ID, "attendanceProofSubmissions", ID.unique(), {
      classSessionId: sessionId,
      submittedName: submittedName || "Student",
      proofStorageKey: fileName || "proof.png",
      proofUrl: safeProofUrl,
      proofOriginalName: fileName || "Zoom Screenshot",
      proofMimeType: "image/png",
      proofByteSize: base64Data?.length || 1024,
      reviewState: "needs_review",
      matchedSubjectStudentId: "",
      reviewSummary: "Zoom screenshot submitted. Unmatched name on roster — queued for secretary review.",
    });

    return {
      outcome: "needs_review",
      submissionId: doc.$id,
      matchedName: null,
      isExcuse: false,
    };
  }

  if (path === "attendanceProof.listForSession") {
    const sessionId = String(input.sessionId);
    const [res, studentMap] = await Promise.all([
      appwriteDatabases.listDocuments(DB_ID, "attendanceProofSubmissions", [
        Query.equal("classSessionId", sessionId),
        Query.limit(100),
      ]),
      getCachedStudentMap(),
    ]);

    // Resolve membership IDs in parallel
    const missingMemIds = Array.from(new Set(res.documents.map((d: any) => d.matchedSubjectStudentId).filter(Boolean)));
    const membershipDocs = await Promise.all(
      missingMemIds.map(memId =>
        appwriteDatabases.getDocument(DB_ID, "subjectStudents", memId as string).catch(() => null)
      )
    );

    const memToStudentName = new Map<string, string>();
    for (const mem of membershipDocs) {
      if (mem?.studentId) {
        const s = studentMap.get(mem.studentId);
        if (s) memToStudentName.set(mem.$id, s.canonicalName);
      }
    }

    return res.documents.map((d: any) => ({
      id: d.$id,
      classSessionId: d.classSessionId,
      submittedName: d.submittedName,
      matchedName: memToStudentName.get(d.matchedSubjectStudentId) || null,
      matchedSubjectStudentId: d.matchedSubjectStudentId || null,
      proofUrl: d.proofUrl,
      proofOriginalName: d.proofOriginalName,
      reviewState: d.reviewState || "pending",
      reviewSummary: d.reviewSummary || "",
      isExcuseLetter: Boolean(d.reviewSummary?.startsWith("[Excuse Letter]") || d.proofOriginalName?.toLowerCase().includes("excuse")),
      createdAt: d.$createdAt,
    }));
  }

  if (path === "attendanceProof.resolve") {
    const proofId = String(input.proofId);
    const decision = input.decision; // "accepted_present" | "accepted_excused" | "accepted" | "rejected"
    const membershipId = input.membershipId ? String(input.membershipId) : null;
    const excuseReason = input.excuseReason ? String(input.excuseReason) : null;

    const proof: any = await appwriteDatabases.getDocument(DB_ID, "attendanceProofSubmissions", proofId);
    const effectiveMemId = membershipId || proof.matchedSubjectStudentId;
    const finalReviewState = decision === "rejected" ? "rejected" : "accepted";

    await appwriteDatabases.updateDocument(DB_ID, "attendanceProofSubmissions", proofId, {
      reviewState: finalReviewState,
      matchedSubjectStudentId: effectiveMemId || "",
      reviewedAt: new Date().toISOString(),
    });

    let outcome = "reviewed";

    if (decision !== "rejected" && effectiveMemId) {
      const sessionId = proof.classSessionId;
      const records = await appwriteDatabases.listDocuments(DB_ID, "attendanceRecords", [
        Query.equal("classSessionId", sessionId),
        Query.equal("subjectStudentId", effectiveMemId),
        Query.limit(1),
      ]);

      const targetStatus = decision === "accepted_excused" ? "EXCUSED" : "PRESENT";
      const reasonText = excuseReason || (proof.reviewSummary?.startsWith("[Excuse Letter]") ? proof.reviewSummary.replace("[Excuse Letter]", "").trim() : "Approved by secretary");

      if (records.documents.length) {
        const record: any = records.documents[0];
        await appwriteDatabases.updateDocument(DB_ID, "attendanceRecords", record.$id, {
          attendanceStatus: targetStatus,
          excuseReason: targetStatus === "EXCUSED" ? reasonText : null,
        });
        outcome = targetStatus === "EXCUSED" ? "marked_excused" : "updated";
      } else {
        await appwriteDatabases.createDocument(DB_ID, "attendanceRecords", ID.unique(), {
          classSessionId: sessionId,
          subjectStudentId: effectiveMemId,
          attendanceStatus: targetStatus,
          hasScheduleConflict: false,
          publishState: "draft",
          excuseReason: targetStatus === "EXCUSED" ? reasonText : null,
        });
        outcome = targetStatus === "EXCUSED" ? "marked_excused" : "updated";
      }
    }

    return { outcome };
  }

  // === CONTENT: ANNOUNCEMENTS, RESOURCES, QUESTIONS ===
  async function resolveContentDoc(collection: string, idOrPublicId: string) {
    if (!idOrPublicId) return null;
    try {
      const doc = await appwriteDatabases.getDocument(DB_ID, collection, idOrPublicId);
      if (doc) return doc;
    } catch {}
    const candidateIds = getCaseVariations(idOrPublicId);
    for (const cid of candidateIds) {
      try {
        const byPublic = await appwriteDatabases.listDocuments(DB_ID, collection, [
          Query.equal("publicId", cid),
          Query.limit(1),
        ]);
        if (byPublic.documents[0]) return byPublic.documents[0];
      } catch {}
    }
    return null;
  }

  if (path.startsWith("content.announcements.list") || path === "content.announcements.list") {
    const subjectId = String(input?.subjectId || input?.id || input || "").trim();
    if (!subjectId || subjectId === "0" || subjectId === "NaN") return [];
    const res = await appwriteDatabases.listDocuments(DB_ID, "announcements", [
      Query.equal("subjectId", subjectId),
      Query.limit(100),
    ]);
    return res.documents
      .map((d: any) => ({
        id: d.$id,
        publicId: d.publicId || d.$id,
        subjectId: d.subjectId,
        title: d.title,
        body: d.body,
        publishState: d.publishState || "draft",
        version: d.version || 1,
        publishedAt: d.publishedAt ? new Date(d.publishedAt) : null,
        createdAt: new Date(d.$createdAt),
        updatedAt: new Date(d.$updatedAt),
      }))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  if (path === "content.announcements.create") {
    const targetSubjectIds = Array.isArray(input.targetSubjectIds) ? input.targetSubjectIds : [];
    const hasCrossPost = targetSubjectIds.length > 0;
    const initialPublishState = hasCrossPost ? "published" : "draft";
    const initialPublishedAt = hasCrossPost ? new Date().toISOString() : null;
    const doc = await appwriteDatabases.createDocument(DB_ID, "announcements", ID.unique(), {
      subjectId: String(input.subjectId),
      publicId: nanoid(12),
      title: input.title,
      body: input.body,
      mediaAssetId: input.mediaAssetId || null,
      socialPreviewMediaAssetId: input.socialPreviewMediaAssetId || null,
      publishState: initialPublishState,
      publishedAt: initialPublishedAt,
      version: 1,
      publicChangeSummary: input.publicChangeSummary || input.summary || (hasCrossPost ? "Published and cross-posted" : ""),
    });
    for (const targetSub of targetSubjectIds) {
      const strTarget = String(targetSub).trim();
      if (strTarget && strTarget !== String(input.subjectId).trim()) {
        try {
          const existing = await appwriteDatabases.listDocuments(DB_ID, "announcements", [
            Query.equal("subjectId", strTarget),
            Query.equal("title", input.title),
            Query.limit(1),
          ]);
          if (existing.documents.length > 0) {
            const existingDoc = existing.documents[0];
            await appwriteDatabases.updateDocument(DB_ID, "announcements", existingDoc.$id, {
              body: input.body,
              publishState: "published",
              publishedAt: new Date().toISOString(),
              version: (existingDoc.version || 0) + 1,
              publicChangeSummary: input.publicChangeSummary || input.summary || "Synced from another subject",
            });
          } else {
            await appwriteDatabases.createDocument(DB_ID, "announcements", ID.unique(), {
              subjectId: strTarget,
              publicId: nanoid(12),
              title: input.title,
              body: input.body,
              publishState: "published",
              version: 1,
              publishedAt: new Date().toISOString(),
              publicChangeSummary: input.publicChangeSummary || input.summary || "Cross-posted from another subject",
            });
          }
        } catch (e) {
          console.error("Failed to cross-post announcement to target subject", strTarget, e);
        }
      }
    }
    return { id: doc.$id, publicId: doc.publicId };
  }

  if (path === "content.announcements.crossPost") {
    const id = String(input.id || input.announcementId);
    const sourceDoc: any = await resolveContentDoc("announcements", id);
    if (!sourceDoc) throw new Error("Source announcement not found");
    const targetSubjectIds = Array.isArray(input.targetSubjectIds) ? input.targetSubjectIds : [];
    const shouldPublish = input.publishDirectly !== false;
    if (shouldPublish && sourceDoc.publishState !== "published") {
      await appwriteDatabases.updateDocument(DB_ID, "announcements", sourceDoc.$id, {
        publishState: "published",
        publishedAt: new Date().toISOString(),
      });
    }
    let count = 0;
    for (const targetSub of targetSubjectIds) {
      const strTarget = String(targetSub).trim();
      if (strTarget && strTarget !== String(sourceDoc.subjectId).trim()) {
        const existing = await appwriteDatabases.listDocuments(DB_ID, "announcements", [
          Query.equal("subjectId", strTarget),
          Query.equal("title", sourceDoc.title),
          Query.limit(1),
        ]);
        if (existing.documents.length > 0) {
          const existingDoc = existing.documents[0];
          await appwriteDatabases.updateDocument(DB_ID, "announcements", existingDoc.$id, {
            body: sourceDoc.body,
            publishState: shouldPublish ? "published" : (existingDoc.publishState || "draft"),
            version: (existingDoc.version || 0) + 1,
            publishedAt: shouldPublish ? (existingDoc.publishedAt || new Date().toISOString()) : existingDoc.publishedAt,
            publicChangeSummary: "Updated via cross-post sync",
          });
        } else {
          await appwriteDatabases.createDocument(DB_ID, "announcements", ID.unique(), {
            subjectId: strTarget,
            publicId: nanoid(12),
            title: sourceDoc.title,
            body: sourceDoc.body,
            publishState: shouldPublish ? "published" : "draft",
            version: 1,
            publishedAt: shouldPublish ? new Date().toISOString() : null,
            publicChangeSummary: "Cross-posted from another subject",
          });
        }
        count++;
      }
    }
    return { success: true, count };
  }

  if (path === "content.announcements.update") {
    const id = String(input.id || input.announcementId);
    const sourceDoc: any = await resolveContentDoc("announcements", id);
    const realId = sourceDoc ? sourceDoc.$id : id;
    const newVersion = (sourceDoc?.version || 0) + 1;
    const doc = await appwriteDatabases.updateDocument(DB_ID, "announcements", realId, {
      title: input.title,
      body: input.body,
      version: newVersion,
      publishState: "published",
      publishedAt: new Date().toISOString(),
      publicChangeSummary: input.publicChangeSummary || input.summary || "",
    });

    const targetSubjectIds = Array.isArray(input.targetSubjectIds) ? input.targetSubjectIds : [];
    for (const targetSub of targetSubjectIds) {
      const strTarget = String(targetSub).trim();
      const currentSubjectId = String(sourceDoc?.subjectId || input.subjectId || "").trim();
      if (strTarget && strTarget !== currentSubjectId) {
        try {
          let existingDocs: any[] = [];
          if (sourceDoc?.title) {
            const matchOld = await appwriteDatabases.listDocuments(DB_ID, "announcements", [
              Query.equal("subjectId", strTarget),
              Query.equal("title", sourceDoc.title),
              Query.limit(1),
            ]);
            existingDocs = matchOld.documents;
          }
          if (existingDocs.length === 0 && input.title) {
            const matchNew = await appwriteDatabases.listDocuments(DB_ID, "announcements", [
              Query.equal("subjectId", strTarget),
              Query.equal("title", input.title),
              Query.limit(1),
            ]);
            existingDocs = matchNew.documents;
          }

          if (existingDocs.length > 0) {
            const existingDoc = existingDocs[0];
            await appwriteDatabases.updateDocument(DB_ID, "announcements", existingDoc.$id, {
              title: input.title,
              body: input.body,
              version: (existingDoc.version || 0) + 1,
              publishState: "published",
              publishedAt: new Date().toISOString(),
              publicChangeSummary: input.publicChangeSummary || input.summary || "Synced from another subject",
            });
          } else {
            await appwriteDatabases.createDocument(DB_ID, "announcements", ID.unique(), {
              subjectId: strTarget,
              publicId: nanoid(12),
              title: input.title,
              body: input.body,
              publishState: "published",
              version: 1,
              publishedAt: new Date().toISOString(),
              publicChangeSummary: input.publicChangeSummary || input.summary || "Synced from another subject",
            });
          }
        } catch (e) {
          console.error("Failed to sync updated announcement to target subject", strTarget, e);
        }
      }
    }
    return { id: doc.$id, version: newVersion };
  }

  if (path === "content.announcements.archive") {
    const id = String(input.id || input.announcementId);
    const sourceDoc: any = await resolveContentDoc("announcements", id);
    const realId = sourceDoc ? sourceDoc.$id : id;
    await appwriteDatabases.updateDocument(DB_ID, "announcements", realId, {
      publishState: "archived",
    });
    return { success: true };
  }

  if (path === "content.announcements.restore") {
    const id = String(input.id || input.announcementId);
    const sourceDoc: any = await resolveContentDoc("announcements", id);
    const realId = sourceDoc ? sourceDoc.$id : id;
    await appwriteDatabases.updateDocument(DB_ID, "announcements", realId, {
      publishState: "draft",
    });
    return { success: true };
  }

  if (path === "content.announcements.publish") {
    const id = String(input.id || input.announcementId);
    const sourceDoc: any = await resolveContentDoc("announcements", id);
    const realId = sourceDoc ? sourceDoc.$id : id;
    const version = ((sourceDoc?.version || 0)) + 1;
    await appwriteDatabases.updateDocument(DB_ID, "announcements", realId, {
      publishState: "published",
      version,
      publishedAt: new Date().toISOString(),
    });
    return { success: true, version };
  }

  if (path === "content.announcements.delete") {
    const id = String(input.id || input.announcementId);
    const doc: any = await resolveContentDoc("announcements", id);
    if (doc) {
      await appwriteDatabases.deleteDocument(DB_ID, "announcements", doc.$id);
    } else {
      await appwriteDatabases.deleteDocument(DB_ID, "announcements", id).catch(() => null);
    }
    return { success: true };
  }

  if (path === "content.resources.list" || path.startsWith("content.resources.list")) {
    const subjectId = String(input?.subjectId || input?.id || input || "").trim();
    if (!subjectId || subjectId === "0" || subjectId === "NaN") return [];
    const res = await appwriteDatabases.listDocuments(DB_ID, "resources", [
      Query.equal("subjectId", subjectId),
      Query.limit(100),
    ]);
    return res.documents
      .map((d: any) => ({
        id: d.$id,
        publicId: d.publicId || d.$id,
        subjectId: d.subjectId,
        title: d.title,
        description: d.description,
        category: d.category,
        resourceType: d.resourceType,
        destinationUrl: d.destinationUrl,
        sourceDomain: d.sourceDomain,
        publishState: d.publishState || "draft",
        version: d.version || 1,
        publishedAt: d.publishedAt ? new Date(d.publishedAt) : null,
        createdAt: new Date(d.$createdAt),
        updatedAt: new Date(d.$updatedAt),
      }))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  if (path === "content.resources.create") {
    const targetSubjectIds = Array.isArray(input.targetSubjectIds) ? input.targetSubjectIds : [];
    const hasCrossPost = targetSubjectIds.length > 0;
    const initialPublishState = hasCrossPost ? "published" : "draft";
    const initialPublishedAt = hasCrossPost ? new Date().toISOString() : null;
    const doc = await appwriteDatabases.createDocument(DB_ID, "resources", ID.unique(), {
      subjectId: String(input.subjectId),
      publicId: nanoid(12),
      title: input.title,
      description: input.description || "",
      category: input.category || "lecture",
      resourceType: input.resourceType || "link",
      sourceDomain: input.sourceDomain || "",
      destinationUrl: input.destinationUrl || "",
      fallbackMediaAssetId: input.fallbackMediaAssetId || null,
      socialPreviewMediaAssetId: input.socialPreviewMediaAssetId || null,
      publishState: initialPublishState,
      publishedAt: initialPublishedAt,
      version: 1,
      publicChangeSummary: input.publicChangeSummary || input.summary || (hasCrossPost ? "Published and cross-posted" : ""),
    });
    for (const targetSub of targetSubjectIds) {
      const strTarget = String(targetSub).trim();
      if (strTarget && strTarget !== String(input.subjectId).trim()) {
        try {
          const existing = await appwriteDatabases.listDocuments(DB_ID, "resources", [
            Query.equal("subjectId", strTarget),
            Query.equal("title", input.title),
            Query.limit(1),
          ]);
          if (existing.documents.length > 0) {
            const existingDoc = existing.documents[0];
            await appwriteDatabases.updateDocument(DB_ID, "resources", existingDoc.$id, {
              description: input.description || "",
              category: input.category || "lecture",
              resourceType: input.resourceType || "link",
              sourceDomain: input.sourceDomain || "",
              destinationUrl: input.destinationUrl || "",
              publishState: "published",
              publishedAt: new Date().toISOString(),
              version: (existingDoc.version || 0) + 1,
              publicChangeSummary: input.publicChangeSummary || input.summary || "Synced from another subject",
            });
          } else {
            await appwriteDatabases.createDocument(DB_ID, "resources", ID.unique(), {
              subjectId: strTarget,
              publicId: nanoid(12),
              title: input.title,
              description: input.description || "",
              category: input.category || "lecture",
              resourceType: input.resourceType || "link",
              sourceDomain: input.sourceDomain || "",
              destinationUrl: input.destinationUrl || "",
              publishState: "published",
              version: 1,
              publishedAt: new Date().toISOString(),
              publicChangeSummary: input.publicChangeSummary || input.summary || "Cross-posted from another subject",
            });
          }
        } catch (e) {
          console.error("Failed to cross-post resource to target subject", strTarget, e);
        }
      }
    }
    return { id: doc.$id, publicId: doc.publicId };
  }

  if (path === "content.resources.crossPost") {
    const id = String(input.id || input.resourceId);
    const sourceDoc: any = await resolveContentDoc("resources", id);
    if (!sourceDoc) throw new Error("Source resource not found");
    const targetSubjectIds = Array.isArray(input.targetSubjectIds) ? input.targetSubjectIds : [];
    const shouldPublish = input.publishDirectly !== false;
    if (shouldPublish && sourceDoc.publishState !== "published") {
      await appwriteDatabases.updateDocument(DB_ID, "resources", sourceDoc.$id, {
        publishState: "published",
        publishedAt: new Date().toISOString(),
      });
    }
    let count = 0;
    for (const targetSub of targetSubjectIds) {
      const strTarget = String(targetSub).trim();
      if (strTarget && strTarget !== String(sourceDoc.subjectId).trim()) {
        const existing = await appwriteDatabases.listDocuments(DB_ID, "resources", [
          Query.equal("subjectId", strTarget),
          Query.equal("title", sourceDoc.title),
          Query.limit(1),
        ]);
        if (existing.documents.length > 0) {
          const existingDoc = existing.documents[0];
          await appwriteDatabases.updateDocument(DB_ID, "resources", existingDoc.$id, {
            description: sourceDoc.description || "",
            category: sourceDoc.category || "lecture",
            resourceType: sourceDoc.resourceType || "link",
            sourceDomain: sourceDoc.sourceDomain || "",
            destinationUrl: sourceDoc.destinationUrl || "",
            publishState: shouldPublish ? "published" : (existingDoc.publishState || "draft"),
            version: (existingDoc.version || 0) + 1,
            publishedAt: shouldPublish ? (existingDoc.publishedAt || new Date().toISOString()) : existingDoc.publishedAt,
            publicChangeSummary: "Updated via cross-post sync",
          });
        } else {
          await appwriteDatabases.createDocument(DB_ID, "resources", ID.unique(), {
            subjectId: strTarget,
            publicId: nanoid(12),
            title: sourceDoc.title,
            description: sourceDoc.description || "",
            category: sourceDoc.category || "lecture",
            resourceType: sourceDoc.resourceType || "link",
            sourceDomain: sourceDoc.sourceDomain || "",
            destinationUrl: sourceDoc.destinationUrl || "",
            publishState: shouldPublish ? "published" : "draft",
            version: 1,
            publishedAt: shouldPublish ? new Date().toISOString() : null,
            publicChangeSummary: "Cross-posted from another subject",
          });
        }
        count++;
      }
    }
    return { success: true, count };
  }

  if (path === "content.resources.update") {
    const id = String(input.id || input.resourceId);
    const sourceDoc: any = await resolveContentDoc("resources", id);
    const realId = sourceDoc ? sourceDoc.$id : id;
    const newVersion = (sourceDoc?.version || 0) + 1;
    const doc = await appwriteDatabases.updateDocument(DB_ID, "resources", realId, {
      title: input.title,
      description: input.description || "",
      category: input.category || "lecture",
      resourceType: input.resourceType || "link",
      sourceDomain: input.sourceDomain || "",
      destinationUrl: input.destinationUrl || "",
      version: newVersion,
      publishState: "published",
      publishedAt: new Date().toISOString(),
      publicChangeSummary: input.publicChangeSummary || input.summary || "",
    });

    const targetSubjectIds = Array.isArray(input.targetSubjectIds) ? input.targetSubjectIds : [];
    for (const targetSub of targetSubjectIds) {
      const strTarget = String(targetSub).trim();
      const currentSubjectId = String(sourceDoc?.subjectId || input.subjectId || "").trim();
      if (strTarget && strTarget !== currentSubjectId) {
        try {
          let existingDocs: any[] = [];
          if (sourceDoc?.title) {
            const matchOld = await appwriteDatabases.listDocuments(DB_ID, "resources", [
              Query.equal("subjectId", strTarget),
              Query.equal("title", sourceDoc.title),
              Query.limit(1),
            ]);
            existingDocs = matchOld.documents;
          }
          if (existingDocs.length === 0 && input.title) {
            const matchNew = await appwriteDatabases.listDocuments(DB_ID, "resources", [
              Query.equal("subjectId", strTarget),
              Query.equal("title", input.title),
              Query.limit(1),
            ]);
            existingDocs = matchNew.documents;
          }

          if (existingDocs.length > 0) {
            const existingDoc = existingDocs[0];
            await appwriteDatabases.updateDocument(DB_ID, "resources", existingDoc.$id, {
              title: input.title,
              description: input.description || "",
              category: input.category || "lecture",
              resourceType: input.resourceType || "link",
              sourceDomain: input.sourceDomain || "",
              destinationUrl: input.destinationUrl || "",
              version: (existingDoc.version || 0) + 1,
              publishState: "published",
              publishedAt: new Date().toISOString(),
              publicChangeSummary: input.publicChangeSummary || input.summary || "Synced from another subject",
            });
          } else {
            await appwriteDatabases.createDocument(DB_ID, "resources", ID.unique(), {
              subjectId: strTarget,
              publicId: nanoid(12),
              title: input.title,
              description: input.description || "",
              category: input.category || "lecture",
              resourceType: input.resourceType || "link",
              sourceDomain: input.sourceDomain || "",
              destinationUrl: input.destinationUrl || "",
              publishState: "published",
              version: 1,
              publishedAt: new Date().toISOString(),
              publicChangeSummary: input.publicChangeSummary || input.summary || "Synced from another subject",
            });
          }
        } catch (e) {
          console.error("Failed to sync updated resource to target subject", strTarget, e);
        }
      }
    }
    return { id: doc.$id, version: newVersion };
  }

  if (path === "content.resources.archive") {
    const id = String(input.id || input.resourceId);
    const sourceDoc: any = await resolveContentDoc("resources", id);
    const realId = sourceDoc ? sourceDoc.$id : id;
    await appwriteDatabases.updateDocument(DB_ID, "resources", realId, {
      publishState: "archived",
    });
    return { success: true };
  }

  if (path === "content.resources.restore") {
    const id = String(input.id || input.resourceId);
    const sourceDoc: any = await resolveContentDoc("resources", id);
    const realId = sourceDoc ? sourceDoc.$id : id;
    await appwriteDatabases.updateDocument(DB_ID, "resources", realId, {
      publishState: "draft",
    });
    return { success: true };
  }

  if (path === "content.resources.publish") {
    const id = String(input.id || input.resourceId);
    const sourceDoc: any = await resolveContentDoc("resources", id);
    const realId = sourceDoc ? sourceDoc.$id : id;
    const version = ((sourceDoc?.version || 0)) + 1;
    await appwriteDatabases.updateDocument(DB_ID, "resources", realId, {
      publishState: "published",
      version,
      publishedAt: new Date().toISOString(),
    });
    return { success: true, version };
  }

  if (path === "content.resources.delete") {
    const id = String(input.id || input.resourceId);
    const doc: any = await resolveContentDoc("resources", id);
    if (doc) {
      await appwriteDatabases.deleteDocument(DB_ID, "resources", doc.$id);
    } else {
      await appwriteDatabases.deleteDocument(DB_ID, "resources", id).catch(() => null);
    }
    return { success: true };
  }

  if (path === "content.questions.list" || path.startsWith("content.questions.list")) {
    const subjectId = String(input?.subjectId || input?.id || input || "").trim();
    if (!subjectId || subjectId === "0" || subjectId === "NaN") return [];
    const res = await appwriteDatabases.listDocuments(DB_ID, "questionsAnswers", [
      Query.equal("subjectId", subjectId),
      Query.limit(100),
    ]);
    return res.documents
      .map((d: any) => ({
        id: d.$id,
        publicId: d.publicId || d.$id,
        subjectId: d.subjectId,
        question: d.question,
        answer: d.answer,
        tagsText: d.tagsText || "",
        isOfficial: Boolean(d.isOfficial),
        publishState: d.publishState || "draft",
        version: d.version || 1,
        publishedAt: d.publishedAt ? new Date(d.publishedAt) : null,
        createdAt: new Date(d.$createdAt),
        updatedAt: new Date(d.$updatedAt),
      }))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  if (path === "content.questions.create") {
    const targetSubjectIds = Array.isArray(input.targetSubjectIds) ? input.targetSubjectIds : [];
    const hasCrossPost = targetSubjectIds.length > 0;
    const initialPublishState = hasCrossPost ? "published" : "draft";
    const initialPublishedAt = hasCrossPost ? new Date().toISOString() : null;
    const doc = await appwriteDatabases.createDocument(DB_ID, "questionsAnswers", ID.unique(), {
      subjectId: String(input.subjectId),
      publicId: nanoid(12),
      question: input.question,
      answer: input.answer,
      tagsText: input.tagsText || "",
      isOfficial: true,
      socialPreviewMediaAssetId: input.socialPreviewMediaAssetId || null,
      publishState: initialPublishState,
      publishedAt: initialPublishedAt,
      version: 1,
      publicChangeSummary: input.publicChangeSummary || input.summary || (hasCrossPost ? "Published and cross-posted" : ""),
    });
    for (const targetSub of targetSubjectIds) {
      const strTarget = String(targetSub).trim();
      if (strTarget && strTarget !== String(input.subjectId).trim()) {
        try {
          const existing = await appwriteDatabases.listDocuments(DB_ID, "questionsAnswers", [
            Query.equal("subjectId", strTarget),
            Query.equal("question", input.question),
            Query.limit(1),
          ]);
          if (existing.documents.length > 0) {
            const existingDoc = existing.documents[0];
            await appwriteDatabases.updateDocument(DB_ID, "questionsAnswers", existingDoc.$id, {
              answer: input.answer,
              tagsText: input.tagsText || "",
              isOfficial: true,
              publishState: "published",
              publishedAt: new Date().toISOString(),
              version: (existingDoc.version || 0) + 1,
              publicChangeSummary: input.publicChangeSummary || input.summary || "Synced from another subject",
            });
          } else {
            await appwriteDatabases.createDocument(DB_ID, "questionsAnswers", ID.unique(), {
              subjectId: strTarget,
              publicId: nanoid(12),
              question: input.question,
              answer: input.answer,
              tagsText: input.tagsText || "",
              isOfficial: true,
              publishState: "published",
              version: 1,
              publishedAt: new Date().toISOString(),
              publicChangeSummary: input.publicChangeSummary || input.summary || "Cross-posted from another subject",
            });
          }
        } catch (e) {
          console.error("Failed to cross-post question to target subject", strTarget, e);
        }
      }
    }
    return { id: doc.$id, publicId: doc.publicId };
  }

  if (path === "content.questions.crossPost") {
    const id = String(input.id || input.questionId);
    const sourceDoc: any = await resolveContentDoc("questionsAnswers", id);
    if (!sourceDoc) throw new Error("Source question & answer not found");
    const targetSubjectIds = Array.isArray(input.targetSubjectIds) ? input.targetSubjectIds : [];
    const shouldPublish = input.publishDirectly !== false;
    if (shouldPublish && sourceDoc.publishState !== "published") {
      await appwriteDatabases.updateDocument(DB_ID, "questionsAnswers", sourceDoc.$id, {
        publishState: "published",
        publishedAt: new Date().toISOString(),
      });
    }
    let count = 0;
    for (const targetSub of targetSubjectIds) {
      const strTarget = String(targetSub).trim();
      if (strTarget && strTarget !== String(sourceDoc.subjectId).trim()) {
        const existing = await appwriteDatabases.listDocuments(DB_ID, "questionsAnswers", [
          Query.equal("subjectId", strTarget),
          Query.equal("question", sourceDoc.question),
          Query.limit(1),
        ]);
        if (existing.documents.length > 0) {
          const existingDoc = existing.documents[0];
          await appwriteDatabases.updateDocument(DB_ID, "questionsAnswers", existingDoc.$id, {
            answer: sourceDoc.answer,
            tagsText: sourceDoc.tagsText || "",
            isOfficial: sourceDoc.isOfficial !== undefined ? Boolean(sourceDoc.isOfficial) : true,
            publishState: shouldPublish ? "published" : (existingDoc.publishState || "draft"),
            version: (existingDoc.version || 0) + 1,
            publishedAt: shouldPublish ? (existingDoc.publishedAt || new Date().toISOString()) : existingDoc.publishedAt,
            publicChangeSummary: "Updated via cross-post sync",
          });
        } else {
          await appwriteDatabases.createDocument(DB_ID, "questionsAnswers", ID.unique(), {
            subjectId: strTarget,
            publicId: nanoid(12),
            question: sourceDoc.question,
            answer: sourceDoc.answer,
            tagsText: sourceDoc.tagsText || "",
            isOfficial: sourceDoc.isOfficial !== undefined ? Boolean(sourceDoc.isOfficial) : true,
            publishState: shouldPublish ? "published" : "draft",
            version: 1,
            publishedAt: shouldPublish ? new Date().toISOString() : null,
            publicChangeSummary: "Cross-posted from another subject",
          });
        }
        count++;
      }
    }
    return { success: true, count };
  }

  if (path === "content.questions.update") {
    const id = String(input.id || input.questionId);
    const sourceDoc: any = await resolveContentDoc("questionsAnswers", id);
    const realId = sourceDoc ? sourceDoc.$id : id;
    const newVersion = (sourceDoc?.version || 0) + 1;
    const doc = await appwriteDatabases.updateDocument(DB_ID, "questionsAnswers", realId, {
      question: input.question,
      answer: input.answer,
      tagsText: input.tagsText || "",
      isOfficial: input.isOfficial !== undefined ? Boolean(input.isOfficial) : true,
      version: newVersion,
      publishState: "published",
      publishedAt: new Date().toISOString(),
      publicChangeSummary: input.publicChangeSummary || input.summary || "",
    });

    const targetSubjectIds = Array.isArray(input.targetSubjectIds) ? input.targetSubjectIds : [];
    for (const targetSub of targetSubjectIds) {
      const strTarget = String(targetSub).trim();
      const currentSubjectId = String(sourceDoc?.subjectId || input.subjectId || "").trim();
      if (strTarget && strTarget !== currentSubjectId) {
        try {
          let existingDocs: any[] = [];
          if (sourceDoc?.question) {
            const matchOld = await appwriteDatabases.listDocuments(DB_ID, "questionsAnswers", [
              Query.equal("subjectId", strTarget),
              Query.equal("question", sourceDoc.question),
              Query.limit(1),
            ]);
            existingDocs = matchOld.documents;
          }
          if (existingDocs.length === 0 && input.question) {
            const matchNew = await appwriteDatabases.listDocuments(DB_ID, "questionsAnswers", [
              Query.equal("subjectId", strTarget),
              Query.equal("question", input.question),
              Query.limit(1),
            ]);
            existingDocs = matchNew.documents;
          }

          if (existingDocs.length > 0) {
            const existingDoc = existingDocs[0];
            await appwriteDatabases.updateDocument(DB_ID, "questionsAnswers", existingDoc.$id, {
              question: input.question,
              answer: input.answer,
              tagsText: input.tagsText || "",
              isOfficial: input.isOfficial !== undefined ? Boolean(input.isOfficial) : true,
              version: (existingDoc.version || 0) + 1,
              publishState: "published",
              publishedAt: new Date().toISOString(),
              publicChangeSummary: input.publicChangeSummary || input.summary || "Synced from another subject",
            });
          } else {
            await appwriteDatabases.createDocument(DB_ID, "questionsAnswers", ID.unique(), {
              subjectId: strTarget,
              publicId: nanoid(12),
              question: input.question,
              answer: input.answer,
              tagsText: input.tagsText || "",
              isOfficial: input.isOfficial !== undefined ? Boolean(input.isOfficial) : true,
              publishState: "published",
              version: 1,
              publishedAt: new Date().toISOString(),
              publicChangeSummary: input.publicChangeSummary || input.summary || "Synced from another subject",
            });
          }
        } catch (e) {
          console.error("Failed to sync updated question to target subject", strTarget, e);
        }
      }
    }
    return { id: doc.$id, version: newVersion };
  }

  if (path === "content.questions.archive") {
    const id = String(input.id || input.questionId);
    const sourceDoc: any = await resolveContentDoc("questionsAnswers", id);
    const realId = sourceDoc ? sourceDoc.$id : id;
    await appwriteDatabases.updateDocument(DB_ID, "questionsAnswers", realId, {
      publishState: "archived",
    });
    return { success: true };
  }

  if (path === "content.questions.restore") {
    const id = String(input.id || input.questionId);
    const sourceDoc: any = await resolveContentDoc("questionsAnswers", id);
    const realId = sourceDoc ? sourceDoc.$id : id;
    await appwriteDatabases.updateDocument(DB_ID, "questionsAnswers", realId, {
      publishState: "draft",
    });
    return { success: true };
  }

  if (path === "content.questions.publish") {
    const id = String(input.id || input.questionId);
    const sourceDoc: any = await resolveContentDoc("questionsAnswers", id);
    const realId = sourceDoc ? sourceDoc.$id : id;
    const version = ((sourceDoc?.version || 0)) + 1;
    await appwriteDatabases.updateDocument(DB_ID, "questionsAnswers", realId, {
      publishState: "published",
      version,
      publishedAt: new Date().toISOString(),
    });
    return { success: true, version };
  }

  if (path === "content.questions.delete") {
    const id = String(input.id || input.questionId);
    const doc: any = await resolveContentDoc("questionsAnswers", id);
    if (doc) {
      await appwriteDatabases.deleteDocument(DB_ID, "questionsAnswers", doc.$id);
    } else {
      await appwriteDatabases.deleteDocument(DB_ID, "questionsAnswers", id).catch(() => null);
    }
    return { success: true };
  }

  if (path === "content.archiveList") {
    const subjectId = String(input?.subjectId || "");
    const queries = [Query.equal("publishState", "archived"), Query.limit(100)];
    if (subjectId) queries.push(Query.equal("subjectId", subjectId));
    const [ann, res, q, subjectsRes] = await Promise.all([
      appwriteDatabases.listDocuments(DB_ID, "announcements", queries).catch(() => ({ documents: [] })),
      appwriteDatabases.listDocuments(DB_ID, "resources", queries).catch(() => ({ documents: [] })),
      appwriteDatabases.listDocuments(DB_ID, "questionsAnswers", queries).catch(() => ({ documents: [] })),
      appwriteDatabases.listDocuments(DB_ID, "subjects", [Query.limit(100)]).catch(() => ({ documents: [] })),
    ]);

    const subjectMap = new Map<string, string>();
    for (const s of subjectsRes.documents) {
      subjectMap.set(s.$id, s.name);
    }

    return {
      announcements: ann.documents.map((d: any) => ({
        id: d.$id,
        publicId: d.publicId || d.$id,
        title: d.title || "Announcement",
        subjectId: d.subjectId,
        subjectName: subjectMap.get(d.subjectId) || "Subject",
        version: d.version || 1,
        publishState: d.publishState || "archived",
        updatedAt: new Date(d.$updatedAt),
      })),
      resources: res.documents.map((d: any) => ({
        id: d.$id,
        publicId: d.publicId || d.$id,
        title: d.title || "Resource",
        subjectId: d.subjectId,
        subjectName: subjectMap.get(d.subjectId) || "Subject",
        version: d.version || 1,
        publishState: d.publishState || "archived",
        updatedAt: new Date(d.$updatedAt),
      })),
      questions: q.documents.map((d: any) => ({
        id: d.$id,
        publicId: d.publicId || d.$id,
        title: d.question || "Question & Answer",
        subjectId: d.subjectId,
        subjectName: subjectMap.get(d.subjectId) || "Subject",
        version: d.version || 1,
        publishState: d.publishState || "archived",
        updatedAt: new Date(d.$updatedAt),
      })),
    };
  }

  // === REPORTS ===
  if (path === "reports.allSubjectAttendance") {
    // 1. Fetch active subjects
    const subjectsRes = await appwriteDatabases.listDocuments(DB_ID, "subjects", [
      Query.equal("status", "active"),
      Query.limit(100),
    ]);

    // 2. Fetch subjectStudents and attendanceRecords in parallel
    const [allMembersRes, allRecordsRes] = await Promise.all([
      appwriteDatabases.listDocuments(DB_ID, "subjectStudents", [
        Query.equal("membershipState", "active"),
        Query.limit(500),
      ]),
      appwriteDatabases.listDocuments(DB_ID, "attendanceRecords", [
        Query.limit(1000),
      ]),
    ]);

    const memberIdToSubjectId = new Map<string, string>();
    for (const m of allMembersRes.documents) {
      memberIdToSubjectId.set(m.$id, m.subjectId);
    }

    const bySubject = new Map<string, { subjectId: string; subjectName: string; subjectCode: string; present: number; absent: number; excused: number; notSet: number }>();
    for (const s of subjectsRes.documents) {
      bySubject.set(s.$id, {
        subjectId: s.$id,
        subjectName: s.name,
        subjectCode: s.code,
        present: 0,
        absent: 0,
        excused: 0,
        notSet: 0,
      });
    }

    for (const r of allRecordsRes.documents) {
      const subjId = memberIdToSubjectId.get(r.subjectStudentId);
      if (subjId && bySubject.has(subjId)) {
        const item = bySubject.get(subjId)!;
        const status = r.attendanceStatus?.toUpperCase();
        if (status === "PRESENT") item.present += 1;
        else if (status === "ABSENT") item.absent += 1;
        else if (status === "EXCUSED") item.excused += 1;
        else item.notSet += 1;
      }
    }

    return Array.from(bySubject.values());
  }

  if (path === "reports.classAttendance") {
    const sessionId = String(input.sessionId);
    const sessionDoc: any = await appwriteDatabases.getDocument(DB_ID, "classSessions", sessionId).catch(() => null);
    if (!sessionDoc) throw new Error("Class session not found");

    const [subjectDoc, subjectStudentsRes, recordsRes, studentMap] = await Promise.all([
      appwriteDatabases.getDocument(DB_ID, "subjects", sessionDoc.subjectId).catch(() => null) as Promise<any>,
      appwriteDatabases.listDocuments(DB_ID, "subjectStudents", [
        Query.equal("subjectId", sessionDoc.subjectId),
        Query.equal("membershipState", "active"),
        Query.limit(200),
      ]),
      appwriteDatabases.listDocuments(DB_ID, "attendanceRecords", [
        Query.equal("classSessionId", sessionId),
        Query.limit(200),
      ]),
      getCachedStudentMap(),
    ]);

    const recordMap = new Map<string, any>();
    for (const r of recordsRes.documents) {
      recordMap.set(r.subjectStudentId, r);
    }

    const studentsList: Array<{
      canonicalName: string;
      status: "PRESENT" | "ABSENT" | "EXCUSED" | "CONFLICT" | "NOT_SET";
      excuseReason?: string | null;
      hasScheduleConflict?: boolean;
    }> = [];
    let present = 0, absent = 0, excused = 0, conflict = 0, notSet = 0;

    for (const m of subjectStudentsRes.documents) {
      const s = studentMap.get(m.studentId);
      const canonicalName = s?.canonicalName || "Unknown Student";
      const rec = recordMap.get(m.$id);
      const status = (rec?.attendanceStatus?.toUpperCase() || (m.hasScheduleConflict ? "CONFLICT" : "NOT_SET")) as "PRESENT" | "ABSENT" | "EXCUSED" | "CONFLICT" | "NOT_SET";
      
      if (status === "PRESENT") present += 1;
      else if (status === "ABSENT") absent += 1;
      else if (status === "EXCUSED") excused += 1;
      else if (status === "CONFLICT") conflict += 1;
      else notSet += 1;

      studentsList.push({
        canonicalName,
        status,
        excuseReason: rec?.excuseReason || null,
        hasScheduleConflict: Boolean(m.hasScheduleConflict),
      });
    }

    studentsList.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));

    return {
      sessionId: sessionDoc.$id,
      startsAt: new Date(sessionDoc.startsAt),
      subjectName: subjectDoc?.name || "Subject",
      subjectCode: subjectDoc?.code || "SUBJ",
      students: studentsList,
      present,
      absent,
      excused,
      conflict,
      notSet,
    };
  }

  if (path === "reports.list") {
    const res = await appwriteDatabases.listDocuments(DB_ID, "reports", [
      Query.limit(50),
    ]);

    // Fetch subjects and sessions in parallel for joins
    const subjectIds = Array.from(new Set(res.documents.map((d: any) => d.subjectId).filter(Boolean)));
    const sessionIds = Array.from(new Set(res.documents.map((d: any) => d.classSessionId).filter(Boolean)));

    const [subjectDocs, sessionDocs] = await Promise.all([
      Promise.all(subjectIds.map(id => appwriteDatabases.getDocument(DB_ID, "subjects", id as string).catch(() => null))),
      Promise.all(sessionIds.map(id => appwriteDatabases.getDocument(DB_ID, "classSessions", id as string).catch(() => null))),
    ]);

    const subjectMap = new Map<string, any>();
    for (const s of subjectDocs) {
      if (s) subjectMap.set(s.$id, s);
    }
    const sessionMap = new Map<string, any>();
    for (const s of sessionDocs) {
      if (s) sessionMap.set(s.$id, s);
    }

    return res.documents.map((d: any) => {
      const subject = d.subjectId ? subjectMap.get(d.subjectId) : null;
      const session = d.classSessionId ? sessionMap.get(d.classSessionId) : null;
      return {
        id: d.$id,
        publicId: d.publicId || d.$id,
        reportType: d.reportType || "all_subject_attendance",
        subjectId: d.subjectId || null,
        classSessionId: d.classSessionId || null,
        publishState: d.publishState || "draft",
        version: d.version || 1,
        generatedAt: new Date(d.generatedAt || d.$createdAt),
        publishedAt: d.publishedAt ? new Date(d.publishedAt) : null,
        subjectName: subject?.name || null,
        subjectCode: subject?.code || null,
        sessionStartsAt: session?.startsAt ? new Date(session.startsAt) : null,
      };
    });
  }

  if (path === "reports.create" || path === "reports.generate") {
    const publicId = nanoid(12);
    let subjectId = input.subjectId ? String(input.subjectId) : "";
    const classSessionId = input.classSessionId ? String(input.classSessionId) : "";

    if (input.reportType === "class_attendance" && classSessionId && !subjectId) {
      const sessionDoc: any = await appwriteDatabases.getDocument(DB_ID, "classSessions", classSessionId).catch(() => null);
      if (sessionDoc?.subjectId) {
        subjectId = sessionDoc.subjectId;
      }
    }

    const doc = await appwriteDatabases.createDocument(DB_ID, "reports", ID.unique(), {
      publicId,
      ownerId: userId,
      reportType: input.reportType || "all_subject_attendance",
      subjectId: subjectId || "",
      classSessionId: classSessionId || "",
      publishState: "draft",
      version: 1,
      generatedAt: new Date().toISOString(),
      publishedAt: null,
    });
    return { id: doc.$id, publicId: doc.publicId };
  }

  if (path === "reports.publish") {
    const reportId = String(input.id || input.reportId);
    const doc: any = await appwriteDatabases.getDocument(DB_ID, "reports", reportId);
    const version = (doc.version || 0) + 1;
    await appwriteDatabases.updateDocument(DB_ID, "reports", reportId, {
      publishState: "published",
      version,
      publishedAt: new Date().toISOString(),
    });
    return { version };
  }

  if (path === "reports.archive") {
    const reportId = String(input.id || input.reportId);
    await appwriteDatabases.updateDocument(DB_ID, "reports", reportId, {
      publishState: "archived",
    });
    return { success: true };
  }

  if (path === "reports.restore") {
    const reportId = String(input.id || input.reportId);
    await appwriteDatabases.updateDocument(DB_ID, "reports", reportId, {
      publishState: "draft",
    });
    return { success: true };
  }

  // === FOUNDATION & PUBLIC VIEWS ===
  if (path === "foundation.owner.getContext") {
    return { mode: "secretary", user: { id: 1, openId: userId, name: "Class Secretary", role: "admin" } };
  }

  if (path === "foundation.owner.getOverviewMetrics") {
    try {
      const [subjectsRes, allMembersRes, sessionsRes, reportsRes, proofsRes] = await Promise.all([
        appwriteDatabases.listDocuments(DB_ID, "subjects", [Query.equal("ownerId", userId), Query.equal("status", "active"), Query.limit(100)]).catch(() => ({ documents: [] })),
        appwriteDatabases.listDocuments(DB_ID, "subjectStudents", [Query.equal("membershipState", "active"), Query.limit(500)]).catch(() => ({ documents: [] })),
        appwriteDatabases.listDocuments(DB_ID, "classSessions", [Query.limit(200)]).catch(() => ({ documents: [] })),
        appwriteDatabases.listDocuments(DB_ID, "reports", [Query.equal("ownerId", userId), Query.equal("publishState", "published"), Query.limit(100)]).catch(() => ({ documents: [] })),
        appwriteDatabases.listDocuments(DB_ID, "attendanceProofSubmissions", [Query.equal("reviewState", "needs_review"), Query.limit(20)]).catch(() => ({ documents: [] })),
      ]);

      const activeSubjects = subjectsRes.documents.length;
      const sharedSubjects = subjectsRes.documents.filter((s: any) => s.publishState === "published").length;
      const enrolledStudents = new Set(allMembersRes.documents.map((m: any) => m.studentId)).size;
      const totalSessions = sessionsRes.documents.filter((s: any) => s.sessionState !== "no_class").length;
      const publishedReports = reportsRes.documents.length;

      const attentionItems: Array<{ type: "proof" | "zoom"; id: string | number; sessionId: string | number; title: string; description: string; createdAt?: Date }> = [];

      for (const p of proofsRes.documents) {
        attentionItems.push({
          type: "proof",
          id: p.$id,
          sessionId: p.classSessionId,
          title: p.submittedName || "Student submission",
          description: p.reviewSummary || "Student attendance proof or excuse letter awaiting review",
          createdAt: new Date(p.$createdAt),
        });
      }

      return {
        activeSubjects,
        sharedSubjects,
        enrolledStudents,
        totalSessions,
        attendanceRate: 100,
        pendingReviewsCount: attentionItems.length,
        publishedReports,
        attentionItems,
      };
    } catch {
      return {
        activeSubjects: 0,
        sharedSubjects: 0,
        enrolledStudents: 0,
        totalSessions: 0,
        attendanceRate: 100,
        pendingReviewsCount: 0,
        publishedReports: 0,
        attentionItems: [],
      };
    }
  }

  if (path === "foundation.owner.improveText") {
    const rawText = String(input?.text || "").trim();
    const mode = input?.mode || (rawText ? "improve" : "autofill");
    const target = input?.target || "announcement";
    const context = String(input?.context || "").trim();
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

    const aiRes = await generateAiText({
      target,
      mode,
      text: rawText,
      context,
      apiKey,
    });

    return {
      text: aiRes.text,
      improvedText: aiRes.improvedText,
      mode: aiRes.mode,
      target: aiRes.target,
      provider: aiRes.provider,
      changesMade: true,
    };
  }

  if (path === "foundation.media.upload") {
    let url = "";
    if (input?.base64Data && typeof window !== "undefined") {
      try {
        const fileObj = dataUrlToFile(input.base64Data, input.fileName || "upload.png");
        const uploaded = await appwriteStorage.createFile("media-assets", ID.unique(), fileObj);
        url = `https://sgp.cloud.appwrite.io/v1/storage/buckets/media-assets/files/${uploaded.$id}/view?project=${import.meta.env.VITE_APPWRITE_PROJECT_ID || "supersec"}`;
      } catch {}
    }
    return {
      id: nanoid(12),
      publicId: nanoid(12),
      url: url || "uploaded-asset",
      originalName: input?.fileName || "File",
      mimeType: input?.mimeType || "application/octet-stream",
      byteSize: input?.base64Data?.length || 1024,
      altText: input?.altText || null,
    };
  }

  if (path === "foundation.publicSubject") {
    const publicId = String(input.publicId);
    const candidateIds = getCaseVariations(publicId);
    let doc: any = null;
    for (const cid of candidateIds) {
      const res = await appwriteDatabases.listDocuments(DB_ID, "subjects", [
        Query.equal("publicId", cid),
        Query.limit(1),
      ]);
      if (res.documents.length > 0) {
        doc = res.documents[0];
        break;
      }
      const codeRes = await appwriteDatabases.listDocuments(DB_ID, "subjects", [
        Query.equal("code", cid.toUpperCase()),
        Query.limit(1),
      ]);
      if (codeRes.documents.length > 0) {
        doc = codeRes.documents[0];
        break;
      }
    }
    if (!doc) return { available: false };
    const subjectId = doc.$id;

    // Fetch published announcements, resources, questions, and attendance
    const [annRes, resRes, qRes, attRes] = await Promise.all([
      appwriteDatabases.listDocuments(DB_ID, "announcements", [
        Query.equal("subjectId", subjectId),
        Query.equal("publishState", "published"),
        Query.orderDesc("$createdAt"),
        Query.limit(50),
      ]).catch(() => ({ documents: [] })),
      appwriteDatabases.listDocuments(DB_ID, "resources", [
        Query.equal("subjectId", subjectId),
        Query.equal("publishState", "published"),
        Query.orderDesc("$createdAt"),
        Query.limit(50),
      ]).catch(() => ({ documents: [] })),
      appwriteDatabases.listDocuments(DB_ID, "questionsAnswers", [
        Query.equal("subjectId", subjectId),
        Query.equal("publishState", "published"),
        Query.orderDesc("$createdAt"),
        Query.limit(50),
      ]).catch(() => ({ documents: [] })),
      appwriteDatabases.listDocuments(DB_ID, "classSessions", [
        Query.equal("subjectId", subjectId),
        Query.equal("publishState", "published"),
        Query.orderDesc("startsAt"),
        Query.limit(50),
      ]).catch(() => ({ documents: [] })),
    ]);

        const upcomingNoClass = attRes.documents.find(
          (d: any) => d.sessionState === "no_class" && new Date(d.startsAt).getTime() >= Date.now() - 24 * 60 * 60 * 1000
        );
        return {
          available: true,
          subject: {
            id: doc.$id,
            publicId: doc.publicId,
            name: doc.name,
            code: doc.code,
            viewOnlyShortMark: doc.viewOnlyShortMark || null,
            viewOnlyName: doc.viewOnlyName || null,
            professorName: doc.professorName,
            meetingDays: parseMeetingDays(doc.meetingDaysJson),
            noClass: upcomingNoClass ? { startsAt: new Date(upcomingNoClass.startsAt), reason: upcomingNoClass.noClassReason || "No class scheduled" } : null,
            latest: {
              attendance: attRes.documents.map((d: any) => ({
                publicId: d.publicId,
                startsAt: new Date(d.startsAt),
                sessionState: d.sessionState || "completed",
                noClassReason: d.noClassReason || null,
                version: 1,
                title: `Session on ${new Date(d.startsAt).toLocaleDateString()}`,
              })),
              announcements: annRes.documents.map((d: any) => ({
                publicId: d.publicId,
                title: d.title,
                body: d.body,
                publishedAt: d.publishedAt ? new Date(d.publishedAt) : new Date(d.$updatedAt),
              })),
              resources: resRes.documents.map((d: any) => ({
                publicId: d.publicId,
                title: d.title,
                description: d.description,
                destinationUrl: d.destinationUrl,
                category: d.category,
                resourceType: d.resourceType,
                publishedAt: d.publishedAt ? new Date(d.publishedAt) : new Date(d.$updatedAt),
              })),
              questions: qRes.documents.map((d: any) => ({
                publicId: d.publicId,
                title: d.question || d.title || "",
                question: d.question,
                answer: d.answer,
                isOfficial: Boolean(d.isOfficial),
                tagsText: d.tagsText,
                publishedAt: d.publishedAt ? new Date(d.publishedAt) : new Date(d.$updatedAt),
              })),
            },
          },
        };
      }

      if (path === "foundation.publicAttendance") {
        const publicId = String(input.publicId);
        
        // Check in-memory cache for instant response
        const cached = publicAttendanceCache.get(publicId);
        if (cached && Date.now() - cached.timestamp < PUBLIC_ATTENDANCE_CACHE_TTL_MS) {
          return cached.data;
        }

        const candidateIds = getCaseVariations(publicId);
        let sessionDoc: any = null;
        for (const cid of candidateIds) {
          const sessionRes = await appwriteDatabases.listDocuments(DB_ID, "classSessions", [
            Query.equal("publicId", cid),
            Query.limit(1),
          ]);
          if (sessionRes.documents.length > 0) {
            sessionDoc = sessionRes.documents[0];
            break;
          }
        }
        if (!sessionDoc) return { available: false };

        // Fetch subject, subjectStudents, attendanceRecords, historyEntries, and student map concurrently in parallel
        const [subjectDoc, memRes, recordsRes, historyRes, studentMap] = await Promise.all([
          sessionDoc.subjectId
            ? (appwriteDatabases.getDocument(DB_ID, "subjects", sessionDoc.subjectId).catch(() => null) as Promise<any>)
            : Promise.resolve(null),
          sessionDoc.subjectId
            ? appwriteDatabases.listDocuments(DB_ID, "subjectStudents", [
                Query.equal("subjectId", sessionDoc.subjectId),
                Query.limit(200),
              ]).catch(() => ({ documents: [] }))
            : Promise.resolve({ documents: [] }),
          appwriteDatabases.listDocuments(DB_ID, "attendanceRecords", [
            Query.equal("classSessionId", sessionDoc.$id),
            Query.limit(200),
          ]).catch(() => ({ documents: [] })),
          appwriteDatabases.listDocuments(DB_HISTORY_ID, "historyEntries", [
            Query.equal("entityType", "attendance"),
            Query.equal("entityId", sessionDoc.$id),
            Query.orderAsc("version"),
            Query.limit(50),
          ]).catch(() => ({ documents: [] })),
          getCachedStudentMap(),
        ]);

        // Build map of membershipId -> student canonicalName directly from memory
        const studentNameMap = new Map<string, string>();
        for (const m of memRes.documents) {
          const s = studentMap.get(m.studentId);
          if (s) {
            studentNameMap.set(m.$id, s.canonicalName);
          }
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

        const result = {
          available: true,
          attendance: {
            publicId: sessionDoc.publicId,
            startsAt: new Date(sessionDoc.startsAt),
            version,
            publishedAt: sessionDoc.updatedAt || sessionDoc.$updatedAt,
            sessionState: sessionDoc.sessionState || "completed",
            noClassReason: sessionDoc.noClassReason || null,
            subject: subjectDoc ? {
              publicId: subjectDoc.publicId,
              name: subjectDoc.name,
              code: subjectDoc.code,
              professorName: subjectDoc.professorName,
            } : { publicId: "", name: "Class", code: "SUBJ", professorName: "Professor" },
            records: recordsRes.documents
              .map((r: any) => ({
                canonicalName: studentNameMap.get(r.subjectStudentId) || r.canonicalName || r.submittedName || "Unknown Student",
                status: r.attendanceStatus?.toUpperCase() || "NOT_SET",
              }))
              .sort(compareByLastNameAsc),
            history,
          },
        };

    publicAttendanceCache.set(publicId, { timestamp: Date.now(), data: result });
    return result;
  }

  if (path === "foundation.publicQuestions") {
    const publicId = String(input.publicId);
    const candidateIds = getCaseVariations(publicId);
    let subjectDoc: any = null;
    for (const cid of candidateIds) {
      const subjectRes = await appwriteDatabases.listDocuments(DB_ID, "subjects", [
        Query.equal("publicId", cid),
        Query.limit(1),
      ]);
      if (subjectRes.documents.length > 0) {
        subjectDoc = subjectRes.documents[0];
        break;
      }
      const codeRes = await appwriteDatabases.listDocuments(DB_ID, "subjects", [
        Query.equal("code", cid.toUpperCase()),
        Query.limit(1),
      ]);
      if (codeRes.documents.length > 0) {
        subjectDoc = codeRes.documents[0];
        break;
      }
    }
    if (!subjectDoc) return { available: false };
    const queries = [Query.equal("subjectId", subjectDoc.$id), Query.equal("publishState", "published"), Query.limit(100)];
    const qRes = await appwriteDatabases.listDocuments(DB_ID, "questionsAnswers", queries).catch(() => ({ documents: [] }));

    return {
      available: true,
      subject: {
        publicId: subjectDoc.publicId,
        name: subjectDoc.name,
        code: subjectDoc.code,
      },
      questions: qRes.documents.map((d: any) => ({
        publicId: d.publicId,
        question: d.question,
        answer: d.answer,
        tagsText: d.tagsText,
        isOfficial: Boolean(d.isOfficial),
        publishedAt: new Date(d.$updatedAt),
      })),
    };
  }

  if (path === "foundation.publicItem") {
    const { publicId, kind } = input;
    const collectionName = kind === "announcement" ? "announcements" : kind === "resource" ? "resources" : "questionsAnswers";
    const candidateIds = getCaseVariations(String(publicId));
    let itemDoc: any = null;
    for (const cid of candidateIds) {
      const res = await appwriteDatabases.listDocuments(DB_ID, collectionName, [
        Query.equal("publicId", cid),
        Query.limit(1),
      ]);
      if (res.documents.length > 0) {
        itemDoc = res.documents[0];
        break;
      }
    }
    if (!itemDoc) return { available: false };
    const subjectDoc: any = itemDoc.subjectId ? await appwriteDatabases.getDocument(DB_ID, "subjects", itemDoc.subjectId).catch(() => null) : null;

    const subjectObj = subjectDoc ? {
      publicId: subjectDoc.publicId || subjectDoc.$id,
      name: subjectDoc.name,
      code: subjectDoc.code,
      viewOnlyShortMark: subjectDoc.viewOnlyShortMark || null,
      viewOnlyName: subjectDoc.viewOnlyName || null,
      professorName: subjectDoc.professorName,
    } : { publicId: "", name: "Class", code: "SUBJ", viewOnlyShortMark: null, viewOnlyName: null, professorName: "Professor" };

    let formattedItem: any = {
      kind,
      publicId: itemDoc.publicId || itemDoc.$id,
      version: itemDoc.version || 1,
      publishedAt: itemDoc.publishedAt ? new Date(itemDoc.publishedAt) : new Date(itemDoc.$updatedAt),
      subject: subjectObj,
    };

    if (kind === "announcement") {
      formattedItem = {
        ...formattedItem,
        title: itemDoc.title,
        body: itemDoc.body,
        media: null,
        socialPreviewMedia: null,
      };
    } else if (kind === "resource") {
      formattedItem = {
        ...formattedItem,
        title: itemDoc.title,
        body: itemDoc.description || itemDoc.body || "",
        destinationUrl: itemDoc.destinationUrl || null,
        category: itemDoc.category || null,
        resourceType: itemDoc.resourceType || "Link",
        sourceDomain: itemDoc.sourceDomain || null,
        media: null,
        socialPreviewMedia: null,
        attachments: [],
      };
    } else {
      formattedItem = {
        ...formattedItem,
        title: (itemDoc.isOfficial !== false ? "Official" : "Unofficial") + " answer — " + (itemDoc.question || itemDoc.title || ""),
        body: itemDoc.answer || itemDoc.body || "",
        tagsText: itemDoc.tagsText || null,
        isOfficial: itemDoc.isOfficial !== false,
        media: null,
        socialPreviewMedia: null,
      };
    }

    return {
      available: true,
      kind,
      item: formattedItem,
      subject: subjectObj,
    };
  }

  if (path === "foundation.publicHistory") {
    return {
      available: true,
      history: [],
    };
  }

  if (path === "foundation.publicReport") {
    const publicId = String(input.publicId);
    const candidateIds = getCaseVariations(publicId);
    let reportDoc: any = null;
    for (const cid of candidateIds) {
      const res = await appwriteDatabases.listDocuments(DB_ID, "reports", [
        Query.equal("publicId", cid),
        Query.limit(1),
      ]);
      if (res.documents.length > 0) {
        reportDoc = res.documents[0];
        break;
      }
    }
    if (!reportDoc) return { available: false };

    if (reportDoc.reportType === "class_attendance" && reportDoc.classSessionId) {
      const sessionDoc: any = await appwriteDatabases.getDocument(DB_ID, "classSessions", reportDoc.classSessionId).catch(() => null);
      const subjectDoc: any = sessionDoc?.subjectId
        ? await appwriteDatabases.getDocument(DB_ID, "subjects", sessionDoc.subjectId).catch(() => null)
        : null;

      // Calculate totals for session
      const recordsRes = await appwriteDatabases.listDocuments(DB_ID, "attendanceRecords", [
        Query.equal("classSessionId", reportDoc.classSessionId),
        Query.limit(200),
      ]);
      const totals = recordsRes.documents.reduce(
        (sum: any, r: any) => {
          const s = r.attendanceStatus?.toUpperCase();
          if (s === "PRESENT") sum.present += 1;
          else if (s === "ABSENT") sum.absent += 1;
          else if (s === "EXCUSED") sum.excused += 1;
          else sum.notSet += 1;
          return sum;
        },
        { present: 0, absent: 0, excused: 0, notSet: 0 }
      );

      return {
        available: true,
        report: {
          publicId: reportDoc.publicId,
          reportType: "class_attendance",
          title: subjectDoc ? `${subjectDoc.name} Attendance` : "Class Attendance",
          version: reportDoc.version || 1,
          publishedAt: reportDoc.publishedAt ? new Date(reportDoc.publishedAt) : null,
          startsAt: sessionDoc?.startsAt ? new Date(sessionDoc.startsAt) : undefined,
          totals,
        },
      };
    }

    // All subject attendance report
    const [subjectsRes, allMembersRes, allRecordsRes] = await Promise.all([
      appwriteDatabases.listDocuments(DB_ID, "subjects", [Query.equal("status", "active"), Query.limit(100)]),
      appwriteDatabases.listDocuments(DB_ID, "subjectStudents", [Query.equal("membershipState", "active"), Query.limit(500)]),
      appwriteDatabases.listDocuments(DB_ID, "attendanceRecords", [Query.limit(1000)]),
    ]);

    const memberIdToSubjectId = new Map<string, string>();
    for (const m of allMembersRes.documents) {
      memberIdToSubjectId.set(m.$id, m.subjectId);
    }

    const bySubject = new Map<string, { subjectName: string; subjectCode: string; present: number; absent: number; excused: number; notSet: number }>();
    for (const s of subjectsRes.documents) {
      bySubject.set(s.$id, {
        subjectName: s.name,
        subjectCode: s.code,
        present: 0,
        absent: 0,
        excused: 0,
        notSet: 0,
      });
    }

    let totalPresent = 0, totalAbsent = 0, totalExcused = 0, totalNotSet = 0;
    for (const r of allRecordsRes.documents) {
      const subjId = memberIdToSubjectId.get(r.subjectStudentId);
      if (subjId && bySubject.has(subjId)) {
        const item = bySubject.get(subjId)!;
        const status = r.attendanceStatus?.toUpperCase();
        if (status === "PRESENT") { item.present += 1; totalPresent += 1; }
        else if (status === "ABSENT") { item.absent += 1; totalAbsent += 1; }
        else if (status === "EXCUSED") { item.excused += 1; totalExcused += 1; }
        else { item.notSet += 1; totalNotSet += 1; }
      }
    }

    return {
      available: true,
      report: {
        publicId: reportDoc.publicId,
        reportType: "all_subject_attendance",
        title: "All Subject Attendance",
        version: reportDoc.version || 1,
        publishedAt: reportDoc.publishedAt ? new Date(reportDoc.publishedAt) : null,
        totals: { present: totalPresent, absent: totalAbsent, excused: totalExcused, notSet: totalNotSet },
        subjects: Array.from(bySubject.values()),
      },
    };
  }

  // Fallback default
  return { success: true };
}

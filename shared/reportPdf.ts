export type AttendanceTotals = { present: number; absent: number; excused: number; notSet: number };
export type SubjectAttendancePdfData = AttendanceTotals & { subjectId: number; subjectName: string; subjectCode: string };
export type ClassAttendancePdfData = AttendanceTotals & { subjectName: string; subjectCode: string; startsAt: Date | string; students: Array<{ canonicalName: string; status: "PRESENT" | "ABSENT" | "EXCUSED" | "NOT_SET" }> };

function safeFileSegment(value: string) { return value.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "report"; }
export function subjectAttendancePdfFilename(subjectCode: string) { return `${safeFileSegment(subjectCode)}-attendance-report.pdf`; }
export function classAttendancePdfFilename(subjectCode: string, startsAt: Date | string) { const date = new Date(startsAt); return `${safeFileSegment(subjectCode)}-attendance-${Number.isNaN(date.getTime()) ? "session" : date.toISOString().slice(0, 10)}.pdf`; }
export function compiledAttendancePdfFilename(subjectCount: number) { return `selected-subjects-attendance-${subjectCount}.pdf`; }
export function normalizedSubjectSelection<T extends { subjectId: number }>(subjects: T[], selectedSubjectIds: number[]) { const selected = new Set(selectedSubjectIds); return subjects.filter(subject => selected.has(subject.subjectId)); }

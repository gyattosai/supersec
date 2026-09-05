export type AttendanceTotals = { present: number; absent: number; excused: number; conflict?: number; notSet: number };
export type SubjectAttendancePdfData = AttendanceTotals & { subjectId: number | string; subjectName: string; subjectCode: string };
export type ClassAttendancePdfStudent = {
  canonicalName: string;
  status: "PRESENT" | "ABSENT" | "EXCUSED" | "CONFLICT" | "NOT_SET" | string;
  excuseReason?: string | null;
  hasScheduleConflict?: boolean;
  verificationMethod?: string | null;
};
export type ClassAttendancePdfData = AttendanceTotals & {
  subjectName: string;
  subjectCode: string;
  professorName?: string | null;
  meetingSchedule?: string | null;
  startsAt: Date | string;
  students: ClassAttendancePdfStudent[];
};

function safeFileSegment(value: string) { return value.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "report"; }
export function subjectAttendancePdfFilename(subjectCode: string) { return `${safeFileSegment(subjectCode)}-attendance-report.pdf`; }
export function classAttendancePdfFilename(subjectCode: string, startsAt: Date | string) { const date = new Date(startsAt); return `${safeFileSegment(subjectCode)}-attendance-${Number.isNaN(date.getTime()) ? "session" : date.toISOString().slice(0, 10)}.pdf`; }
export function compiledAttendancePdfFilename(subjectCount: number) { return `selected-subjects-attendance-${subjectCount}.pdf`; }
export function normalizedSubjectSelection<T extends { subjectId: number | string }>(subjects: T[], selectedSubjectIds: Array<number | string>) { const selected = new Set(selectedSubjectIds); return subjects.filter(subject => selected.has(subject.subjectId)); }

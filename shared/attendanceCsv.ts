export type OfficialAttendanceStatus = "PRESENT" | "ABSENT" | "EXCUSED" | "NOT_SET";

export type AttendanceCsvStudent = {
  canonicalName: string;
  status: OfficialAttendanceStatus;
};

const csvCell = (value: string) => /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export function buildClassAttendanceCsv(students: AttendanceCsvStudent[]) {
  return [["Student", "Status"], ...students.map(student => [student.canonicalName, student.status])]
    .map(row => row.map(csvCell).join(","))
    .join("\r\n");
}

export function classAttendanceCsvFilename(subjectCode: string, startsAt: Date) {
  const safeSubjectCode = subjectCode.trim().replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "").toLowerCase() || "subject";
  const date = startsAt.toISOString().slice(0, 10);
  return `${safeSubjectCode}-attendance-${date}.csv`;
}

export function buildClassAttendanceSummary(input: {
  subjectCode: string;
  subjectName: string;
  startsAt: Date;
  present: number;
  absent: number;
  excused: number;
  notSet: number;
}) {
  return [
    `${input.subjectCode} · ${input.subjectName}`,
    `Class attendance · ${input.startsAt.toLocaleString()}`,
    `Present: ${input.present} · Absent: ${input.absent} · Excused: ${input.excused} · Not set: ${input.notSet}`,
  ].join("\n");
}

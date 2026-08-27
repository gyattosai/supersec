export type StudentSortMode = "last-name" | "first-name" | "conflict" | "notes";
export type AttendanceSortMode = "name" | "status" | "conflict";

type NameRow = { canonicalName: string; firstName?: string | null; middleName?: string | null; lastName?: string | null };
type StudentRow = NameRow & { hasScheduleConflict: boolean; privateNotes?: string | null };
type AttendanceRow = NameRow & { hasScheduleConflict: boolean; status: "PRESENT" | "ABSENT" | "EXCUSED" | "NOT_SET" };

function compareText(left?: string | null, right?: string | null) { return (left ?? "").localeCompare(right ?? "", undefined, { sensitivity: "base" }); }
function compareByName(left: NameRow, right: NameRow) { return compareText(left.lastName, right.lastName) || compareText(left.firstName, right.firstName) || compareText(left.middleName, right.middleName) || compareText(left.canonicalName, right.canonicalName); }

export function sortStudents<T extends StudentRow>(rows: T[], mode: StudentSortMode) {
  return [...rows].sort((left, right) => {
    if (mode === "first-name") return compareText(left.firstName, right.firstName) || compareText(left.lastName, right.lastName) || compareByName(left, right);
    if (mode === "conflict") return Number(right.hasScheduleConflict) - Number(left.hasScheduleConflict) || compareByName(left, right);
    if (mode === "notes") return Number(Boolean(right.privateNotes?.trim())) - Number(Boolean(left.privateNotes?.trim())) || compareByName(left, right);
    return compareByName(left, right);
  });
}

const attendanceOrder: Record<AttendanceRow["status"], number> = { NOT_SET: 0, ABSENT: 1, EXCUSED: 2, PRESENT: 3 };
export function sortAttendance<T extends AttendanceRow>(rows: T[], mode: AttendanceSortMode) {
  return [...rows].sort((left, right) => {
    if (mode === "status") return attendanceOrder[left.status] - attendanceOrder[right.status] || compareByName(left, right);
    if (mode === "conflict") return Number(right.hasScheduleConflict) - Number(left.hasScheduleConflict) || compareByName(left, right);
    return compareByName(left, right);
  });
}

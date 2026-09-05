export type StudentSortMode = "last-name" | "first-name" | "conflict" | "notes";
export type AttendanceSortMode = "name" | "last-name-asc" | "last-name-desc" | "first-name" | "status" | "conflict";
export type PublicAttendanceSortMode = "last-name-asc" | "last-name-desc" | "first-name" | "status";

export type NameRow = {
  canonicalName: string;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
};

export type StudentRow = NameRow & {
  hasScheduleConflict: boolean;
  privateNotes?: string | null;
};

export type AttendanceRow = NameRow & {
  hasScheduleConflict: boolean;
  status: "PRESENT" | "ABSENT" | "EXCUSED" | "CONFLICT" | "NOT_SET";
};

export type PublicAttendanceRecord = {
  canonicalName: string;
  status: "PRESENT" | "ABSENT" | "EXCUSED" | "CONFLICT" | "NOT_SET" | string;
};

function compareText(left?: string | null, right?: string | null): number {
  return (left ?? "").localeCompare(right ?? "", undefined, { sensitivity: "base" });
}

/**
 * Extracts structured lastName, firstName, and middleName parts from any NameRow or canonicalName string.
 * Handles both "LastName, FirstName MiddleName" and "FirstName MiddleName LastName" or "Section_LastName, FirstName".
 */
export function extractNameParts(row: {
  canonicalName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
}): {
  lastName: string;
  firstName: string;
  middleName: string;
} {
  if (row.lastName || row.firstName) {
    return {
      lastName: (row.lastName || "").trim(),
      firstName: (row.firstName || "").trim(),
      middleName: (row.middleName || "").trim(),
    };
  }

  const raw = (row.canonicalName || "").trim();
  // Strip section code prefixes like "OLCBTQM01_" or "CS101_"
  const clean = raw.replace(/^[A-Z0-9-]+_/i, "").trim();

  if (clean.includes(",")) {
    const [last, rest] = clean.split(",");
    const restTokens = (rest || "").trim().split(/\s+/).filter(Boolean);
    return {
      lastName: (last || "").trim(),
      firstName: restTokens[0] || "",
      middleName: restTokens.slice(1).join(" "),
    };
  }

  // Fallback for single space-separated "First Middle Last"
  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    return {
      lastName: tokens[tokens.length - 1],
      firstName: tokens.slice(0, -1).join(" "),
      middleName: "",
    };
  }

  return {
    lastName: clean,
    firstName: "",
    middleName: "",
  };
}

/**
 * Compares two name entries alphabetically by last name (A–Z), then first name, then middle name.
 */
export function compareByLastNameAsc(
  left: { canonicalName?: string | null; firstName?: string | null; lastName?: string | null; middleName?: string | null },
  right: { canonicalName?: string | null; firstName?: string | null; lastName?: string | null; middleName?: string | null }
): number {
  const l = extractNameParts(left);
  const r = extractNameParts(right);
  return (
    compareText(l.lastName, r.lastName) ||
    compareText(l.firstName, r.firstName) ||
    compareText(l.middleName, r.middleName) ||
    compareText(left.canonicalName, right.canonicalName)
  );
}

/**
 * Compares two name entries reverse-alphabetically by last name (Z–A).
 */
export function compareByLastNameDesc(
  left: { canonicalName?: string | null; firstName?: string | null; lastName?: string | null; middleName?: string | null },
  right: { canonicalName?: string | null; firstName?: string | null; lastName?: string | null; middleName?: string | null }
): number {
  return compareByLastNameAsc(right, left);
}

/**
 * Compares two name entries alphabetically by first name (A–Z), then last name.
 */
export function compareByFirstNameAsc(
  left: { canonicalName?: string | null; firstName?: string | null; lastName?: string | null; middleName?: string | null },
  right: { canonicalName?: string | null; firstName?: string | null; lastName?: string | null; middleName?: string | null }
): number {
  const l = extractNameParts(left);
  const r = extractNameParts(right);
  return (
    compareText(l.firstName, r.firstName) ||
    compareText(l.lastName, r.lastName) ||
    compareText(l.middleName, r.middleName) ||
    compareText(left.canonicalName, right.canonicalName)
  );
}

export function sortStudents<T extends StudentRow>(rows: T[], mode: StudentSortMode = "last-name"): T[] {
  return [...rows].sort((left, right) => {
    if (mode === "first-name") return compareByFirstNameAsc(left, right);
    if (mode === "conflict") return Number(right.hasScheduleConflict) - Number(left.hasScheduleConflict) || compareByLastNameAsc(left, right);
    if (mode === "notes") return Number(Boolean(right.privateNotes?.trim())) - Number(Boolean(left.privateNotes?.trim())) || compareByLastNameAsc(left, right);
    return compareByLastNameAsc(left, right);
  });
}

const attendanceOrder: Record<string, number> = {
  NOT_SET: 0,
  ABSENT: 1,
  CONFLICT: 2,
  EXCUSED: 3,
  PRESENT: 4,
};

export function sortAttendance<T extends AttendanceRow>(rows: T[], mode: AttendanceSortMode = "name"): T[] {
  return [...rows].sort((left, right) => {
    if (mode === "last-name-desc") return compareByLastNameDesc(left, right);
    if (mode === "first-name") return compareByFirstNameAsc(left, right);
    if (mode === "status") {
      const ordL = attendanceOrder[left.status] ?? 99;
      const ordR = attendanceOrder[right.status] ?? 99;
      return ordL - ordR || compareByLastNameAsc(left, right);
    }
    if (mode === "conflict") return Number(right.hasScheduleConflict) - Number(left.hasScheduleConflict) || compareByLastNameAsc(left, right);
    // Default mode: "name" or "last-name-asc" -> Alphabetical by last name
    return compareByLastNameAsc(left, right);
  });
}

export function sortPublicAttendanceRecords<T extends PublicAttendanceRecord>(
  rows: T[],
  mode: PublicAttendanceSortMode = "last-name-asc"
): T[] {
  return [...rows].sort((left, right) => {
    if (mode === "last-name-desc") return compareByLastNameDesc(left, right);
    if (mode === "first-name") return compareByFirstNameAsc(left, right);
    if (mode === "status") {
      const ordL = attendanceOrder[left.status.toUpperCase()] ?? 99;
      const ordR = attendanceOrder[right.status.toUpperCase()] ?? 99;
      return ordL - ordR || compareByLastNameAsc(left, right);
    }
    // Default: "last-name-asc"
    return compareByLastNameAsc(left, right);
  });
}

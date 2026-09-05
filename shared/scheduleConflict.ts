export interface StudentConflictConfig {
  days: number[];
  autoPresent: boolean;
  reason?: string | null;
}

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const WEEKDAY_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export function parseConflictConfig(
  aliasesText?: string | null,
  subjectId?: string | number | null
): StudentConflictConfig | null {
  if (!aliasesText || typeof aliasesText !== "string") return null;

  try {
    const data = JSON.parse(aliasesText);
    if (!data || typeof data !== "object") return null;

    const subKey = subjectId !== undefined && subjectId !== null ? String(subjectId) : null;
    const raw = (subKey && data.subjectConflicts && data.subjectConflicts[subKey]) || data.conflict;

    if (!raw || typeof raw !== "object") return null;

    const rawDays = Array.isArray(raw.days) ? raw.days : [];
    const validDays = rawDays
      .map((n: any) => Number(n))
      .filter((n: number) => Number.isInteger(n) && n >= 0 && n <= 6);

    return {
      days: validDays,
      autoPresent: raw.autoPresent !== false,
      reason: typeof raw.reason === "string" ? raw.reason.trim() || null : null,
    };
  } catch {
    return null;
  }
}

export function serializeConflictConfig(
  existingAliasesText: string | null | undefined,
  subjectId: string | number | null | undefined,
  config: StudentConflictConfig | null
): string {
  let base: Record<string, any> = {};

  if (existingAliasesText && typeof existingAliasesText === "string") {
    try {
      const parsed = JSON.parse(existingAliasesText);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        base = parsed;
      }
    } catch {
      base = { rawAliases: existingAliasesText.trim() };
    }
  }

  const subKey = subjectId !== undefined && subjectId !== null ? String(subjectId) : null;

  if (!config) {
    if (subKey && base.subjectConflicts) {
      delete base.subjectConflicts[subKey];
      if (Object.keys(base.subjectConflicts).length === 0) {
        delete base.subjectConflicts;
      }
    }
    if (!subKey) {
      delete base.conflict;
    }
  } else {
    const cleanEntry = {
      days: Array.isArray(config.days) ? config.days.filter(d => Number.isInteger(d) && d >= 0 && d <= 6) : [],
      autoPresent: config.autoPresent !== false,
      reason: config.reason?.trim() || null,
    };

    if (subKey) {
      if (!base.subjectConflicts || typeof base.subjectConflicts !== "object") {
        base.subjectConflicts = {};
      }
      base.subjectConflicts[subKey] = cleanEntry;
    }
    base.conflict = cleanEntry;
  }

  const keys = Object.keys(base);
  if (keys.length === 0) return "";
  return JSON.stringify(base);
}

export type MeetingDayItem = { weekday: number } | number;

export function isConflictSessionDay(
  config: StudentConflictConfig | null | undefined,
  sessionStartsAt: Date | string | number | null | undefined,
  subjectMeetingDays?: Array<MeetingDayItem> | null
): boolean {
  if (!config) return true;

  if (!config.days || config.days.length === 0) {
    return true;
  }

  if (!sessionStartsAt) return true;

  try {
    const d = new Date(sessionStartsAt);
    if (isNaN(d.getTime())) return true;
    const weekday = d.getDay();
    return config.days.includes(weekday);
  } catch {
    return true;
  }
}

export type InitialAttendanceResult = {
  status: "PRESENT" | "CONFLICT" | "NOT_SET";
  hasConflictToday: boolean;
  isConflictToday: boolean;
};

export function getInitialAttendanceForStudent(
  paramsOrConfig:
    | {
        hasScheduleConflict: boolean;
        conflictConfig?: StudentConflictConfig | null;
        sessionStartsAt?: Date | string | number | null;
        subjectMeetingDays?: Array<MeetingDayItem> | null;
      }
    | (StudentConflictConfig | null | undefined),
  sessionStartsAt?: Date | string | number | null,
  subjectMeetingDays?: Array<MeetingDayItem> | null,
  hasScheduleConflict: boolean = false
): InitialAttendanceResult {
  let activeConflict = false;
  let config: StudentConflictConfig | null | undefined = null;
  let sessionDate: Date | string | number | null | undefined = null;
  let meetingDays: Array<MeetingDayItem> | null | undefined = null;

  if (
    paramsOrConfig !== null &&
    typeof paramsOrConfig === "object" &&
    "hasScheduleConflict" in paramsOrConfig
  ) {
    activeConflict = Boolean(paramsOrConfig.hasScheduleConflict);
    config = paramsOrConfig.conflictConfig;
    sessionDate = paramsOrConfig.sessionStartsAt;
    meetingDays = paramsOrConfig.subjectMeetingDays;
  } else {
    config = paramsOrConfig;
    sessionDate = sessionStartsAt;
    meetingDays = subjectMeetingDays;
    activeConflict = Boolean(hasScheduleConflict);
  }

  if (!activeConflict) {
    return { status: "NOT_SET", hasConflictToday: false, isConflictToday: false };
  }

  const appliesToday = isConflictSessionDay(config, sessionDate, meetingDays);

  if (!appliesToday) {
    return { status: "NOT_SET", hasConflictToday: false, isConflictToday: false };
  }

  const isAutoPresent = config?.autoPresent !== false;
  return {
    status: isAutoPresent ? "PRESENT" : "CONFLICT",
    hasConflictToday: true,
    isConflictToday: true,
  };
}

export function formatConflictDaysSummary(
  days?: number[] | null,
  subjectMeetingDays?: Array<MeetingDayItem> | null
): string {
  const normSubjectMeetingDays: number[] = (subjectMeetingDays || []).map(d =>
    typeof d === "number" ? d : d.weekday
  );

  if (!days || days.length === 0) {
    if (normSubjectMeetingDays.length > 0) {
      return "All Meeting Days";
    }
    return "All Days";
  }

  if (
    normSubjectMeetingDays.length > 0 &&
    days.length === normSubjectMeetingDays.length &&
    days.every(d => normSubjectMeetingDays.includes(d))
  ) {
    return "All Meeting Days";
  }

  const sortedDays = [...days].sort((a, b) => a - b);
  return sortedDays.map(d => WEEKDAY_SHORT[d] || `Day ${d}`).join(", ");
}

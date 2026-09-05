import { describe, expect, it } from "vitest";
import {
  parseConflictConfig,
  serializeConflictConfig,
  isConflictSessionDay,
  getInitialAttendanceForStudent,
  formatConflictDaysSummary,
} from "../shared/scheduleConflict";

describe("Schedule Conflict Utilities & Matching", () => {
  it("serializes and parses conflict configuration cleanly", () => {
    const serialized = serializeConflictConfig(null, "sub-101", {
      days: [1, 3], // Mon, Wed
      autoPresent: true,
      reason: "Work shift",
    });

    const parsed = parseConflictConfig(serialized, "sub-101");
    expect(parsed).toEqual({
      days: [1, 3],
      autoPresent: true,
      reason: "Work shift",
    });

    // Fallback to top-level conflict if subject ID not provided
    const parsedFallback = parseConflictConfig(serialized, null);
    expect(parsedFallback?.days).toEqual([1, 3]);
  });

  it("isolates conflict configuration across different subjects for the same student", () => {
    let payload = serializeConflictConfig(null, "sub-A", {
      days: [1], // Mon only for Subject A
      autoPresent: true,
      reason: "Lab conflict",
    });

    payload = serializeConflictConfig(payload, "sub-B", {
      days: [5], // Fri only for Subject B
      autoPresent: false,
      reason: "Varsity practice",
    });

    const configA = parseConflictConfig(payload, "sub-A");
    const configB = parseConflictConfig(payload, "sub-B");

    expect(configA?.days).toEqual([1]);
    expect(configA?.autoPresent).toBe(true);

    expect(configB?.days).toEqual([5]);
    expect(configB?.autoPresent).toBe(false);
  });

  it("correctly identifies if a session date is on a student's conflict day", () => {
    // 2026-09-01 is a Tuesday (getDay() === 2)
    // 2026-09-04 is a Friday (getDay() === 5)
    // 2026-08-31 is a Monday (getDay() === 1)
    const tuesdaySession = "2026-09-01T08:00:00Z";
    const fridaySession = "2026-09-04T08:00:00Z";

    const conflictTuesOnly = { days: [2], autoPresent: true };

    expect(isConflictSessionDay(conflictTuesOnly, tuesdaySession)).toBe(true);
    expect(isConflictSessionDay(conflictTuesOnly, fridaySession)).toBe(false);

    // Empty days array applies to all sessions
    const conflictAllDays = { days: [], autoPresent: true };
    expect(isConflictSessionDay(conflictAllDays, tuesdaySession)).toBe(true);
    expect(isConflictSessionDay(conflictAllDays, fridaySession)).toBe(true);
  });

  it("evaluates initial attendance status based on conflict days and autoPresent option", () => {
    const mondaySession = "2026-08-31T08:00:00Z"; // Monday (1)
    const wednesdaySession = "2026-09-02T08:00:00Z"; // Wednesday (3)

    // Case 1: Student has Monday conflict with Auto-Present enabled
    const studentWithAutoPresentMon = {
      hasScheduleConflict: true,
      conflictConfig: { days: [1], autoPresent: true, reason: "Morning Shift" },
    };

    // On Monday session -> Auto-marked PRESENT
    const monRes = getInitialAttendanceForStudent({
      ...studentWithAutoPresentMon,
      sessionStartsAt: mondaySession,
    });
    expect(monRes.status).toBe("PRESENT");
    expect(monRes.hasConflictToday).toBe(true);

    // On Wednesday session -> Regular student, NOT_SET
    const wedRes = getInitialAttendanceForStudent({
      ...studentWithAutoPresentMon,
      sessionStartsAt: wednesdaySession,
    });
    expect(wedRes.status).toBe("NOT_SET");
    expect(wedRes.hasConflictToday).toBe(false);

    // Case 2: Student has Monday conflict with Auto-Present disabled (marked as CONFLICT)
    const studentWithConflictStatus = {
      hasScheduleConflict: true,
      conflictConfig: { days: [1], autoPresent: false, reason: "Cross-enrolled" },
    };

    const monConflictRes = getInitialAttendanceForStudent({
      ...studentWithConflictStatus,
      sessionStartsAt: mondaySession,
    });
    expect(monConflictRes.status).toBe("CONFLICT");
    expect(monConflictRes.hasConflictToday).toBe(true);

    // Case 3: Student has no schedule conflict
    const regularStudent = {
      hasScheduleConflict: false,
    };
    const regularRes = getInitialAttendanceForStudent({
      ...regularStudent,
      sessionStartsAt: mondaySession,
    });
    expect(regularRes.status).toBe("NOT_SET");
    expect(regularRes.hasConflictToday).toBe(false);
  });

  it("formats readable summary of conflict days", () => {
    expect(formatConflictDaysSummary([1, 3])).toBe("Mon, Wed");
    expect(formatConflictDaysSummary([2])).toBe("Tue");
    expect(formatConflictDaysSummary([], [{ weekday: 1 }, { weekday: 3 }])).toBe("All Meeting Days");
    expect(formatConflictDaysSummary([1, 3], [1, 3])).toBe("All Meeting Days");
    expect(formatConflictDaysSummary([])).toBe("All Days");
  });

  it("supports positional invocation of getInitialAttendanceForStudent", () => {
    const mondaySession = new Date("2026-08-31T08:00:00Z"); // Monday (1)
    const tuesdaySession = new Date("2026-09-01T08:00:00Z"); // Tuesday (2)

    const config = { days: [1], autoPresent: true, reason: "Morning Shift" };

    // When student has conflict on Monday and today is Monday
    const mondayRes = getInitialAttendanceForStudent(config, mondaySession, [1, 3], true);
    expect(mondayRes.status).toBe("PRESENT");
    expect(mondayRes.isConflictToday).toBe(true);
    expect(mondayRes.hasConflictToday).toBe(true);

    // When today is Tuesday (not a conflict day)
    const tuesdayRes = getInitialAttendanceForStudent(config, tuesdaySession, [1, 3], true);
    expect(tuesdayRes.status).toBe("NOT_SET");
    expect(tuesdayRes.isConflictToday).toBe(false);
    expect(tuesdayRes.hasConflictToday).toBe(false);

    // When conflict has autoPresent: false on a conflict day
    const conflictRes = getInitialAttendanceForStudent({ days: [1], autoPresent: false }, mondaySession, [1, 3], true);
    expect(conflictRes.status).toBe("CONFLICT");
    expect(conflictRes.isConflictToday).toBe(true);
  });
});

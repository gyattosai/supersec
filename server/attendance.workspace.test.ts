import { describe, expect, it } from "vitest";
import { attendanceWorkspacePath } from "../client/src/lib/attendanceWorkspace";

describe("combined Attendance workspace route", () => {
  it("uses the Subject Attendance page for valid Subject IDs and a safe fallback otherwise", () => {
    expect(attendanceWorkspacePath(12)).toBe("/app/subjects/12/attendance");
    expect(attendanceWorkspacePath(0)).toBe("/app/subjects");
    expect(attendanceWorkspacePath(Number.NaN)).toBe("/app/subjects");
  });
});

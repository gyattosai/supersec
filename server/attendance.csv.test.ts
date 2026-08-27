import { describe, expect, it } from "vitest";
import { buildClassAttendanceCsv, buildClassAttendanceSummary, classAttendanceCsvFilename } from "../shared/attendanceCsv";

describe("private class-attendance CSV export", () => {
  it("exports only Student and official Status columns, safely escaping a comma in the student name", () => {
    const csv = buildClassAttendanceCsv([
      { canonicalName: "SECTION_LAST NAME, FIRST NAME", status: "EXCUSED" },
      { canonicalName: "SECOND STUDENT", status: "NOT_SET" },
    ]);

    expect(csv).toBe("Student,Status\r\n\"SECTION_LAST NAME, FIRST NAME\",EXCUSED\r\nSECOND STUDENT,NOT_SET");
    expect(csv.split("\r\n")[0]?.split(",")).toHaveLength(2);
    expect(csv).not.toContain("excuseReason");
    expect(csv).not.toContain("zoom");
  });

  it("uses a portable filename based on the Subject code and session date", () => {
    expect(classAttendanceCsvFilename("CMS 101", new Date("2026-08-27T00:00:00.000Z"))).toBe("cms-101-attendance-2026-08-27.csv");
  });

  it("builds an aggregate-only message without accepting student or Zoom data", () => {
    const summary = buildClassAttendanceSummary({
      subjectCode: "CMS 101",
      subjectName: "Operations Management",
      startsAt: new Date("2026-08-27T00:00:00.000Z"),
      present: 18,
      absent: 2,
      excused: 1,
      notSet: 0,
    });

    expect(summary).toContain("CMS 101 · Operations Management");
    expect(summary).toContain("Present: 18 · Absent: 2 · Excused: 1 · Not set: 0");
    expect(summary).not.toContain("N001_");
    expect(summary).not.toContain("zoom");
  });
});

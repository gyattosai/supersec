import { describe, expect, it } from "vitest";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { sortAttendance, sortStudents } from "../shared/attendanceSorting";
import { compiledAttendancePdfFilename, normalizedSubjectSelection, subjectAttendancePdfFilename } from "../shared/reportPdf";

describe("report exports and private list sorting", () => {
  it("creates portable report filenames and limits compiled reports to the selected Subjects", () => {
    expect(subjectAttendancePdfFilename("OM 101")).toBe("om-101-attendance-report.pdf");
    expect(compiledAttendancePdfFilename(2)).toBe("selected-subjects-attendance-2.pdf");
    expect(normalizedSubjectSelection([{ subjectId: 1 }, { subjectId: 2 }, { subjectId: 3 }], [3, 1, 1]).map(item => item.subjectId)).toEqual([1, 3]);
  });

  it("sorts Students and Attendance rows without mutating their source arrays", () => {
    const students = [{ canonicalName: "Zane, Avery", firstName: "Avery", middleName: "", lastName: "Zane", hasScheduleConflict: false, privateNotes: "" }, { canonicalName: "Adams, Bea", firstName: "Bea", middleName: "", lastName: "Adams", hasScheduleConflict: true, privateNotes: "note" }];
    expect(sortStudents(students, "conflict").map(item => item.lastName)).toEqual(["Adams", "Zane"]);
    expect(students.map(item => item.lastName)).toEqual(["Zane", "Adams"]);
    const attendance = [{ ...students[0], status: "PRESENT" as const }, { ...students[1], status: "NOT_SET" as const }];
    expect(sortAttendance(attendance, "status").map(item => item.status)).toEqual(["NOT_SET", "PRESENT"]);
  });

  it("generates a non-empty PDF document with an attendance table", () => {
    const document = new jsPDF({ format: "a4", unit: "pt" });
    document.text("Subject Attendance", 42, 42);
    autoTable(document, { startY: 64, head: [["Status", "Total"]], body: [["Present", "12"]] });
    expect(document.output("arraybuffer").byteLength).toBeGreaterThan(1_000);
  });
});

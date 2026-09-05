import { describe, it, expect } from "vitest";
import { formatSocialTitle, formatSocialDescription } from "../shared/socialTitle";
import { NO_CLASS_PRESETS } from "../client/src/pages/FocusedSchedulePage";

describe("No Classes Feature", () => {
  describe("Social Meta & OpenGraph formatting", () => {
    it("formats social title when session is marked as No Class with reason", () => {
      const title = formatSocialTitle({
        type: "Attendance",
        numberOrDate: "Sep 8",
        subjectCode: "CS-101",
        isNoClass: true,
        noClassReason: "Declared National Holiday",
      });
      expect(title).toBe("[CS-101] No Class: Declared National Holiday · Sep 8");
    });

    it("formats social title when session is marked as No Class without specific reason", () => {
      const title = formatSocialTitle({
        type: "Attendance",
        numberOrDate: "Sep 8",
        subjectCode: "MATH-201",
        isNoClass: true,
      });
      expect(title).toBe("[MATH-201] No Class Notice · Sep 8");
    });

    it("formats social description when session is marked as No Class", () => {
      const desc = formatSocialDescription({
        type: "attendance",
        subjectCode: "CS-101",
        subjectName: "Data Structures",
        date: new Date("2026-09-08T08:00:00Z"),
        isNoClass: true,
        noClassReason: "Inclement Weather / Typhoon Suspension",
      });
      expect(desc).toContain("Official No Class notice for CS-101 (Data Structures)");
      expect(desc).toContain("Inclement Weather / Typhoon Suspension");
      expect(desc).toContain("Regular roll call is suspended");
    });

    it("falls back to generic suspended message when reason is omitted in description", () => {
      const desc = formatSocialDescription({
        type: "attendance",
        subjectCode: "ENG-101",
        subjectName: "Writing",
        date: new Date("2026-09-08T08:00:00Z"),
        isNoClass: true,
      });
      expect(desc).toContain("Official No Class notice for ENG-101 (Writing)");
      expect(desc).toContain("Regular roll call is suspended");
    });
  });

  describe("Curated Presets", () => {
    it("provides common presets covering standard academic suspension reasons", () => {
      expect(NO_CLASS_PRESETS.length).toBeGreaterThanOrEqual(5);
      const labels = NO_CLASS_PRESETS.map(p => p.label);
      expect(labels.some(l => l.includes("Holiday"))).toBe(true);
      expect(labels.some(l => l.includes("Weather"))).toBe(true);
      expect(labels.some(l => l.includes("Event"))).toBe(true);
      expect(labels.some(l => l.includes("Exam"))).toBe(true);
      expect(labels.some(l => l.includes("Maintenance"))).toBe(true);
    });
  });
});

import { describe, expect, it } from "vitest";
import { generateOgSvg, generateOgDataUrl, wrapText } from "../shared/ogImageEngine";

describe("Dynamic OpenGraph Image Cover Engine", () => {
  it("wraps long text gracefully across multiple lines with ellipsis", () => {
    const lines = wrapText("A very long announcement title that spans across multiple sentences and paragraphs in the class portal", 25, 2);
    expect(lines.length).toBeLessThanOrEqual(2);
    expect(lines[lines.length - 1]).toContain("…");
  });

  it("generates a valid 1200x630 SVG for a subject portal", () => {
    const svg = generateOgSvg({
      type: "subject",
      title: "Introduction to Algorithms",
      subjectCode: "CS-101",
      professorName: "Alan Turing",
      subtitle: "Official Student Portal",
    });

    expect(svg).toContain('<svg width="1200" height="630"');
    expect(svg).toContain("CS-101");
    expect(svg).toContain("Introduction to Algorithms");
    expect(svg).toContain("Prof. Alan Turing");
    expect(svg).toContain("STUDENT PORTAL");
    expect(svg).toContain("supersec");
  });

  it("generates live roll call metrics for attendance session cards", () => {
    const svg = generateOgSvg({
      type: "attendance",
      title: "CS-101 Live Attendance",
      subjectCode: "CS-101",
      date: "Aug 31, 2026",
      present: 28,
      absent: 2,
      excused: 1,
      version: 3,
    });

    expect(svg).toContain("LIVE ATTENDANCE");
    expect(svg).toContain("28");
    expect(svg).toContain("PRESENT");
    expect(svg).toContain("ABSENT");
    expect(svg).toContain("EXCUSED");
    expect(svg).toContain("V3");
  });

  it("generates distinct badge styling for announcements and course resources", () => {
    const announcementSvg = generateOgSvg({
      type: "announcement",
      title: "Midterm Exam Guidelines",
      subjectCode: "MATH-202",
      version: 1,
      date: "Sep 15, 2026",
    });
    expect(announcementSvg).toContain("ANNOUNCEMENT");
    expect(announcementSvg).toContain("Midterm Exam Guidelines");

    const resourceSvg = generateOgSvg({
      type: "resource",
      title: "Lecture 04 Slides & Code",
      subjectCode: "CS-101",
      category: "Slides",
      subtitle: "drive.google.com",
    });
    expect(resourceSvg).toContain("RESOURCE · SLIDES");
    expect(resourceSvg).toContain("drive.google.com");
  });

  it("generates verified badges for official Q&A answers", () => {
    const qaSvg = generateOgSvg({
      type: "question",
      title: "Will the final exam cover Chapter 8?",
      subjectCode: "PHYS-101",
      isOfficial: true,
    });

    expect(qaSvg).toContain("OFFICIAL Q&amp;A");
    expect(qaSvg).toContain("Secretary Approved Knowledge");
  });

  it("generates proof and excuse submission cards", () => {
    const proofSvg = generateOgSvg({
      type: "proof",
      title: "Submit Zoom Attendance Proof",
      subtitle: "Instant AI Verification",
    });
    expect(proofSvg).toContain("ZOOM AI PROOF");
    expect(proofSvg).toContain("Instant AI Zoom Screenshot Verification");

    const excuseSvg = generateOgSvg({
      type: "excuse",
      title: "Submit Excuse Letter",
    });
    expect(excuseSvg).toContain("EXCUSE LETTER");
  });

  it("generates valid data URI for browser-based client previews", () => {
    const dataUri = generateOgDataUrl({
      type: "subject",
      title: "Data Structures",
      subjectCode: "CS-102",
    });

    expect(dataUri.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(dataUri).toContain("Data%20Structures");
  });
});

import { describe, it, expect } from "vitest";
import {
  generateVersionHistorySummary,
  generateFallbackVersionHistorySummary,
  type GenerateVersionHistoryParams,
} from "./_core/versionHistoryAI";
import { appRouter } from "./routers";

describe("AI Version History Engine", () => {
  it("synthesizes initial publication summary for announcements", async () => {
    const params: GenerateVersionHistoryParams = {
      kind: "announcement",
      title: "Midterm Schedule Announced",
      body: "Please check your assigned rooms for the midterm exam on Friday at 9:00 AM.",
      version: 1,
      action: "published",
    };

    const summary = await generateVersionHistorySummary(params);
    expect(summary).toBeDefined();
    expect(summary.length).toBeGreaterThan(0);
    expect(summary.length).toBeLessThanOrEqual(200);
  });

  it("synthesizes version update summary reflecting text changes", async () => {
    const params: GenerateVersionHistoryParams = {
      kind: "announcement",
      title: "Midterm Schedule Announced - Room Updated",
      body: "Room has been changed from Room 301 to Science Amphitheater. Please be on time.",
      previousTitle: "Midterm Schedule Announced",
      previousBody: "Exam will be held in Room 301.",
      version: 2,
      action: "updated",
    };

    const summary = await generateVersionHistorySummary(params);
    expect(summary).toBeDefined();
    expect(summary.length).toBeGreaterThan(0);
    expect(summary.length).toBeLessThanOrEqual(200);
  });

  it("synthesizes resource updates including attachments and category", async () => {
    const params: GenerateVersionHistoryParams = {
      kind: "resource",
      title: "Chapter 5 Lecture Notes & Code",
      body: "Added the complete slide deck and sample Python programs.",
      category: "Lecture Slides",
      attachmentsCount: 2,
      version: 2,
      action: "updated",
      previousBody: "Initial notes placeholder.",
    };

    const summary = await generateVersionHistorySummary(params);
    expect(summary).toBeDefined();
    expect(summary.length).toBeGreaterThan(0);
    expect(summary.length).toBeLessThanOrEqual(200);
  });

  it("synthesizes question & answer updates", async () => {
    const params: GenerateVersionHistoryParams = {
      kind: "question",
      title: "What is the policy for late project submissions?",
      body: "Submissions up to 24 hours late receive a 10% deduction. No submissions accepted after 24 hours.",
      version: 2,
      action: "updated",
      previousBody: "Late submissions receive a penalty.",
    };

    const summary = await generateVersionHistorySummary(params);
    expect(summary).toBeDefined();
    expect(summary.length).toBeGreaterThan(0);
    expect(summary.length).toBeLessThanOrEqual(200);
  });
});

describe("Deterministic Fallback Version History Engine", () => {
  it("provides clean initial publication notes", () => {
    const summary = generateFallbackVersionHistorySummary({
      kind: "announcement",
      title: "Welcome to Class",
      body: "Syllabus and orientation details.",
      version: 1,
      action: "published",
    });

    expect(summary).toBe("Initial publication: Welcome to Class");
    expect(summary.length).toBeLessThanOrEqual(200);
  });

  it("detects title change and body update in fallback", () => {
    const summary = generateFallbackVersionHistorySummary({
      kind: "announcement",
      title: "Class Guidelines v2",
      body: "Updated grading weights.",
      previousTitle: "Class Guidelines",
      previousBody: "Original grading weights.",
      version: 2,
      action: "updated",
    });

    expect(summary).toContain('Updated title to "Class Guidelines v2"');
    expect(summary).toContain("Revised content text");
    expect(summary.length).toBeLessThanOrEqual(200);
  });

  it("detects resource attachment changes in fallback", () => {
    const summary = generateFallbackVersionHistorySummary({
      kind: "resource",
      title: "Lab Manual",
      body: "Manual text.",
      category: "Lab Materials",
      attachmentsCount: 3,
      version: 2,
      action: "updated",
    });

    expect(summary).toContain("Resource attachments updated (3 files)");
    expect(summary.length).toBeLessThanOrEqual(200);
  });
});

describe("tRPC content.autoDraftVersionHistory Procedure", () => {
  it("invokes autoDraftVersionHistory via public procedure", async () => {
    const caller = appRouter.createCaller({ user: null } as any);

    const result = await caller.content.autoDraftVersionHistory({
      kind: "announcement",
      title: "Final Exam Details",
      body: "Exam scheduled for December 15 in Main Hall.",
      version: 1,
      action: "published",
    });

    expect(result).toHaveProperty("summary");
    expect(typeof result.summary).toBe("string");
    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.summary.length).toBeLessThanOrEqual(200);
  });

  it("invokes autoDraftVersionHistory with update diffs", async () => {
    const caller = appRouter.createCaller({ user: null } as any);

    const result = await caller.content.autoDraftVersionHistory({
      kind: "resource",
      title: "Syllabus 2026",
      body: "Updated office hours and grading rubric.",
      previousTitle: "Syllabus 2026",
      previousBody: "Old office hours.",
      version: 2,
      action: "updated",
      category: "Course Documents",
      attachmentsCount: 1,
    });

    expect(result).toHaveProperty("summary");
    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.summary.length).toBeLessThanOrEqual(200);
  });
});

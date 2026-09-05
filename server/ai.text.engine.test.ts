import { describe, it, expect } from "vitest";
import { synthesizeAiText, generateAiText } from "../shared/aiTextEngine";

describe("AI Text Writing & Synthesis Engine", () => {
  it("synthesizes professional announcements in draft mode", () => {
    const output = synthesizeAiText({
      target: "announcement",
      mode: "autofill",
      context: "[OLCBTQM01] Midterm Schedule & Guidelines",
    });
    expect(output).toContain("Class Announcement");
    expect(output).toContain("OLCBTQM01");
    expect(output).toContain("Key Details");
  });

  it("converts announcements into Messenger chat broadcast format", () => {
    const output = synthesizeAiText({
      target: "announcement",
      mode: "messenger",
      text: "Quiz 2 will be on Wednesday covering Chapters 3 and 4.",
      subjectCode: "SEC 401",
    });
    expect(output).toContain("📢 **ANNOUNCEMENT | SEC 401**");
    expect(output).toContain("Quiz 2 will be on Wednesday");
    expect(output).toContain("🗓️ **Date & Schedule:**");
  });

  it("synthesizes resource descriptions based on title and category", () => {
    const output = synthesizeAiText({
      target: "resource_description",
      mode: "autofill",
      context: "Title: CBA Membership Google Form | Category: Registration",
      subjectCode: "OLCBTQM01",
    });
    expect(output).toContain("Resource Overview");
    expect(output).toContain("OLCBTQM01");
    expect(output).toContain("Purpose & Instructions");
  });

  it("synthesizes official Q&A answers based on question context", () => {
    const output = synthesizeAiText({
      target: "question_answer",
      mode: "autofill",
      context: "Para saan yung CBA Membership form?",
      subjectCode: "OLCBTQM01",
    });
    expect(output).toContain("Official Answer");
    expect(output).toContain("Para saan yung CBA Membership form?");
    expect(output).toContain("OLCBTQM01");
  });

  it("synthesizes Cornell-style structured study notes", () => {
    const output = synthesizeAiText({
      target: "student_note",
      mode: "autofill",
      context: "Total Quality Management Chapter 1 Overview",
      subjectCode: "OLCBTQM01",
    });
    expect(output).toContain("Objective & Key Concepts");
    expect(output).toContain("Discussion Points & Formulas");
    expect(output).toContain("Key Takeaway");
  });

  it("extracts action items and bullet checklists", () => {
    const draft = "Submit group project on Friday\nReview slides 1 to 40\nBring 1/2 crosswise paper";
    const output = synthesizeAiText({
      target: "announcement",
      mode: "action_items",
      text: draft,
    });
    expect(output).toContain("Key Action Items");
    expect(output).toContain("Submit group project on Friday");
    expect(output).toContain("Review slides 1 to 40");
  });

  it("polishes and structures raw notes with proper markdown", () => {
    const raw = "dont forget the quiz tomorrow guys bring scientific calculator and test booklet";
    const output = synthesizeAiText({
      target: "student_note",
      mode: "improve",
      text: raw,
    });
    expect(output).toContain("Dont forget the quiz tomorrow");
  });

  it("generates output using generateAiText fallback cleanly", async () => {
    const res = await generateAiText({
      target: "announcement",
      mode: "autofill",
      context: "Final Exam Preparation",
    });
    expect(res.changesMade).toBe(true);
    expect(res.text.length).toBeGreaterThan(20);
  });
});

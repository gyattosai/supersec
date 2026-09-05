import { describe, expect, it } from "vitest";
import {
  createDefaultNote,
  filterNotes,
  formatNoteForMessenger,
  INITIAL_SECRETARY_NOTES,
  type SecretaryNote,
} from "../shared/notes";

describe("Secretary Notes & Reference Management", () => {
  it("initializes with starter notes", () => {
    expect(INITIAL_SECRETARY_NOTES.length).toBeGreaterThanOrEqual(2);
    expect(INITIAL_SECRETARY_NOTES.some(n => n.isPinned)).toBe(true);
  });

  it("creates a new note with default fields and timestamps", () => {
    const note = createDefaultNote({
      title: "Lecture 6 Notes",
      content: "Summary of statistical process control",
      subjectCode: "OLCBTQM01",
      tags: ["SPC", "ControlCharts"],
    });

    expect(note.id).toMatch(/^note-/);
    expect(note.title).toBe("Lecture 6 Notes");
    expect(note.tags).toEqual(["SPC", "ControlCharts"]);
    expect(note.isPinned).toBe(false);
    expect(note.color).toBe("default");
    expect(note.createdAt).toBeDefined();
    expect(note.updatedAt).toBeDefined();
  });

  it("filters notes by search query, subject, tag, and pinned status", () => {
    const notes: SecretaryNote[] = [
      createDefaultNote({
        title: "Six Sigma Lecture",
        content: "DMAIC framework overview",
        subjectCode: "OLCBTQM01",
        tags: ["SixSigma", "Lecture"],
        isPinned: true,
      }),
      createDefaultNote({
        title: "Calculus Formula Sheet",
        content: "Integration by parts formulas",
        subjectCode: "MATH-101",
        tags: ["Formulas", "Exam"],
        isPinned: false,
      }),
    ];

    // Filter by query
    const resultsQuery = filterNotes(notes, { searchQuery: "DMAIC" });
    expect(resultsQuery).toHaveLength(1);
    expect(resultsQuery[0].title).toBe("Six Sigma Lecture");

    // Filter by subject
    const resultsSubject = filterNotes(notes, { subjectId: "MATH-101" });
    expect(resultsSubject).toHaveLength(1);
    expect(resultsSubject[0].title).toBe("Calculus Formula Sheet");

    // Filter by tag
    const resultsTag = filterNotes(notes, { tag: "sixsigma" });
    expect(resultsTag).toHaveLength(1);

    // Filter by pinned only
    const resultsPinned = filterNotes(notes, { onlyPinned: true });
    expect(resultsPinned).toHaveLength(1);
    expect(resultsPinned[0].title).toBe("Six Sigma Lecture");
  });

  it("formats notes cleanly for Messenger group chats", () => {
    const note = createDefaultNote({
      title: "Midterm Study Guide",
      content: "1. Review Module 1-3\n2. Practice formulas",
      subjectCode: "OLCBTQM01",
      tags: ["Exam", "Reviewer"],
      attachments: [
        {
          id: "att-1",
          name: "Formulas.pdf",
          url: "https://supersec.mjbalubar.tech/files/Formulas.pdf",
          mimeType: "application/pdf",
          byteSize: 102400,
          type: "file",
          uploadedAt: new Date().toISOString(),
        },
      ],
    });

    const formatted = formatNoteForMessenger(note);
    expect(formatted).toContain("📝 [OLCBTQM01] Midterm Study Guide");
    expect(formatted).toContain("1. Review Module 1-3");
    expect(formatted).toContain("📎 Attached Files (1):");
    expect(formatted).toContain("• Formulas.pdf: https://supersec.mjbalubar.tech/files/Formulas.pdf");
    expect(formatted).toContain("#Exam #Reviewer");
  });

  it("handles note deletion and undo restoration state", () => {
    const list: SecretaryNote[] = [
      createDefaultNote({ id: "n1", title: "Note 1" }),
      createDefaultNote({ id: "n2", title: "Note 2" }),
    ];

    // Delete n1
    const deleted = list.find(n => n.id === "n1")!;
    const remaining = list.filter(n => n.id !== "n1");
    expect(remaining).toHaveLength(1);
    expect(remaining.some(n => n.id === "n1")).toBe(false);

    // Undo restoration
    const restored = [deleted, ...remaining];
    expect(restored).toHaveLength(2);
    expect(restored.some(n => n.id === "n1")).toBe(true);
  });
});

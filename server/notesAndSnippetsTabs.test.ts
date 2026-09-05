import { describe, expect, it } from "vitest";
import {
  filterNotes,
  moveNoteSubject,
  reorderNotes,
  formatNoteForMessenger,
  type SecretaryNote,
} from "../shared/notes";
import {
  filterMessageTemplates,
  moveSnippetCategoryOrSubject,
  reorderSnippets,
  interpolateTemplate,
  DEFAULT_PRESET_TEMPLATES,
  type MessageTemplate,
} from "../shared/messageTemplates";
import {
  subjectContentWorkspaces,
  subjectContentWorkspacePath,
  resolveLegacyContentWorkspacePath,
} from "../client/src/lib/contentWorkspaces";

describe("Notes Workspace & Subject Tabs Logic", () => {
  const sampleNotes: SecretaryNote[] = [
    {
      id: "note-1",
      title: "Alphanumeric Subject Note",
      content: "Important lecture details",
      subjectId: "67ca6be6002f235d9620",
      subjectCode: "CS101",
      subjectName: "Intro to CS",
      tags: ["Exam", "Lecture"],
      isPinned: true,
      color: "emerald",
      attachments: [],
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-01T10:00:00.000Z",
    },
    {
      id: "note-2",
      title: "Numeric Subject Note",
      content: "Math formulas",
      subjectId: 42,
      subjectCode: "MATH201",
      subjectName: "Calculus II",
      tags: ["Formulas"],
      isPinned: false,
      color: "sky",
      attachments: [],
      createdAt: "2026-09-02T10:00:00.000Z",
      updatedAt: "2026-09-02T10:00:00.000Z",
    },
    {
      id: "note-3",
      title: "General Secretary SOP",
      content: "Roll call guidelines",
      subjectId: null,
      subjectCode: "GENERAL",
      subjectName: "General Notes",
      tags: ["SOP"],
      isPinned: false,
      color: "default",
      attachments: [],
      createdAt: "2026-09-03T10:00:00.000Z",
      updatedAt: "2026-09-03T10:00:00.000Z",
    },
  ];

  it("filters notes by alphanumeric Appwrite subjectId without NaN regression", () => {
    const result = filterNotes(sampleNotes, {
      subjectId: "67ca6be6002f235d9620",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("note-1");
  });

  it("filters notes by numeric subjectId with string coercion safety", () => {
    const resultWithString = filterNotes(sampleNotes, { subjectId: "42" });
    expect(resultWithString).toHaveLength(1);
    expect(resultWithString[0].id).toBe("note-2");

    const resultWithNumber = filterNotes(sampleNotes, { subjectId: 42 });
    expect(resultWithNumber).toHaveLength(1);
    expect(resultWithNumber[0].id).toBe("note-2");
  });

  it("filters general notes when subjectId is null or 'general'", () => {
    const resultNull = filterNotes(sampleNotes, { subjectId: null });
    expect(resultNull).toHaveLength(1);
    expect(resultNull[0].id).toBe("note-3");

    const resultGeneral = filterNotes(sampleNotes, { subjectId: "general" });
    expect(resultGeneral).toHaveLength(1);
    expect(resultGeneral[0].id).toBe("note-3");
  });

  it("moves note to a target subject desk safely", () => {
    const targetSubject = {
      id: "subj-target-999",
      code: "PHYS101",
      name: "Physics I",
    };
    const moved = moveNoteSubject(sampleNotes, "note-3", targetSubject);
    const targetNote = moved.find((n) => n.id === "note-3");
    expect(targetNote).toBeDefined();
    expect(targetNote?.subjectId).toBe("subj-target-999");
    expect(targetNote?.subjectCode).toBe("PHYS101");
    expect(targetNote?.subjectName).toBe("Physics I");
  });

  it("moves note to general desk and resets subjectId to null", () => {
    const moved = moveNoteSubject(sampleNotes, "note-1", {
      id: null,
      code: "GENERAL",
      name: "General Notes",
    });
    const targetNote = moved.find((n) => n.id === "note-1");
    expect(targetNote).toBeDefined();
    expect(targetNote?.subjectId).toBeNull();
    expect(targetNote?.subjectCode).toBe("GENERAL");
  });

  it("reorders notes according to orderedIds array", () => {
    const reordered = reorderNotes(sampleNotes, ["note-3", "note-2", "note-1"]);
    expect(reordered.map((n) => n.id)).toEqual(["note-3", "note-2", "note-1"]);
  });

  it("formats note for Messenger cleanly", () => {
    const formatted = formatNoteForMessenger(sampleNotes[0]);
    expect(formatted).toContain("[CS101] Alphanumeric Subject Note");
    expect(formatted).toContain("Important lecture details");
    expect(formatted).toContain("#Exam #Lecture");
  });
});

describe("Message Templates / Snippets Workspace Logic", () => {
  const sampleSnippets: MessageTemplate[] = [
    {
      id: "preset-1",
      title: "Attendance Notice",
      category: "attendance",
      template: "Attendance posted for {Subject Code} on {Session Date}",
      isPreset: true,
    },
    {
      id: "custom-1",
      title: "Lab Submission Reminder",
      category: "custom",
      template: "Please submit lab reports for {Subject Name}",
      subjectId: "67ca6be6002f235d9620",
      subjectCode: "CS101",
      subjectName: "Intro to CS",
      tags: ["Lab", "Urgent"],
    },
    {
      id: "custom-2",
      title: "Math Quiz Notice",
      category: "custom",
      template: "Calculus quiz tomorrow",
      subjectId: 42,
      subjectCode: "MATH201",
      subjectName: "Calculus II",
      tags: ["Quiz"],
    },
  ];

  it("filters snippets by subjectId including presets and matching subject templates", () => {
    const csSnippets = filterMessageTemplates(sampleSnippets, {
      subjectId: "67ca6be6002f235d9620",
    });
    expect(csSnippets.some((s) => s.id === "custom-1")).toBe(true);
    expect(csSnippets.some((s) => s.id === "preset-1")).toBe(true);
    expect(csSnippets.some((s) => s.id === "custom-2")).toBe(false);
  });

  it("moves snippet to a different subject desk", () => {
    const moved = moveSnippetCategoryOrSubject(sampleSnippets, "custom-1", {
      subjectId: "new-subject-123",
      subjectCode: "NEW101",
      subjectName: "New Subject",
    });
    const target = moved.find((s) => s.id === "custom-1");
    expect(target).toBeDefined();
    expect(target?.subjectId).toBe("new-subject-123");
    expect(target?.subjectCode).toBe("NEW101");
  });

  it("reorders snippets according to specified IDs", () => {
    const reordered = reorderSnippets(sampleSnippets, ["custom-2", "custom-1", "preset-1"]);
    expect(reordered.map((s) => s.id)).toEqual(["custom-2", "custom-1", "preset-1"]);
  });

  it("interpolates template tokens with context variables", () => {
    const rendered = interpolateTemplate("Notice for {subject_code} - {link}", {
      subject_code: "IT204",
      link: "https://supersec.example.com",
    });
    expect(rendered).toBe("Notice for IT204 - https://supersec.example.com");
  });
});

describe("Content Workspaces Configuration & Navigation", () => {
  it("includes all 5 primary workspaces: announcements, resources, questions, notes, snippets", () => {
    const keys = subjectContentWorkspaces.map((w) => w.key);
    expect(keys).toContain("announcements");
    expect(keys).toContain("resources");
    expect(keys).toContain("questions");
    expect(keys).toContain("notes");
    expect(keys).toContain("snippets");
    expect(keys).toHaveLength(5);
  });

  it("resolves workspace path correctly for alphanumeric subject IDs", () => {
    const appwriteSubjectId = "67ca6be6002f235d9620";
    expect(subjectContentWorkspacePath(appwriteSubjectId, "notes")).toBe(
      `/app/subjects/${appwriteSubjectId}/notes`
    );
    expect(subjectContentWorkspacePath(appwriteSubjectId, "snippets")).toBe(
      `/app/subjects/${appwriteSubjectId}/snippets`
    );
  });

  it("resolves legacy content workspace path for valid workspaces", () => {
    const path = resolveLegacyContentWorkspacePath("SUBJ123", "notes");
    expect(path).toBe("/app/subjects/SUBJ123/notes");

    const snippetsPath = resolveLegacyContentWorkspacePath("SUBJ123", "snippets");
    expect(snippetsPath).toBe("/app/subjects/SUBJ123/snippets");

    const invalidPath = resolveLegacyContentWorkspacePath("SUBJ123", "unknown" as any);
    expect(invalidPath).toBe("/app/subjects");
  });
});

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("UI/UX Audit and Layout Overhaul Validations", () => {
  const rootDir = process.cwd();

  it("verifies Q and A standardization across content workspaces configuration", () => {
    const filePath = path.join(rootDir, "client/src/lib/contentWorkspaces.ts");
    const content = fs.readFileSync(filePath, "utf8");

    expect(content).toContain('title: "Q&A"');
    expect(content).toContain('action: "Open Q&A"');
    expect(content).not.toContain('title: "Questions & Answers"');
  });

  it("verifies FocusedContentPage removes redundant top action buttons and standardizes Q and A", () => {
    const filePath = path.join(rootDir, "client/src/pages/FocusedContentPage.tsx");
    const content = fs.readFileSync(filePath, "utf8");

    expect(content).toContain('label: "Q&A"');
    expect(content).toContain('singular: "Q&A"');
    expect(content).not.toContain('action={selectedTab === "notes" ?');
    expect(content).not.toContain('action={kind === "notes" ?');
    expect(content).not.toContain("overflow-x-auto");
  });

  it("verifies IndependentSubjectWorkspacePage streamlines cards, integrates Notes/Snippets, and cleans dividers", () => {
    const filePath = path.join(rootDir, "client/src/pages/IndependentSubjectWorkspacePage.tsx");
    const content = fs.readFileSync(filePath, "utf8");

    expect(content).not.toContain('tag: "SET UP"');
    expect(content).not.toContain('tag: "RUN CLASS"');
    expect(content).not.toContain('tag: "POST"');
    expect(content).not.toContain('tag: "SHARE"');

    expect(content).toContain('stepNumber: "06"');
    expect(content).toContain('title: "Q&A"');
    expect(content).toContain('stepNumber: "08"');
    expect(content).toContain('title: "Notes"');
    expect(content).toContain('stepNumber: "09"');
    expect(content).toContain('title: "Snippets"');

    expect(content).not.toMatch(/signal-panel[^>]*Quick Launch/);
    expect(content).toContain("Workflow Steps");
    expect(content).toContain("Category Suites");
    expect(content).not.toContain("7-Step Workflow");
    expect(content).toContain('label: "Q&A"');
  });

  it("verifies SubjectPages streamlines workflow, integrates Notes/Snippets, and removes splitters", () => {
    const filePath = path.join(rootDir, "client/src/pages/SubjectPages.tsx");
    const content = fs.readFileSync(filePath, "utf8");

    expect(content).toContain("Class Workflow");
    expect(content).not.toContain("7-Step Class Workflow");
    expect(content).toContain('title: "Q&A"');
    expect(content).toContain('number: "08"');
    expect(content).toContain('title: "Notes"');
    expect(content).toContain('number: "09"');
    expect(content).toContain('title: "Snippets"');

    expect(content).not.toContain('tag: "SET UP"');
    expect(content).not.toContain('tag: "RUN CLASS"');
    expect(content).not.toContain('tag: "POST"');
    expect(content).not.toContain('tag: "SHARE"');
  });

  it("verifies SubjectQuickActions removes inner top border splitter", () => {
    const filePath = path.join(rootDir, "client/src/components/SubjectQuickActions.tsx");
    const content = fs.readFileSync(filePath, "utf8");

    expect(content).not.toContain("border-t border-border/70");
    expect(content).toContain("New Q&amp;A");
  });

  it("verifies PublicPages standardizes Q and A title and eliminates horizontal sliders", () => {
    const filePath = path.join(rootDir, "client/src/pages/PublicPages.tsx");
    const content = fs.readFileSync(filePath, "utf8");

    expect(content).toContain(">Q&amp;A</h1>");
    expect(content).not.toContain(">Questions &amp; Answers</h1>");
    expect(content).not.toContain("overflow-x-auto no-scrollbar");
  });

  it("verifies ArchivePage standardizes all references to Q and A", () => {
    const filePath = path.join(rootDir, "client/src/pages/ArchivePage.tsx");
    const content = fs.readFileSync(filePath, "utf8");

    expect(content).toContain("Q&A restored as draft");
    expect(content).toContain("Q&A deleted permanently");
    expect(content).toContain("Q&A");
    expect(content).toContain("No archived announcements, resources, or Q&A.");
    expect(content).not.toContain("Question & Answer");
    expect(content).not.toContain("Questions & Answers");
  });

  it("verifies AttendancePage wraps No Class notices and eliminates slider filters", () => {
    const filePath = path.join(rootDir, "client/src/pages/AttendancePage.tsx");
    const content = fs.readFileSync(filePath, "utf8");

    expect(content).toMatch(/<span className="truncate">No Class .*<\/span>/);
    expect(content).not.toContain("overflow-x-auto p-1 rounded-xl");
  });

  it("verifies PremiumPublicSubjectHome wraps No Class suspension notices and eliminates category sliders", () => {
    const filePath = path.join(rootDir, "client/src/pages/PremiumPublicSubjectHome.tsx");
    const content = fs.readFileSync(filePath, "utf8");

    expect(content).toContain("flex flex-col sm:flex-row sm:items-center justify-between gap-3");
    expect(content).not.toContain("overflow-x-auto pb-1 pt-0.5 no-scrollbar");
  });

  it("verifies PushNotificationSubscribeButton wraps badges and maintains defensive touch targets", () => {
    const filePath = path.join(rootDir, "client/src/components/PushNotificationSubscribeButton.tsx");
    const content = fs.readFileSync(filePath, "utf8");

    expect(content).toContain("flex flex-wrap items-center gap-2");
    expect(content).toContain("min-h-10 sm:min-h-9");
  });
});
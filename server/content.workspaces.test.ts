import { describe, expect, it } from "vitest";
import { resolveLegacyContentWorkspacePath, subjectContentWorkspacePath, subjectContentWorkspaces } from "../client/src/lib/contentWorkspaces";

describe("independent Subject content workspaces", () => {
  it("defines a distinct workspace and direct destination for Announcements, Resources, Questions & Answers, Notes, and Snippets", () => {
    expect(subjectContentWorkspaces.map(workspace => workspace.key)).toEqual(["announcements", "resources", "questions", "notes", "snippets"]);
    expect(new Set(subjectContentWorkspaces.map(workspace => workspace.title)).size).toBe(5);
    expect(new Set(subjectContentWorkspaces.map(workspace => workspace.action)).size).toBe(5);
    expect(subjectContentWorkspaces.map(workspace => subjectContentWorkspacePath(24, workspace.key))).toEqual([
      "/app/subjects/24/announcements",
      "/app/subjects/24/resources",
      "/app/subjects/24/questions",
      "/app/subjects/24/notes",
      "/app/subjects/24/snippets",
    ]);
  });

  it("redirects legacy content URLs into an independent workspace instead of a grouped content view", () => {
    expect(resolveLegacyContentWorkspacePath(24, "announcements")).toBe("/app/subjects/24/announcements");
    expect(resolveLegacyContentWorkspacePath(24, "resources")).toBe("/app/subjects/24/resources");
    expect(resolveLegacyContentWorkspacePath(24, "questions")).toBe("/app/subjects/24/questions");
    expect(resolveLegacyContentWorkspacePath(24, "content")).toBe("/app/subjects");
    expect(resolveLegacyContentWorkspacePath(0, "announcements")).toBe("/app/subjects");
  });
});

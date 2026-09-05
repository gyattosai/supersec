export const subjectContentWorkspaces = [
  {
    key: "announcements",
    title: "Announcements",
    description: "Write, publish, and share class updates.",
    action: "Open Announcements",
  },
  {
    key: "resources",
    title: "Resources",
    description: "Keep class links, files, forms, and meeting links.",
    action: "Open Resources",
  },
  {
    key: "questions",
    title: "Questions & Answers",
    description: "Save answers you can publish and share again.",
    action: "Open Questions & Answers",
  },
  {
    key: "notes",
    title: "Notes",
    description: "Personal drafts, meeting minutes, and subject-specific memos.",
    action: "Open Notes",
  },
  {
    key: "snippets",
    title: "Snippets",
    description: "Quick message templates and canned responses for class blasts.",
    action: "Open Snippets",
  },
] as const;

export type SubjectContentWorkspaceKey = (typeof subjectContentWorkspaces)[number]["key"];

export function subjectContentWorkspacePath(subjectId: string | number, workspace: SubjectContentWorkspaceKey) {
  return `/app/subjects/${subjectId}/${workspace}`;
}

export function resolveLegacyContentWorkspacePath(subjectId: string | number, workspace: string | undefined) {
  const sId = String(subjectId || "");
  const validWorkspace = subjectContentWorkspaces.some(candidate => candidate.key === workspace);
  return sId && sId !== "0" && sId !== "NaN" && validWorkspace ? subjectContentWorkspacePath(sId, workspace as SubjectContentWorkspaceKey) : "/app/subjects";
}

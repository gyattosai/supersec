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
] as const;

export type SubjectContentWorkspaceKey = (typeof subjectContentWorkspaces)[number]["key"];

export function subjectContentWorkspacePath(subjectId: number, workspace: SubjectContentWorkspaceKey) {
  return `/app/subjects/${subjectId}/${workspace}`;
}

export function resolveLegacyContentWorkspacePath(subjectId: number, workspace: string | undefined) {
  const validWorkspace = subjectContentWorkspaces.some(candidate => candidate.key === workspace);
  return Number.isFinite(subjectId) && subjectId > 0 && validWorkspace ? subjectContentWorkspacePath(subjectId, workspace as SubjectContentWorkspaceKey) : "/app/subjects";
}

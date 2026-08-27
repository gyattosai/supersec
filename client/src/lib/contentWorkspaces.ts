export const subjectContentWorkspaces = [
  {
    key: "announcements",
    title: "Announcements",
    description: "Write, review, publish, share, and retain class updates without mixing them with Resources or Questions & Answers.",
    action: "Open Announcements",
  },
  {
    key: "resources",
    title: "Resources",
    description: "Keep class links, files, forms, and meeting destinations in their own library.",
    action: "Open Resources",
  },
  {
    key: "questions",
    title: "Questions & Answers",
    description: "Keep reusable Messenger answers in a separate board that is ready to publish and share.",
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

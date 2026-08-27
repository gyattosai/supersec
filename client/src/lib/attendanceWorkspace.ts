export function attendanceWorkspacePath(subjectId: number) {
  return Number.isFinite(subjectId) && subjectId > 0 ? `/app/subjects/${subjectId}/attendance` : "/app/subjects";
}

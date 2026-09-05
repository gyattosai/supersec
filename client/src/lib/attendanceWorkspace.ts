export function attendanceWorkspacePath(subjectId: string | number) {
  const sId = String(subjectId || "");
  return sId && sId !== "0" && sId !== "NaN" ? `/app/subjects/${sId}/attendance` : "/app/subjects";
}

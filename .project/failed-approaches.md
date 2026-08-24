# Failed Approaches Log — Class Management System

<!-- Newest session blocks at top. Each session = exactly one ## section with ### per failure. Read BEFORE starting any new approach. -->

## Session 2026-08-24 — Continuation implementation
- **Summary:** A broad multi-file tracker-status patch was abandoned after the tracker hunk lacked the editor-required context.

### Broad tracker update without exact context
- **Goal:** Mark the verified attendance-normalization tracker items complete alongside the progress log.
- **Approach:** Use a multi-file patch containing a generic `todo.md` hunk without exact surrounding tracker lines.
- **Failure mode:** error
- **Root cause:** The project editor requires a freshly read target file and sufficiently specific unchanged context to locate an in-place update.
- **Signals:** `FAILED apply_patch /home/ubuntu/class-management-system/todo.md` and `Please read the file content of /home/ubuntu/class-management-system/todo.md to understand it before making any edits.`
- **Lesson:** For tracker edits, first read the current `todo.md`, then issue a tracker-only update that includes nearby unchanged lines for each hunk.
- **Related:** `.project/logs/errors.md` · Attendance tracker status patch did not apply; `.project/attempts.md` · Combined progress and tracker status patch.

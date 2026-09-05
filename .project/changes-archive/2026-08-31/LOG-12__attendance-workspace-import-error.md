# Change LOG-12 — Attendance workspace import error

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the missing path-helper import detected after updating the private Attendance return link.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Combined Attendance workflow
  - **Summary:** The session return link was moved to the Subject Attendance workspace but initially omitted its path-helper import.

  ### Missing Attendance workspace helper import
  - **Error:** `client/src/pages/AttendancePage.tsx(94,29): error TS2304: Cannot find name 'attendanceWorkspacePath'.`
  - **Where:** TypeScript incremental compilation after the session-header back-link edit.
  - **Environment:** Managed React/TypeScript development server.
  - **Reproduction:** Reference `attendanceWorkspacePath` in `AttendancePage.tsx` without importing it.
  - **Resolution:** Added the direct import from `@/lib/attendanceWorkspace`. TypeScript, 40 tests, client/SSR production builds, and whitespace validation passed.
  - **Related:** Planned entry in `.project/attempts.md`.
  ```
- **Reason:** Preserve the exact compiler error before its targeted correction.
- **Source task:** Current supersec combined Attendance workflow task.
- **Follow-up:** No further action required.
- **Status:** applied

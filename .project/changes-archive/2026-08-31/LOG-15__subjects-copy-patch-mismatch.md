# Change LOG-15 — Subject-library copy patch mismatch

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the unmatched combined SubjectsPage copy patch before a constrained retry.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Combined Attendance and shared-page refinement
  - **Summary:** A broad SubjectsPage copy patch did not match the current single-line JSX source; no change was applied.

  ### Subject-library copy patch mismatch
  - **Error:** `textEditor:No replacement was performed in /home/ubuntu/class-management-system/client/src/pages/SubjectsPage.tsx. failed to find the lines to replace`.
  - **Where:** Combined SubjectsPage copy refinement patch.
  - **Environment:** Managed project patch editor.
  - **Reproduction:** Apply the multi-hunk replacement against long current JSX lines that differ from the assumed hunk context.
  - **Resolution:** Replaced the Subject-library header using its complete current line. The broader copy pass then passed TypeScript, 41 tests, client/SSR production builds, whitespace validation, and private/public mobile captures.
  - **Related:** Planned entry in `.project/attempts.md`.
  ```
- **Reason:** Preserve the exact failed patch evidence before retrying the copy refinement.
- **Source task:** Current supersec workflow, shared-page, and copy-refinement task.
- **Follow-up:** No further action required.
- **Status:** applied

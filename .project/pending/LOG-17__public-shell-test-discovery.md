# Change LOG-17 — Shared-reader test discovery gap

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the non-executed public-shell test before converting it to the test runner’s configured filename convention.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Combined Attendance and shared-page refinement
  - **Summary:** The full suite passed, but the new shared-reader test used a `.tsx` suffix while the configured test discovery only includes `server/**/*.test.ts`.

  ### Public-shell test not discovered
  - **Error:** The test suite reported 13 files / 40 tests and did not list `server/public-shell.test.tsx`.
  - **Where:** Test discovery configuration and newly added shared-reader test file.
  - **Environment:** Vitest in the managed React/TypeScript project.
  - **Reproduction:** Create `server/public-shell.test.tsx` while `vitest.config.ts` includes only `server/**/*.test.ts`, then run `pnpm test`.
  - **Resolution:** Converted the test to `server/public-shell.test.ts` without JSX. The full suite listed and passed the test as 14 files / 41 tests.
  - **Related:** Planned entry in `.project/attempts.md`.
  ```
- **Reason:** Preserve the validation gap before applying its narrow test-file correction.
- **Source task:** Current supersec workflow, shared-page, and copy-refinement task.
- **Follow-up:** No further action required.
- **Status:** pending

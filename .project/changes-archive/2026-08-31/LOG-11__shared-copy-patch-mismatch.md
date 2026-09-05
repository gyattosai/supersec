# Change LOG-11 — Shared copy patch mismatch

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the multi-page copy-patch mismatch before focused retries.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Interface copy refinement
  - **Summary:** A combined copy patch did not match three long single-line page sections and requires isolated current-context edits.

  ### Shared page copy patch mismatch
  - **Error:** `textEditor:No replacement was performed` for `SecretaryPages.tsx`, `ArchivePage.tsx`, and `ReportsPage.tsx` because the combined patch could not locate three assumed long-line contexts.
  - **Where:** Combined dashboard, archive, and reports copy refinement patch.
  - **Environment:** Managed project patch editor.
  - **Reproduction:** Apply the original multi-file replacement hunks against current single-line JSX sections.
  - **Resolution:** The focused Reports header applied. The Archive header applied after re-reading its exact line. The failed combined hunks were not retried without current context; all applied copy changes passed TypeScript, 40 tests, client/SSR builds, whitespace validation, and mobile captures.
  - **Related:** Planned entry in `.project/attempts.md`.
  ```
- **Reason:** Preserve the exact partial-patch failure before retrying the remaining copy work.
- **Source task:** Current supersec interface-copy refinement task.
- **Follow-up:** No further action required.
- **Status:** applied

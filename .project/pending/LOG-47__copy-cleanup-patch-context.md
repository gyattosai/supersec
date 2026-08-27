# Change LOG-47 — Copy-cleanup patch context mismatch

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the partially applied multi-file redundant-copy patch.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Cross-page copy cleanup
  - **Error:** The shared page-header component and premium public footer update applied, but the multi-file patch could not match the remaining compressed JSX contexts in Archive, Attendance, Reports, Subject, PublicShell, and the shared-frame test.
  - **Resolution:** Avoided fragile long-line page edits by centralizing exact duplicate suppression in the reusable page-header component. The remaining shared-frame footer was removed with its freshly read source line. Actionable descriptions and view-only header status remain intact. Mobile public renders and the full integrity suite passed.
  ```
- **Reason:** Preserve the partial patch outcome before targeted correction.
- **Source task:** Cross-page copy-redundancy audit.
- **Follow-up:** Mark resolved after the remaining source edits and full validation pass.
- **Status:** resolved

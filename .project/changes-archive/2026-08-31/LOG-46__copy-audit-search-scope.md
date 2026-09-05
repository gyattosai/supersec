# Change LOG-46 — Copy-audit search scope correction

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the incorrect file-path search scope used during the redundancy audit.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Copy-audit search scope
  - **Error:** The file-search operation returned `Search scope path is not a directory` because a single TypeScript file path was used where the search tool requires a directory glob.
  - **Resolution:** Reran the exact header search under the pages directory using a filename filter. The audit identified exact Archive, Attendance, Reports, and New Subject eyebrow/title duplicates, plus the repeated public footer.
  ```
- **Reason:** Preserve the harmless audit-tool correction before retrying.
- **Source task:** Cross-page copy-redundancy audit.
- **Follow-up:** Mark resolved after the corrected search completes.
- **Status:** resolved

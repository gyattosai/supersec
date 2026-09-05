# Change LOG-48 — Copy test JSX parse error

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the test-file JSX parser failure before applying the minimal syntax correction.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Cross-page copy cleanup
  - **Error:** `server/copy-redundancy.test.ts` failed to transform because it used JSX while retaining the `.ts` extension: `Expected ">" but found "eyebrow"` at the `WorkspacePageHeader` render.
  - **Resolution:** Kept the test as `.ts` and constructed the identical component with `createElement`, matching the project’s existing server-render test style. The focused and full test suites passed.
  ```
- **Reason:** Capture the exact validation failure before the targeted correction.
- **Source task:** Cross-page copy-redundancy audit.
- **Follow-up:** Mark resolved after focused and full validation pass.
- **Status:** resolved

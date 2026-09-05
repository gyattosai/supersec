# Change LOG-26 — Theme test parenthesis error

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the syntax error in the first ThemeProvider test-wrapper edit.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Font restoration and soft-white light mode
  - **Summary:** The first nested ThemeProvider/Router server-render expression omitted one closing parenthesis.

  ### Shared-reader test nested render syntax error
  - **Error:** `Expected ")" but found ";"` at `server/public-shell.test.ts:10:231`.
  - **Where:** Vitest transform of the shared-reader test.
  - **Environment:** Local project test suite.
  - **Reproduction:** Nest the ThemeProvider, Router, PublicShell, and child element in one `createElement` expression with only four closing parentheses after the inner child.
  - **Resolution:** Replaced the one-line nested expression with a formatted element tree assigned before `renderToStaticMarkup`. Pending full-suite confirmation.
  - **Related:** LOG-24.
  ```
- **Reason:** Preserve the exact syntax failure before its minimal correction.
- **Source task:** Current supersec typography and soft-white theme task.
- **Follow-up:** Update after validation.
- **Status:** applied

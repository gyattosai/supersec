# Change LOG-25 — Theme test-context fix attempt

- **Operation:** log-entry
- **Target file(s):** `.project/attempts.md`
- **Summary:** Record the targeted correction for the new shared-page theme toggle test context.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Font restoration and soft-white light mode
  - **Summary:** The ThemeToggle required the test’s direct PublicShell render to include the same ThemeProvider supplied by App.

  ### Add ThemeProvider to the shared-reader server-render test
  - **Problem:** `PublicShell` now renders ThemeToggle, but the direct server-render test did not provide ThemeContext.
  - **Attempt:** Wrapped the test’s existing Wouter Router and PublicShell tree in ThemeProvider using `defaultTheme="dark"` and `switchable`.
  - **Result:** pending validation
  - **Evidence:** The ThemeProvider wrapper is now formatted as a separate balanced element tree and matches the application provider composition in `App.tsx`.
  - **Follow-up:** Run the full validation suite and record the result.
  ```
- **Reason:** Preserve the exact correction before testing it.
- **Source task:** Current supersec typography and soft-white theme task.
- **Follow-up:** Update after validation.
- **Status:** applied

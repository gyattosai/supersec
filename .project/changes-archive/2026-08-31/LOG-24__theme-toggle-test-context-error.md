# Change LOG-24 — Theme toggle test context error

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the shared-reader test failure introduced by adding the theme toggle.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Font restoration and soft-white light mode
  - **Summary:** The full validation suite found that a direct PublicShell unit render does not provide the ThemeProvider required by the new ThemeToggle.

  ### ThemeToggle missing ThemeProvider in shared-reader test
  - **Error:** `useTheme must be used within ThemeProvider`
  - **Where:** `server/public-shell.test.ts` while server-rendering `PublicShell`.
  - **Environment:** Vitest server render; application runtime is already wrapped by ThemeProvider in `App.tsx`.
  - **Reproduction:** Render PublicShell directly inside the existing Wouter SSR test router without ThemeProvider.
  - **Resolution:** Wrapped the test render in the existing ThemeProvider with the app’s dark default and theme switching enabled. Pending full-suite confirmation.
  - **Related:** `client/src/components/ThemeToggle.tsx`.
  ```
- **Reason:** Preserve the exact test failure before fixing the missing test context.
- **Source task:** Current supersec typography and soft-white theme task.
- **Follow-up:** Re-run full validation and update this record with the result.
- **Status:** applied

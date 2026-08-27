# Change LOG-27 — Playwright runtime unavailable

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the unavailable optional browser-testing runtime during light-mode verification.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Font restoration and soft-white light mode
  - **Summary:** The optional browser automation runtime was unavailable when attempting to verify persisted light mode.

  ### Playwright is not installed
  - **Error:** `Playwright is not installed. Run npm run setup in the skill directory.`
  - **Where:** Focused public light-mode interaction check.
  - **Environment:** Local sandbox skill runner.
  - **Reproduction:** Run the shared Playwright skill runner with a browser-check script before the skill setup is installed.
  - **Resolution:** Installed the trusted browser-testing runtime with the skill’s documented setup command. Pending a retry of the same persisted light-mode interaction check.
  - **Related:** `/home/ubuntu/light-mode-browser-check.mjs` is a transient local test helper, not a project artifact.
  ```
- **Reason:** Preserve the environment constraint before switching validation approach.
- **Source task:** Current supersec typography and soft-white theme task.
- **Follow-up:** Retry the browser check and record its result.
- **Status:** pending

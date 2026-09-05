# Change LOG-31 — Gradient light-mode browser runner reset

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the transient browser-runner dependency reset observed during light-mode gradient verification.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Gradient treatment refinement
  - **Summary:** The visual verification helper could not start because its local testing dependency was no longer installed after the previous task session.

  ### Browser runner reports missing Playwright after prior successful setup
  - **Error:** `Playwright is not installed. Run npm run setup in the skill directory.`
  - **Where:** Focused mobile light-mode verification through the browser-testing runner.
  - **Environment:** Local skill runtime after a prior successful runner execution.
  - **Reproduction:** Run the saved helper when the skill-local dependency folder is absent.
  - **Resolution:** Restored the skill-local runner dependency and Chromium through its documented setup step. The unchanged helper then passed: light mode switched and persisted after reload.
  - **Related:** LOG-28 and LOG-29.
  ```
- **Reason:** Preserve the exact transient dependency error before retrying visual validation.
- **Source task:** Current supersec gradient-effect refinement.
- **Follow-up:** Update after the visual check passes or a durable blocker is confirmed.
- **Status:** resolved

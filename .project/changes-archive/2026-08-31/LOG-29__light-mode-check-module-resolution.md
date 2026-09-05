# Change LOG-29 — Light-mode browser check module resolution

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the transient helper’s inability to resolve the skill-local Playwright package.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Font restoration and soft-white light mode
  - **Summary:** The ESM helper syntax was corrected, but the helper resides outside the skill directory, so Node does not resolve that directory’s local Playwright package.

  ### Browser-check helper cannot resolve the skill-local Playwright package
  - **Error:** `ERR_MODULE_NOT_FOUND: Cannot find package 'playwright' imported from /home/ubuntu/light-mode-browser-check.mjs`.
  - **Where:** Temporary browser-check execution through the skill runner.
  - **Environment:** Node 22 ESM resolver.
  - **Reproduction:** Run an ESM script outside the skill’s directory with a bare `playwright` package import.
  - **Resolution:** Kept the helper outside the skill directory and imported Playwright through its inspected absolute ESM entry point instead. The retry confirmed switching to light mode and persistence after reload.
  - **Related:** LOG-27 and LOG-28.
  ```
- **Reason:** Preserve the exact transient environment error before its minimal resolution.
- **Source task:** Current supersec typography and soft-white theme task.
- **Follow-up:** Update after browser interaction verification.
- **Status:** resolved

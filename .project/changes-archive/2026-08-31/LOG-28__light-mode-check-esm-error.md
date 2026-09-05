# Change LOG-28 — Light-mode browser check ESM error

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the test helper module-syntax mismatch before correcting it.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Font restoration and soft-white light mode
  - **Summary:** The installed browser-testing runner correctly invoked the temporary `.mjs` check, but its CommonJS imports are not valid in ESM.

  ### Browser-check helper uses CommonJS inside `.mjs`
  - **Error:** `ReferenceError: require is not defined in ES module scope, you can use import instead`.
  - **Where:** `/home/ubuntu/light-mode-browser-check.mjs` line 1.
  - **Environment:** Node 22 ESM runtime through the installed browser-testing skill.
  - **Reproduction:** Use `require("playwright")` in a `.mjs` helper.
  - **Resolution:** Converted the transient helper to `import` statements for Playwright and Node assertions. The next retry reached module resolution, confirming the ESM syntax error was corrected.
  - **Related:** LOG-27.
  ```
- **Reason:** Preserve the exact helper error before the minimal syntax correction.
- **Source task:** Current supersec typography and soft-white theme task.
- **Follow-up:** Update after browser interaction verification.
- **Status:** resolved

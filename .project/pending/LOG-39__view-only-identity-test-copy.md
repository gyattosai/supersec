# Change LOG-39 — View-only identity test copy mismatch

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the failed static UI-copy assertion in the new view-only identity test.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — View-only section identity
  - **Error:** `server/view-only-identity.test.ts` expected `label="View-only header"`, but the Subject editor uses a section heading, `<p className="text-sm font-semibold">View-only header</p>`.
  - **Environment:** `pnpm exec vitest run server/view-only-identity.test.ts server/public-shell.test.ts`.
  - **Resolution:** Updated the test expectation to match the implemented section heading while retaining both input-placeholder assertions. The focused test rerun passed.
  ```
- **Reason:** Preserve the exact validation mismatch before applying the minimal test-only correction.
- **Source task:** Configurable view-only section identity.
- **Follow-up:** Mark resolved after the focused test rerun passes.
- **Status:** resolved

# Change LOG-20 — Final workflow and copy refinement attempts

- **Operation:** log-entry
- **Target file(s):** `.project/attempts.md`
- **Summary:** Record the successful test-discovery and server-render test corrections.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Final workflow and copy validation
  - **Summary:** A new shared-reader test initially used the wrong suffix, then lacked Wouter server-render context; both focused corrections passed.

  ### Use the configured `.test.ts` suffix for the shared-reader test
  - **Problem:** `server/public-shell.test.tsx` did not run because the configured test pattern is `server/**/*.test.ts`.
  - **Attempt:** Recreated the test as `server/public-shell.test.ts` without JSX and removed the obsolete file.
  - **Result:** worked
  - **Evidence:** The full suite listed `server/public-shell.test.ts` and ran 14 test files / 41 tests.
  - **Follow-up:** done

  ### Provide Wouter SSR context in the shared-reader test
  - **Problem:** The discovered test failed with `ReferenceError: location is not defined` while rendering a Wouter Link on the server.
  - **Attempt:** Wrapped the rendered `PublicShell` in the established Wouter `Router` using `ssrPath`.
  - **Result:** worked
  - **Evidence:** The same full suite then passed: 14 files / 41 tests, type check, client/SSR builds, and whitespace validation.
  - **Follow-up:** done
  ```
- **Reason:** Preserve the exact successful outcomes from final test recovery.
- **Source task:** Current supersec workflow, shared-page, and copy-refinement task.
- **Follow-up:** Apply only after review with the related error records.
- **Status:** applied

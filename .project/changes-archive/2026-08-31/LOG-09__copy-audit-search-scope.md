# Change LOG-09 — Copy audit source search scope

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the unsupported brace-glob file scope used during the UI copy audit.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Interface copy refinement
  - **Summary:** The initial copy-audit source search returned no files because its brace-glob scope was not supported.

  ### Copy audit search-scope mismatch
  - **Error:** `No text files found matching pattern "/home/ubuntu/class-management-system/client/src/**/*.{ts,tsx}"`.
  - **Where:** Source-text search before UI copy revision.
  - **Environment:** Managed project file search.
  - **Reproduction:** Use a brace expansion in the source search scope.
  - **Resolution:** Pending separate supported `.ts` and `.tsx` source searches.
  - **Related:** None.
  ```
- **Reason:** Preserve the search error before retrying the audit with compatible scope patterns.
- **Source task:** Current supersec interface-copy refinement task.
- **Follow-up:** Update the resolution after the corrected audit runs.
- **Status:** applied

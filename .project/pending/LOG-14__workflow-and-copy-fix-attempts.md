# Change LOG-14 — Workflow and copy refinement attempts

- **Operation:** log-entry
- **Target file(s):** `.project/attempts.md`
- **Summary:** Record the completed targeted corrections and validation evidence from the combined workflow refinement.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Combined Attendance and shared-page refinement
  - **Summary:** Focused retries corrected copy-patch context mismatches, a missing path-helper import, and a schema-name error in read-only validation.

  ### Apply copy edits only after re-reading one-line JSX context
  - **Problem:** Combined long-line page patches did not match current JSX.
  - **Attempt:** Re-read the affected source and applied focused exact-context changes; no broad retry was attempted.
  - **Result:** worked
  - **Evidence:** Mobile views rendered the updated private and shared wording; TypeScript and 40 tests passed.
  - **Follow-up:** done

  ### Import the combined Attendance route helper
  - **Problem:** The private session back link referenced `attendanceWorkspacePath` without importing it.
  - **Attempt:** Added the one missing import from `@/lib/attendanceWorkspace`.
  - **Result:** worked
  - **Evidence:** TypeScript, client/SSR builds, and full test suite passed.
  - **Follow-up:** done

  ### Use schema-verified names in public Subject route lookup
  - **Problem:** A read-only validation query used `publish_state` instead of the camel-case schema column.
  - **Attempt:** Verified the Drizzle schema and reran the query with `publishState` and `publicId`.
  - **Result:** worked
  - **Evidence:** The lookup returned a published Subject ID, then eight private/public mobile routes rendered successfully.
  - **Follow-up:** done
  ```
- **Reason:** Preserve evidence-backed outcomes for all repair attempts completed in this session.
- **Source task:** Current supersec workflow, shared-page, and copy-refinement task.
- **Follow-up:** Apply only after review alongside the related error records.
- **Status:** pending

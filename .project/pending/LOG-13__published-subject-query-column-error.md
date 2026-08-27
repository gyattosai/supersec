# Change LOG-13 — Published Subject lookup column error

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the failed read-only public Subject lookup before retrying with verified schema names.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Combined Attendance and shared-page refinement
  - **Summary:** A read-only query for a published Subject ID used an assumed database column name and failed; no data was modified.

  ### Invalid published Subject column in validation query
  - **Error:** `ERROR 1054 (42S22) at line 1: Unknown column 'publish_state' in 'where clause'`.
  - **Where:** Read-only SQL lookup for a public Subject route.
  - **Environment:** Managed MySQL/TiDB database.
  - **Reproduction:** Run `SELECT public_id AS publicId FROM subjects WHERE publish_state = 'published' AND status = 'active' LIMIT 1;`.
  - **Resolution:** Verified `publicId` and `publishState` in the schema, then reran the read-only query successfully. No data was written or changed.
  - **Related:** None.
  ```
- **Reason:** Record the exact database validation error before retrying the lookup.
- **Source task:** Current supersec combined Attendance and shared-page refinement task.
- **Follow-up:** No further action required.
- **Status:** pending

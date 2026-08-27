# Change LOG-53 — Managed port helper module resolution

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the exact transient server reload error after adding the new managed-port helper.
- **Content:**
  ```markdown
  ### Managed port helper was not visible during the first server reload
  - **Error:** `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/ubuntu/class-management-system/server/_core/port' imported from /home/ubuntu/class-management-system/server/_core/index.ts`.
  - **Where:** Development server’s file-watch reload immediately after `server/_core/port.ts` and the `index.ts` import were introduced in one patch.
  - **Environment:** Node 22 with `tsx watch` in the managed development server.
  - **Reproduction:** Update an importing file and create its new extensionless TypeScript ESM dependency in the same watch-triggered edit.
  - **Resolution:** A clean managed restart loaded the helper successfully and reported the configured port. The focused port test and full suite passed. No user data was changed by this watcher recovery.
  - **Related:** Create Subject received HTML where the tRPC client expected JSON.
  ```
- **Reason:** Preserve the watcher error before determining whether an import correction is needed.
- **Source task:** Subject creation managed-port correction.
- **Follow-up:** Update with the exact successful recovery result.
- **Status:** resolved

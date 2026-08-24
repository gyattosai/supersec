# Change LOG-10 — Foundation migration baseline-table failure

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the interrupted foundation migration and its non-destructive repair path.
- **Content:**
  ```markdown
  ## Session 2026-08-24 — Milestone 2 app foundation
  - **Summary:** The generated foundation migration created 14 new tables but stopped before foreign keys because the template's baseline `users` table was absent from the database.

  ### Missing users table during foundation migration
  - **Error:** `ERROR 1824 (HY000) at line 190: Failed to open the referenced table 'users'`
  - **Where:** Applying the reviewed Milestone 2 schema migration through the project database executor.
  - **Environment:** Manus MySQL/TiDB project database.
  - **Reproduction:** Apply foreign keys that reference `users` when the current database lists the 14 new foundation tables but has no `users` table.
  - **Resolution:** Create the unchanged baseline `users` table, then apply the pending foreign keys and indexes. No created table will be dropped and no data will be removed.
  - **Related:** LOG-09 unsupported delete-and-add schema patch.
  ```
- **Reason:** Preserve the exact migration failure before repairing the partially applied non-destructive schema change.
- **Source task:** Current conversation
- **Follow-up:** After approval, add the error entry to `.project/logs/errors.md`, archive this review card, and apply the documented repair migration.
- **Status:** applied

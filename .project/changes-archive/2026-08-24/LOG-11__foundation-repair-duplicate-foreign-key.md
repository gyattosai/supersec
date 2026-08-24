# Change LOG-11 — Foundation repair duplicate foreign key

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the duplicate foreign-key error during the schema repair before inspecting the actual applied constraint state.
- **Content:**
  ```markdown
  ## Session 2026-08-24 — Milestone 2 app foundation
  - **Summary:** The non-destructive repair created the baseline users table but stopped because some foreign keys from the first migration attempt had already applied.

  ### Duplicate foreign key during repair
  - **Error:** `ERROR 1826 (HY000) at line 14: Duplicate foreign key constraint name 'announcements_subjectId_subjects_id_fk'`
  - **Where:** Applying the pending foreign keys after creating the baseline users table.
  - **Environment:** Manus MySQL/TiDB project database.
  - **Reproduction:** Reapply the complete foreign-key list after a partially completed prior migration has already added at least one constraint.
  - **Resolution:** Inspect `information_schema` for the applied constraints and indexes, then apply only the missing statements. No table or data removal is required.
  - **Related:** LOG-10 foundation migration baseline-table failure.
  ```
- **Reason:** Preserve the exact repair failure before using database metadata to finish only the missing changes.
- **Source task:** Current conversation
- **Follow-up:** After approval, add the error entry to `.project/logs/errors.md`, archive this review card, inspect the applied schema metadata, and apply only missing constraints/indexes.
- **Status:** applied

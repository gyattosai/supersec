# Change LOG-12 — Foundation migration identifier-length error

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the MySQL foreign-key identifier-length failure before adding the remaining constraints with shorter names.
- **Content:**
  ```markdown
  ## Session 2026-08-24 — Milestone 2 app foundation
  - **Summary:** The targeted schema repair applied the remaining standard foreign keys but stopped at an auto-generated foreign-key name that exceeds the database identifier limit.

  ### Foreign key identifier exceeds database limit
  - **Error:** `ERROR 1059 (42000) at line 15: Identifier name 'zoomMatchSuggestions_suggestedSubjectStudentId_subjectStudents_id_fk' is too long`
  - **Where:** Applying the last Zoom-match foreign keys and indexes for the Milestone 2 foundation.
  - **Environment:** Manus MySQL/TiDB project database.
  - **Reproduction:** Add the long auto-generated foreign-key identifier used by the `zoomMatchSuggestions.suggestedSubjectStudentId` relation.
  - **Resolution:** Add the two remaining Zoom-match foreign keys with short explicit database constraint names, then apply the pending indexes. Keep the relation behavior unchanged.
  - **Related:** LOG-10 foundation migration baseline-table failure; LOG-11 duplicate foreign key during repair.
  ```
- **Reason:** Preserve the exact database failure before completing the remaining non-destructive schema statements.
- **Source task:** Current conversation
- **Follow-up:** After approval, add the error entry to `.project/logs/errors.md`, archive this review card, and apply the remaining constraints and indexes with short names.
- **Status:** applied

# Change LOG-33 — Attendance-proof migration identifier limit

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the database constraint-name failure during the additive attendance-proof migration.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Public attendance-proof submissions
  - **Summary:** The reviewed additive migration began applying, then failed because MySQL limits identifier lengths to 64 characters.

  ### Generated foreign-key constraint name exceeds MySQL identifier limit
  - **Error:** `ERROR 1059 (42000): Identifier name 'attendanceProofSubmissions_matchedSubjectStudentId_subjectStudents_id_fk' is too long`.
  - **Where:** The second foreign-key statement in the generated attendance-proof migration.
  - **Environment:** Project MySQL/TiDB schema migration execution.
  - **Reproduction:** Generate a Drizzle foreign-key name from the long table and column names without a custom constraint name.
  - **Resolution:** Inspection confirmed the table and first foreign key were applied, while the second foreign key and indexes were not. The generated migration now uses the concise `attendance_proof_student_fk` name. The missing foreign key and both indexes were added successfully, then verified through `information_schema`.
  ```
- **Reason:** Preserve the exact schema error before any corrective action.
- **Source task:** Public attendance-proof submission feature.
- **Follow-up:** Update after schema inspection and successful migration completion.
- **Status:** resolved

# Change LOG-06 — Report ownership schema compile event

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the expected TypeScript compile event after adding a required report owner field before updating report creation.
- **Content:**
  ```markdown
  ### Report creation omitted the new required owner field
  - **Error:** `Property 'ownerId' is missing in type '{ publicId: string; reportType: "class_attendance" | "all_subject_attendance"; subjectId: number | null; classSessionId: number | null; }'`
  - **Where:** `server/routers/reports.ts`, report insertion after `reports.ownerId` became required in the schema.
  - **Environment:** TypeScript development watcher.
  - **Reproduction:** Add a non-null `reports.ownerId` schema column without supplying `ownerId` in the report create procedure.
  - **Resolution:** Add the authenticated owner ID to report creation, then generate and apply the reviewed additive migration.
  - **Related:** Report sharing implementation.
  ```
- **Reason:** The error-recording workflow requires this observed schema/code mismatch before its targeted correction.
- **Source task:** Current Class Management System continuation session.
- **Follow-up:** Apply only if approved.
- **Status:** applied

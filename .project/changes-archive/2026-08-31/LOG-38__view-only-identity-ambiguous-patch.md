# Change LOG-38 — View-only identity projection patch

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the ambiguous text-patch location encountered while extending multiple public Subject projection types.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — View-only section identity
  - **Error:** The database-projection patch could not choose between two identical `subject` type declarations: `No replacement was performed ... Found 2 places matching these lines, so the edit location is ambiguous`.
  - **Where:** `server/db.ts`, public content and public Attendance payload declarations.
  - **Resolution:** The first retry confirmed the Subject-home projection had already been applied before the later hunk failed. The questions and Attendance projections were then completed. TypeScript correctly identified the three remaining content-item subject projections that still lacked the new required fields; those three projection pairs were completed and the full TypeScript check passed.
  ```
- **Reason:** Preserve the patch failure before the minimal corrective edit.
- **Source task:** Configurable view-only section identity.
- **Follow-up:** Mark resolved after the public projections compile.
- **Status:** resolved

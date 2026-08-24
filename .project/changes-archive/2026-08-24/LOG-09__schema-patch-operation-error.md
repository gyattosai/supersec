# Change LOG-09 — Schema patch operation error

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the unsupported delete-and-add schema patch operation before retrying with a file overwrite.
- **Content:**
  ```markdown
  ## Session 2026-08-24 — Milestone 2 app foundation
  - **Summary:** The initial schema replacement attempt failed because the project editor does not support file deletion in a patch.

  ### Unsupported delete-and-add schema patch
  - **Error:** `webdev_apply_patch does not support deleting files. Use the shell tool to delete (e.g. rm <path>) or rename (mv <old> <new>) files.`
  - **Where:** Attempted replacement of `drizzle/schema.ts` for the Milestone 2 relational foundation.
  - **Environment:** Manus web project editor, Ubuntu sandbox.
  - **Reproduction:** Submit a patch containing `*** Delete File:` followed by `*** Add File:` for the same schema file.
  - **Resolution:** Replace the schema using one supported `*** Add File:` overwrite section, then generate and inspect the migration.
  - **Related:** None.
  ```
- **Reason:** Preserve the exact tool failure before retrying the schema edit.
- **Source task:** Current conversation
- **Follow-up:** After approval, add the error entry to `.project/logs/errors.md` and archive this review card.
- **Status:** applied

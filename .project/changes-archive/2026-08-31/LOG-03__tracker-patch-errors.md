# Change LOG-03 — Tracker-patch error records

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Add the partial tracker-update failure and absent failed-approaches log event to the current continuation-verification session block.
- **Content:**
  ```markdown
  ### Attendance tracker status patch did not apply
  - **Error:** `FAILED apply_patch /home/ubuntu/class-management-system/todo.md` followed by `Please read the file content of /home/ubuntu/class-management-system/todo.md to understand it before making any edits.`
  - **Where:** Applying the approved attendance-normalization tracker-status changes.
  - **Environment:** Manus web project editor.
  - **Reproduction:** Submit a multi-file patch that changes tracker lines without the editor-required surrounding context.
  - **Resolution:** Pending targeted retry with the freshly read tracker context; the progress log update did apply, while the tracker remains unchanged.
  - **Related:** Attempted fix record in `.project/attempts.md`.

  ### Failed-approaches log was not present
  - **Error:** `textEditor:The path /home/ubuntu/class-management-system/.project/failed-approaches.md does not exist. Please provide a valid path.`
  - **Where:** Required review of the failed-approaches log before a tracker-edit recovery.
  - **Environment:** Manus web project sandbox.
  - **Reproduction:** Read `/home/ubuntu/class-management-system/.project/failed-approaches.md` when the file has not yet been created.
  - **Resolution:** Create the log through the project review gate and use it for future recovery decisions.
  - **Related:** Attendance tracker status patch did not apply.
  ```
- **Reason:** The error-recording workflow requires exact error events before retrying the failed tracker update.
- **Source task:** Current Class Management System continuation session.
- **Follow-up:** Apply only if approved.
- **Status:** applied

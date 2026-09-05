# Change LOG-07 — Public report helper patch failure

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the ambiguous database-helper insertion and temporary router/type mismatch during public report implementation.
- **Content:**
  ```markdown
  ### Public report helper insertion was ambiguous
  - **Error:** `No replacement was performed in /home/ubuntu/class-management-system/server/db.ts. Found 3 places matching these lines, so the edit location is ambiguous.`
  - **Where:** Adding `getPublicReportById` and its type in `server/db.ts`.
  - **Environment:** Manus web project editor and TypeScript watcher.
  - **Reproduction:** Insert a helper using a generic closing-brace context in a file with multiple matching locations.
  - **Resolution:** Pending target-specific retry immediately after `getPublicContentHistory`; the companion router export exists but cannot compile until the helper is added.
  - **Related:** Reports public sharing.
  ```
- **Reason:** The recovery workflow requires an exact record before a context-specific retry.
- **Source task:** Current Class Management System continuation session.
- **Follow-up:** Apply only if approved.
- **Status:** applied

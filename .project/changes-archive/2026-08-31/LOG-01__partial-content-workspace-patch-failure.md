# Change LOG-01 — Partial content-workspace patch failure

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the partial multi-file patch failure before retrying the affected workspace-entry files.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Independent content workspaces
  - **Summary:** A multi-file interface patch updated the focused content workspace but failed to match the current one-line source in two related workspace-entry files.

  ### Partial multi-file patch failure
  - **Error:** `[2/3] FAILED apply_patch /home/ubuntu/class-management-system/client/src/pages/SubjectPages.tsx\nPlease read the file content of /home/ubuntu/class-management-system/client/src/pages/SubjectPages.tsx to understand it before making any edits.`
  - **Where:** Multi-file workspace-separation patch; `SubjectPages.tsx` and `SecretaryPages.tsx` sections.
  - **Environment:** Ubuntu 24.04; React 19; TypeScript; managed web project.
  - **Reproduction:** Apply an update hunk that expects the prior one-line page function after it no longer matches the current source exactly.
  - **Resolution:** Re-read the affected files and apply isolated, current-context patches. Pending verification.
  - **Related:** None.

  ### Route update patch mismatch
  - **Error:** `[2/3] FAILED apply_patch /home/ubuntu/class-management-system/client/src/App.tsx\nPlease read the file content of /home/ubuntu/class-management-system/client/src/App.tsx to understand it before making any edits.`
  - **Where:** Multi-file workspace-separation patch; `App.tsx` route registration.
  - **Environment:** Ubuntu 24.04; React 19; TypeScript; managed web project.
  - **Reproduction:** Apply an update hunk that expects the prior import/route context after a previous multi-file patch has partially completed.
  - **Resolution:** Re-read the current route file and apply an isolated patch. Pending verification.
  - **Related:** Partial multi-file patch failure above.

  ### Artifact registry unavailable
  - **Error:** `Error:textEditor:The path /home/ubuntu/class-management-system/.project/artifacts.md does not exist. Please provide a valid path.`
  - **Where:** Artifact-registration check for the new workspace component and configuration.
  - **Environment:** Ubuntu 24.04; managed web project.
  - **Reproduction:** Attempt to read `.project/artifacts.md` when the project currently has no artifact registry file.
  - **Resolution:** Stage creation of an artifact registry and entries for the new durable implementation files. Pending verification.
  - **Related:** None.

  ### Task tracker patch mismatch
  - **Error:** `[1/2] FAILED apply_patch /home/ubuntu/class-management-system/todo.md\nPlease read the file content of /home/ubuntu/class-management-system/todo.md to understand it before making any edits.`
  - **Where:** Completion update for the independent content-workspace task.
  - **Environment:** Ubuntu 24.04; managed web project.
  - **Reproduction:** Apply a task-tracker hunk with insufficient surrounding source context.
  - **Resolution:** Re-read the task tracker and apply the checkbox update in an isolated patch. Pending verification.
  - **Related:** Partial multi-file patch failure above.
  ```
- **Reason:** Preserve the exact tool failure and recovery path before a retry.
- **Source task:** Current supersec implementation task.
- **Follow-up:** Update the resolutions after isolated patches and validation succeed.
- **Status:** applied

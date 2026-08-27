# Change LOG-21 — Duplicate checkpoint phase advance

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the plan tool’s harmless rejection of an attempt to advance from the already active checkpoint phase.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Final checkpoint preparation
  - **Summary:** A phase-advance call was unnecessary because the plan was already in the checkpoint phase.

  ### Duplicate checkpoint phase advance
  - **Error:** `Invalid phase advance: cannot advance to the same phase (phase 5). You are already in this phase.`
  - **Where:** Task-plan advance action during final checkpoint preparation.
  - **Environment:** Managed task plan.
  - **Reproduction:** Request an advance from phase 5 to phase 5.
  - **Resolution:** No code or deliverable was affected. Continue with the active checkpoint phase without another advance.
  - **Related:** None.
  ```
- **Reason:** Preserve the exact planning error without conflating it with application behavior.
- **Source task:** Current supersec workflow, shared-page, and copy-refinement task.
- **Follow-up:** None.
- **Status:** pending

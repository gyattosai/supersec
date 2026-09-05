# Change LOG-16 — Final capture failure

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the blank Dashboard capture and failed public Subject capture before isolated diagnosis.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Combined Attendance and shared-page refinement
  - **Summary:** Final multi-route screenshot capture returned a blank Dashboard frame and one failed public Subject capture after prior successful route rendering.

  ### Final multi-route screenshot capture failure
  - **Error:** `Screenshot failed for /s/_dX7KAuHu6qP: Screenshot capture failed`; the `/app` frame was captured but blank.
  - **Where:** Managed responsive screenshot capture at 390 × 844.
  - **Environment:** Managed development preview after successful TypeScript, test, and production-build validation.
  - **Reproduction:** Capture `/app` and `/s/_dX7KAuHu6qP` together in one full-page request.
  - **Resolution:** Recent development and browser logs contained no runtime error. Isolated 390 × 844 retries rendered both the revised Dashboard and the premium shared Subject page successfully.
  - **Related:** Planned entry in `.project/attempts.md`.
  ```
- **Reason:** Preserve the exact transient validation failure before diagnosis.
- **Source task:** Current supersec workflow, shared-page, and copy-refinement task.
- **Follow-up:** No persistent route issue observed; retain the batch result as transient evidence only.
- **Status:** applied

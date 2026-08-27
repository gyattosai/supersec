# Change LOG-07 — Attendance mobile capture blank

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the blank Attendance frame observed in an otherwise successful four-route mobile validation batch.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Reporting and list refinement
  - **Summary:** The multi-route mobile capture rendered Subject home, Reports, and Students; the Attendance frame was blank and requires isolated verification.

  ### Attendance multi-route mobile capture blank
  - **Error:** `Screenshot captured for /app/attendance/1` returned a blank black frame in the four-route mobile capture batch.
  - **Where:** Managed visual verification at 390 × 844.
  - **Environment:** Ubuntu 24.04; React 19; TypeScript; managed development server.
  - **Reproduction:** Capture Subject home, Reports, Students, and Attendance together in one mobile validation request.
  - **Resolution:** Recent development and browser logs contained no runtime stack trace. An isolated 390 × 844 capture then rendered the complete Attendance workspace including the new sort control.
  - **Related:** Planned entry in `.project/attempts.md` if isolated capture changes the outcome.
  ```
- **Reason:** Preserve the exact intermittent visual-validation result before retrying the route.
- **Source task:** Current supersec reporting and list-refinement task.
- **Follow-up:** No persistent route issue observed; retain the batch result as transient evidence only.
- **Status:** pending

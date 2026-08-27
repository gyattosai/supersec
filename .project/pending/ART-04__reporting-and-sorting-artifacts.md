# Change ART-04 — Reporting and sorting artifacts

- **Operation:** add
- **Target file(s):** `.project/artifacts.md`
- **Summary:** Register the reusable PDF-export and private-list sorting utilities.
- **Content:**
  ```markdown
  ## ART-008 — Private list sorting contract
  - **Path/URL:** `shared/attendanceSorting.ts`
  - **Type:** code
  - **Purpose:** Provides stable client-side sorting for Students (Master List) and private Attendance records.
  - **Created:** 2026-08-27 | **Last updated:** 2026-08-27
  - **Format:** `.ts`
  - **Notes:** Supports name, status/conflict, and private-note ordering without mutating source rows.

  ## ART-007 — Subject and compiled PDF export contract
  - **Path/URL:** `client/src/lib/reportPdf.ts` and `shared/reportPdf.ts`
  - **Type:** code
  - **Purpose:** Produces download-ready private session, aggregate Subject, and selected-Subject compiled Attendance PDFs.
  - **Created:** 2026-08-27 | **Last updated:** 2026-08-27
  - **Format:** `.ts`
  - **Notes:** Client bundle loads the PDF dependencies only when an export is requested; aggregate exports exclude student/private source data.
  ```
- **Reason:** Keep the new reporting and sorting contracts easy to find for future maintenance.
- **Source task:** Current supersec reporting and list-refinement task.
- **Follow-up:** Apply after ART-01 creates the artifact registry.
- **Status:** pending

# Change ART-05 — Attendance workspace and shared-reader frame

- **Operation:** add
- **Target file(s):** `.project/artifacts.md`
- **Summary:** Register the combined Attendance route contract and shared reader presentation boundary.
- **Content:**
  ```markdown
  ## ART-010 — Combined Subject Attendance workspace
  - **Path/URL:** `client/src/lib/attendanceWorkspace.ts`, `client/src/pages/FocusedSchedulePage.tsx`, and `client/src/pages/AttendancePage.tsx`
  - **Type:** code
  - **Purpose:** Consolidates class dates, No Class notices, and individual Attendance sessions under `/app/subjects/:subjectId/attendance`.
  - **Created:** 2026-08-27 | **Last updated:** 2026-08-27
  - **Format:** `.ts`, `.tsx`
  - **Notes:** Former schedule links redirect safely to the combined workflow; unit coverage verifies safe route fallback.

  ## ART-009 — Shared view-only reader frame
  - **Path/URL:** `client/src/pages/PublicPages.tsx` and `client/src/pages/PremiumPublicSubjectHome.tsx`
  - **Type:** code
  - **Purpose:** Provides the premium mobile-first view-only framing for anonymous Subject, content, Attendance, and report readers.
  - **Created:** 2026-08-27 | **Last updated:** 2026-08-27
  - **Format:** `.tsx`
  - **Notes:** UI-only refinement that retains existing safe public projections and visibly labels shared pages as view-only.
  ```
- **Reason:** Keep the two durable workflow/presentation boundaries discoverable for future work.
- **Source task:** Current supersec workflow, shared-page, and copy-refinement task.
- **Follow-up:** Apply after ART-01 creates the artifact registry.
- **Status:** applied

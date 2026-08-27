# Change ART-01 — Independent content workspace artifacts

- **Operation:** add
- **Target file(s):** `.project/artifacts.md`
- **Summary:** Create the artifact registry and register the durable independent content-workspace implementation files.
- **Content:**
  ```markdown
  # Artifact Registry — class-management-system

  <!-- Newest entries at top. Deduplicated by Path/URL. -->

  ## ART-002 — Subject content workspace contract
  - **Path/URL:** `client/src/lib/contentWorkspaces.ts`
  - **Type:** code
  - **Purpose:** Defines the three independent Announcements, Resources, and Questions & Answers workspaces and their direct Subject-scoped paths.
  - **Created:** 2026-08-27 | **Last updated:** 2026-08-27
  - **Format:** `.ts`
  - **Notes:** Used by the Subject workspace launch surface and covered by `server/content.workspaces.test.ts`.

  ## ART-001 — Independent Subject workspace page
  - **Path/URL:** `client/src/pages/IndependentSubjectWorkspacePage.tsx`
  - **Type:** code
  - **Purpose:** Provides the focused Subject home with separate launch cards for Announcements, Resources, and Questions & Answers.
  - **Created:** 2026-08-27 | **Last updated:** 2026-08-27
  - **Format:** `.tsx`
  - **Notes:** Routed from `/app/subjects/:subjectId`; preserves existing content-specific creation, publishing, history, archive, and sharing flows.
  ```
- **Reason:** Ensure future work can locate the new workspace boundary and its shared contract without rediscovery.
- **Source task:** Current supersec implementation task.
- **Follow-up:** Apply only after review; no consumer behavior changes are required beyond the already implemented files.
- **Status:** pending

# Change ART-09 — View-only section identity

- **Operation:** artifact-registration
- **Target file(s):** `.project/artifacts.md`
- **Summary:** Register the configurable per-Subject view-only header identity as a cross-cutting public presentation feature.
- **Content:**
  ```markdown
  ## ART-09 — View-only section identity
  - **Path/URL:** `drizzle/schema.ts`, `drizzle/0010_bumpy_zaran.sql`, `server/routers/subjects.ts`, `server/db.ts`, `client/src/pages/SubjectPages.tsx`, `client/src/components/ViewOnlyHeader.tsx`, `client/src/pages/PublicPages.tsx`, `client/src/pages/PremiumPublicSubjectHome.tsx`, `client/src/pages/PremiumPublicResourcePage.tsx`, `client/src/pages/AttendanceProofPage.tsx`, `server/view-only-identity.test.ts`, `server/view-only-identity.pages.test.ts`, `server/public-shell.test.ts`
  - **Type:** code
  - **Purpose:** Provides secretary-editable short and full labels for Subject-scoped view-only headers, with a safe legacy fallback and reusable public identity resolution.
  - **Created:** 2026-08-27 | **Last updated:** 2026-08-27
  - **Format:** `.ts`, `.tsx`, `.sql`
  - **Notes:** Label values are public presentation data by design. Subject home and related Subject-scoped readers pass their loaded identity directly to the reusable header; aggregate views without a single Subject retain global fallback branding. Apply after ART-01 creates the artifact registry.
  ```
- **Reason:** Make this data-model, editor, and public-reader capability discoverable across sessions.
- **Source task:** Configurable view-only section identity.
- **Follow-up:** Apply after ART-01 creates the artifact registry.
- **Status:** pending

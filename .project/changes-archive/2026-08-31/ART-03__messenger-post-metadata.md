# Change ART-03 — Messenger post metadata formatter

- **Operation:** add
- **Target file(s):** `.project/artifacts.md`
- **Summary:** Register the reusable server-rendered public-post title formatter and its focused tests.
- **Content:**
  ```markdown
  ## ART-006 — Version-aware public post metadata
  - **Path/URL:** `client/src/ssr/prefetch.ts` and `server/ssr.metadata.test.ts`
  - **Type:** code
  - **Purpose:** Creates bounded public post titles containing both the item title and current version for HTML, Open Graph, and Twitter metadata.
  - **Created:** 2026-08-27 | **Last updated:** 2026-08-27
  - **Format:** `.ts`
  - **Notes:** Applied to Announcements, Resources, Questions & Answers, Attendance, and reports; unit and raw SSR checks validate consistent title metadata.
  ```
- **Reason:** Make the Messenger metadata contract discoverable for future social-preview and SEO work.
- **Source task:** Current supersec Messenger metadata task.
- **Follow-up:** Apply after ART-01 creates the artifact registry.
- **Status:** applied

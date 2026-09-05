# Change TAX-01 — Resource attachment structure

- **Operation:** taxonomy-add
- **Target file(s):** `.project/logs/taxonomy.md`
- **Summary:** Add the established Resource attachment structure for separately stored class files and images.
- **Content:**
  ```markdown
  # Taxonomy Log — class-management-system
  <!-- Newest session blocks at top. One ## Session block per session. Tags = kebab-case, established public/industry terms only. -->

  ## Session 2026-08-27 — Attachment improvements
  **Summary:** Added the Resource attachment structure for ordered, public-use class files and images.

  ### Structure-rule — Resource attachment
  - **Scope:** Project-wide data structure and Resource authoring workflow.
  - **Definition:** An ordered public-use media reference connected to one Resource for a downloadable class file or supporting image.
  - **Established-term check:** "Attachment" is established file-management terminology used across operating systems, storage products, and collaboration software.
  - **Reason:** Separate link metadata, cover images, Messenger previews, and course files while retaining clear public-sharing boundaries.
  - **Related:** `drizzle/schema.ts`, `server/routers/content.ts`, and `client/src/pages/FocusedContentPage.tsx`.
  ```
- **Reason:** Keep the project vocabulary aligned with the new durable attachment model.
- **Source task:** Current supersec attachment-improvement task.
- **Follow-up:** Apply only after review alongside related project-log changes.
- **Status:** applied

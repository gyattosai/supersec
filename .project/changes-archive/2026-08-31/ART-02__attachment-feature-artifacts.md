# Change ART-02 — Attachment feature artifacts

- **Operation:** add
- **Target file(s):** `.project/artifacts.md`
- **Summary:** Register the durable Resource attachment contract, upload policy, and shared presentation component.
- **Content:**
  ```markdown
  ## ART-005 — Public Resource attachment shelf
  - **Path/URL:** `client/src/components/PublicResourceAttachments.tsx`
  - **Type:** code
  - **Purpose:** Renders class-safe image and file attachments as accessible shared Resource cards.
  - **Created:** 2026-08-27 | **Last updated:** 2026-08-27
  - **Format:** `.tsx`
  - **Notes:** Used by the premium public Resource reader; presents only allowlisted public attachment metadata.

  ## ART-004 — Resource attachment data model
  - **Path/URL:** `drizzle/schema.ts` and `drizzle/0008_misty_charles_xavier.sql`
  - **Type:** code
  - **Purpose:** Defines and migrates ordered public-use attachments for Resources.
  - **Created:** 2026-08-27 | **Last updated:** 2026-08-27
  - **Format:** `.ts`, `.sql`
  - **Notes:** Database migration applied successfully; each attachment references an owner-controlled public media asset.

  ## ART-003 — Attachment upload policy
  - **Path/URL:** `shared/mediaPolicy.ts`
  - **Type:** code
  - **Purpose:** Centralizes supported public image/course-file formats, the 8 MB size cap, and display-size formatting.
  - **Created:** 2026-08-27 | **Last updated:** 2026-08-27
  - **Format:** `.ts`
  - **Notes:** Enforced on both the client and server; focused tests cover accepted and rejected file types.
  ```
- **Reason:** Keep the attachment feature discoverable for future security, product, and UI work.
- **Source task:** Current supersec attachment-improvement task.
- **Follow-up:** Apply after ART-01 creates the artifact registry.
- **Status:** applied

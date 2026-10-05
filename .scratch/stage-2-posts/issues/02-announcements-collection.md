# 02: Announcements Collection & Schema

**What to build:** Payload collection `announcements` configured in `src/collections/Announcements.ts` and registered in `src/payload.config.ts` with `{ drafts: true }`, fields matching `docs/SCHEMA.md`, and unit smoke tests.

**Blocked by:** 01: Domain Seam (Slugs, Pins & Lifecycle Rules)

**Status:** closed

- [x] `Announcements` collection includes `title`, `slug`, Lexical `body`, `image` upload, `priority` (boolean), `pinnedUntil` (date string), `publishedAt` (date), `changeNote` (text), `archivedAt` (date), and `subjects` relationship.
- [x] Collection config enables `{ drafts: true, maxPerDoc: 0 }`.
- [x] Registered in `src/payload.config.ts`.
- [x] Collection validation smoke test passes in isolated memory.

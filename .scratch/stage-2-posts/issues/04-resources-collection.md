# 04: Resources Collection & Schema

**What to build:** Payload collection `resources` configured in `src/collections/Resources.ts` and registered in `src/payload.config.ts` with `{ drafts: true }`, external URL checking, and attachment references.

**Blocked by:** 01: Domain Seam (Slugs, Pins & Lifecycle Rules)

**Status:** closed

- [x] `Resources` collection includes `title`, `slug`, `url` (valid format), `category`, `attachments` (media upload reference, max 6), Lexical `body`, `publishedAt`, `changeNote`, `archivedAt`, and `subjects` relationship.
- [x] Collection config enables `{ drafts: true, maxPerDoc: 0 }`.
- [x] Registered in `src/payload.config.ts`.
- [x] Collection validation smoke test passes in isolated memory.

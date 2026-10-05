# 06: Questions (Q&A) Collection & Schema

**What to build:** Payload collection `questions` configured in `src/collections/Questions.ts` and registered in `src/payload.config.ts` with `{ drafts: true }`, official badge boolean, and tags array.

**Blocked by:** 01: Domain Seam (Slugs, Pins & Lifecycle Rules)

**Status:** closed

- [x] `Questions` collection includes `question` (text), `slug`, Lexical `answer`, `tags` (text array), `official` (boolean), `publishedAt`, `changeNote`, `archivedAt`, and `subjects` relationship.
- [x] Collection config enables `{ drafts: true, maxPerDoc: 0 }`.
- [x] Registered in `src/payload.config.ts`.
- [x] Collection validation smoke test passes in isolated memory.

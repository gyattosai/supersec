# 01: Domain Seam (Slugs, Pins & Lifecycle Rules)

**What to build:** Pure domain functions in `src/lib/posts/lifecycle.ts` for slug generation with collision-resistant entropy, pin evaluation against Manila calendar dates, and publish validation enforcing non-blank change notes.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] `slugifyPostTitle(title)` transforms text to lower-kebab format with 4 random alphanumeric characters appended.
- [x] `isAnnouncementPinned(pinnedUntil, todayDate)` returns true only when `pinnedUntil >= todayDate` (Manila timezone `Asia/Manila`).
- [x] `validatePublishInput({ changeNote, priority, pinnedUntil, todayDate })` rejects blank or whitespace-only change notes.
- [x] In-memory unit tests in `tests/unit/post-lifecycle.spec.ts` pass with 100% coverage without database.

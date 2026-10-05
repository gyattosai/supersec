# 08: Publish Action & Mandatory Change Note Modal

**What to build:** Secretary UI publish modal requiring a non-empty change note before publishing, and server endpoint `POST /api/posts/publish` creating an immutable version.

**Blocked by:** 02: Announcements Collection & Schema

**Status:** closed

- [x] Publish button opens confirmation modal asking for `changeNote`.
- [x] Enforces non-empty `changeNote` before submitting.
- [x] Server action updates post status to `published`, sets `publishedAt`, records `changeNote`, and bumps version.
- [x] Integration test verifies publish barrier prevents publishing without change note.

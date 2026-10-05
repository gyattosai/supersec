# 01: Gemini Client & AI Change-Note Generator

**What to build:** Server-side AI client with graceful fallback and an automated change-note generator that summarizes attendance deltas when republishing an edited session.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Gemini API client initializes with server-only key and falls back cleanly when key is absent.
- [x] Session republish barrier provides an on-demand "Suggest note with AI" button.
- [x] AI prompt receives only factual attendance deltas (e.g. absent to excused) and strictly excludes private notes, student IDs, or medical excuse texts.
- [x] Generated change note populates the editable note input for secretary review before publishing.
- [x] Unit tests for prompt sanitization, delta computation, and offline fallback.

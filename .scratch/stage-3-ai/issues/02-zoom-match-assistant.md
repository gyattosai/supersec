# 02: AI Zoom Log Participant Matcher

**What to build:** Natural-language Zoom chat and attendee list matcher matching pasted text against enrolled students, with a two-phase confirmation drawer.

**Blocked by:** 01: Gemini Client & AI Change-Note Generator

**Status:** ready-for-agent

- [ ] Implement `POST /api/ai/zoom-match` with structured schema output (`matched`, `ambiguous`, `unmatched`).
- [ ] Build `ZoomMatchDrawer` component for `/console/session/[id]`.
- [ ] Add "Import from Zoom" action to session runner header.
- [ ] Confirmation action feeding marked students directly into the single-flight `RollCallQueue`.
- [ ] Unit tests for Zoom log extraction, confidence matching, and empty/unmatched fallbacks.

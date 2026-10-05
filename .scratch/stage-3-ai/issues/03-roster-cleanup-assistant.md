# 03: AI Messy Roster Cleanup Assistant

**What to build:** Natural-language roster parser accepting messy copied student lists and outputting clean, properly capitalized, deduplicated student profiles.

**Blocked by:** 01: Gemini Client & AI Change-Note Generator

**Status:** ready-for-agent

- [ ] Implement `POST /api/ai/clean-roster` using Gemini structured output for `{ name, studentNumber? }`.
- [ ] Add AI Cleanup option to Roster Import UI in `/console/subjects/[id]`.
- [ ] Comparison table preview showing raw vs cleaned rows before database enrollment.
- [ ] Unit tests for honorific stripping, section prefix removal, and duplicate detection.

# 01: Gemini Client & AI Change-Note Generator

**What to build:** Install `@google/genai` SDK, configure server-side Gemini client seam with graceful fallback, and build `POST /api/ai/change-note` wired to the "✨ Suggest note" button in the Roll Call Publish Barrier Modal.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] Install `@google/genai` package.
- [ ] Create `src/lib/ai/gemini-client.ts` with model `gemini-3.5-flash-lite` and `isAiAvailable()` check.
- [ ] Implement `POST /api/ai/change-note` computing delta between previous version and draft, stripping private fields.
- [ ] Add "✨ Suggest with AI" button to `PublishModal` in `src/components/console/roll-call-runner.tsx`.
- [ ] Unit tests for change-note delta extraction, prompt sanitization, and fallback when API key is missing.

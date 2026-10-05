# ADR 0011: Stage 3 AI Assistance & Cloud Cron Architecture

## Status
Accepted

## Context
Stage 3 introduces AI assistance for class secretaries (change-note drafting, Zoom participant matching, roster cleaning) and automated cloud retention cron for dispute proofs. Per the Zero-Leak Privacy Guarantee (ADR 0002) and PRD-1 §3, AI calls must never expose sensitive internal notes or private student fields, must run entirely server-side, and must offer graceful manual fallbacks when offline or unconfigured.

## Decisions

1. **Model & SDK Selection**:
   - Official `@google/genai` TypeScript SDK (>= 2.3.0).
   - Fast, low-latency model tier: `gemini-3.5-flash-lite`.
   - Key storage: server-only `GEMINI_API_KEY`.
   - Fallback guarantee: if `GEMINI_API_KEY` is omitted, endpoints return clean `{ available: false }` status, enabling complete manual operation without errors.

2. **Server-Side AI Seams (`/api/ai/*`)**:
   - `POST /api/ai/change-note`: Accepts structured session delta `[{ studentName, oldStatus, newStatus, recitationsDelta }]`. Returns concise 1-sentence draft. Strictly excludes student IDs, photos, medical excuse reasons, and 🔒 internal notes.
   - `POST /api/ai/zoom-match`: Accepts raw Zoom log text and student roster `[{ id, name }]`. Gemini extracts attendee identities and fuzzy-matches against the roster. Returns high-confidence matches, ambiguous candidates, and unrecognized lines.
   - `POST /api/ai/clean-roster`: Accepts messy multi-line raw text. Normalizes names into proper case, strips honorifics and section markers, and flags duplicates.

3. **Human-in-the-Loop Confirmation**:
   - AI outputs are strictly suggestions and never auto-commit.
   - Change-note fills an editable text field.
   - Zoom match results open an interactive review checklist before marks are applied to the roll call queue.

4. **Retention Cron (`POST /api/cron/cleanup`)**:
   - Protected by `Authorization: Bearer <CRON_SECRET>`.
   - Rule R4 execution: deletes dispute proofs older than 30 days and transitions pending requests older than 30 days to `expired`.
   - Scheduled via Appwrite Scheduled Function daily at 00:00 UTC (08:00 Manila).

## Consequences
- AI assistance is non-blocking, privacy-preserving, and cheap.
- Offline and local development remain 100% operational without live AI or cloud dependencies.
- Zero private data is leaked to external LLM providers.

# Spec: Stage 3 — AI Assistance (Gemini Flash-Lite) & Cloud Automation

## Problem Statement

Class secretaries face high cognitive load and manual friction during high-frequency routine administrative tasks:
1. **Change-note friction**: When republishing an edited session, secretaries must manually type out an explanatory change note summarizing who was marked Excused, Absent, or credited with recitations. This often leads to vague notes like "updated attendance" or skipped details.
2. **Online class Zoom logs**: In remote lectures, extracting attendance from raw Zoom chat logs ("From Juan D. Cruz to Everyone: present") or exported participant lists requires tedious manual matching, especially with nicknames, pronouns, and typos.
3. **Messy roster intake**: Class rosters pasted from spreadsheets or chat apps arrive with inconsistent casing, section prefixes, honorifics, and irregular formatting that take significant time to clean up.
4. **Retention compliance liability**: Under Rule R4, uploaded medical excuses, receipts, and dispute proofs must be deleted after 30 days to protect student data privacy, and stale requests must be expired. Doing this manually is error-prone and easy to forget.

## Solution

A privacy-preserving AI assistance suite and cloud retention automation layer:
1. **On-demand AI Change-Note Generator**: When republishing an edited session, a single tap on "✨ Suggest note" analyzes the factual delta between versions and drafts a concise, professional summary note without leaking student IDs or private notes to the model.
2. **Interactive Zoom Log Matcher**: Secretaries paste raw Zoom chat or attendee text into a drawer. An AI model parses names and matches them against enrolled classmates, presenting a two-phase confirmation screen categorized into High Confidence, Ambiguous, and Unrecognized names before any marks are committed to the roll call queue.
3. **AI Roster Cleaning Assistant**: Messy multi-line text is parsed into clean, properly capitalized student names with optional student numbers, stripping junk prefixes and flagging near-duplicates for review.
4. **Automated Proof Retention Cron**: A secure, authenticated background endpoint automatically deletes dispute proof uploads older than 30 days and transitions pending requests older than 30 days to expired status.

## User Stories

1. As a class secretary, I want the publish modal to offer an AI change-note suggestion button, so that I don't have to manually summarize every attendance adjustment when republishing a session.
2. As a class secretary, I want the AI change-note generator to inspect only the delta between the previous published session and current draft, so that the note accurately reflects what changed.
3. As a class secretary, I want to review and freely edit the AI-suggested change note before publishing, so that I maintain complete authority over the published record.
4. As a student, I want my private medical excuse details and internal notes to be excluded from any AI prompts, so that my personal privacy is strictly preserved.
5. As a class secretary, I want the application to work seamlessly without AI if the Gemini API key is missing or invalid, so that missing credentials never block class roll calls.
6. As a class secretary, I want to paste raw Zoom chat logs into a modal drawer, so that I can quickly extract attendance from online lectures without typing each name manually.
7. As a class secretary, I want the Zoom matcher to categorize parsed attendees into high-confidence matches, ambiguous candidates, and unrecognized lines, so that I can resolve edge cases before applying marks.
8. As a class secretary, I want confirmed Zoom attendees to be automatically marked as Present through the optimistic roll call queue, so that live roll call updates remain fast and idempotent.
9. As a class secretary, I want to paste messy student rosters with honorifics, section prefixes, and irregular capitalization, so that I can import clean student records in bulk.
10. As a class secretary, I want to review a comparison table of raw versus cleaned student records before enrolling them, so that I can catch potential misparses early.
11. As a student, I want any uploaded dispute proofs to be permanently purged from cloud storage after 30 days, so that sensitive photos and documents do not linger indefinitely.
12. As a class secretary, I want pending dispute requests that have been inactive for over 30 days to automatically transition to expired, so that the pending queue does not accumulate stale items.
13. As a system administrator, I want the retention cleanup endpoint to reject unauthorized requests without the correct secret token, so that external actors cannot trigger storage deletions.
14. As a class secretary, I want clear feedback when the AI service encounters a network error or rate limit, so that I know to continue manually without the app hanging.

## Implementation Decisions

1. **Model & SDK Selection**:
   - Model tier: `gemini-3.5-flash-lite` selected for ultra-fast response times and cost efficiency.
   - Official `@google/genai` TypeScript SDK used for all Gemini API interactions.
   - Server-only execution: all AI calls run in Next.js server route handlers; the client never exposes API keys or makes direct external LLM calls.
   - Graceful fallback: when the API key is absent, endpoints return an availability flag allowing the UI to disable AI buttons and rely on manual inputs.

2. **Change-Note Service Contract**:
   - Endpoint: `POST /api/ai/change-note`
   - Input contract: structured array of deltas containing student display names and status changes (e.g. from Absent to Excused, or recitation increments).
   - Strict omission: Student database IDs, excuse explanations, proof URLs, and internal notes are omitted from the prompt payload.
   - Output contract: JSON response containing a single concise, factual summary string.

3. **Zoom Log Matcher Contract**:
   - Endpoint: `POST /api/ai/zoom-match`
   - Input contract: raw text payload and an array of enrolled student objects containing their database IDs and full names.
   - Prompt design: extracts participant names and executes fuzzy reconciliation against the provided roster.
   - Output contract: structured JSON categorizing results into `matched` (with student ID and confidence), `ambiguous` (with candidate student IDs), and `unmatched` (raw strings).
   - UI interaction: Slide-up drawer on the live roll call screen with checkboxes for pre-selected attendees. Tapping "Apply" pushes updates into the existing single-flight roll call queue.

4. **Roster Normalizer Contract**:
   - Endpoint: `POST /api/ai/clean-roster`
   - Input contract: raw multi-line string.
   - Output contract: array of normalized student objects with trimmed, title-cased names and optional extracted student numbers.

5. **Retention Cleanup Cron Contract**:
   - Endpoint: `POST /api/cron/cleanup`
   - Security: requires `Authorization: Bearer <CRON_SECRET>` matching the server configuration.
   - Behavior: queries requests created over 30 days ago with uploaded proof files, deletes the associated files from cloud storage, and marks unreviewed requests as expired.

## Testing Decisions

1. **Behavior-Focused Testing**:
   - Tests assert on external behaviors: input payload processing, returned JSON structures, privacy filtering, and error handling.
   - No mock testing of internal LLM neuron weights; test suites use mocked Gemini SDK client responses to ensure deterministic, fast execution.
2. **Database-Isolated Execution**:
   - All unit tests run in memory without requiring a live MongoDB Atlas connection or live Gemini API keys.
3. **Modules Tested**:
   - AI delta calculator: verifies that differences between session versions are accurately computed and that private fields are stripped before prompt construction.
   - Fallback handlers: tests that endpoints return graceful fallback structures when `GEMINI_API_KEY` is omitted or when the upstream API returns an error.
   - Zoom match parser: tests parsing of synthetic Zoom logs with timestamps, chat chatter, and edge cases.
   - Retention calculator: tests 30-day temporal thresholds and authorization header checks.
4. **Prior Art**:
   - Follows the existing unit test patterns established in `tests/unit/publish-barrier.spec.ts` and `tests/unit/retention-purge.spec.ts`.

## Out of Scope

- Client-side direct LLM API calls.
- Automated publishing without human confirmation.
- OCR text extraction from dispute proof images.
- Automatic push notifications.
- Multi-model switching or custom model fine-tuning.

## Further Notes

- The Appwrite Scheduled Function can invoke `/api/cron/cleanup` once daily using standard HTTP triggers.
- In local development, the cron endpoint can be verified via curl or automated Vitest suites using the test secret.

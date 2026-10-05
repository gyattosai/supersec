# 06: Classmate Public Portal & Dispute Sheet (`/s/[slug]`)

**What to build:** Unlisted, read-only classmate subject page displaying class schedule, held session attendance totals, and an accessible slide-up bottom sheet dispute drawer submitting to `/api/requests/submit`.

**Blocked by:** 01: Mobile UI Primitives & Linear Tokens

**Status:** done

- [x] Lightweight Server Component at `/s/[slug]` rendering compile-time allowlisted fields (`PUBLIC_SUBJECT_FIELDS`).
- [x] Published sessions list displaying attendance marks and recitations without leaking private student notes.
- [x] Slide-up Bottom Sheet dispute drawer with tabs: "I was present", "Excuse" (with reason & photo upload), "I recited" (with delta).
- [x] In-DB rate limiting feedback (429 feedback when exceeding 5 requests in 10 minutes) and honeypot protection.
- [x] Unit tests for public field projection safety and dispute form submission.

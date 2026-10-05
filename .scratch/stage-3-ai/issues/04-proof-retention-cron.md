# 04: 30-Day Proof Retention Cleanup Cron

**What to build:** Authenticated background retention cron endpoint that permanently purges student dispute proofs older than 30 days and marks stale requests as expired per Rule R4.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Retention endpoint requires a secure Bearer token matching the configured cron secret.
- [x] Deletes uploaded dispute files older than 30 days from cloud storage.
- [x] Automatically transitions pending requests older than 30 days to expired status.
- [x] Rejects unauthorized or missing token requests with 401 Unauthorized.
- [x] Unit tests for 30-day temporal calculation, authorization checks, and idempotent repeated runs.

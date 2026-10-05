# 04: 30-Day Proof Retention Cleanup Cron

**What to build:** Authenticated endpoint `POST /api/cron/cleanup` enforcing Rule R4 (purging dispute proofs after 30 days and expiring old requests) with Appwrite Function documentation.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] Route handler `POST /api/cron/cleanup` requiring `Authorization: Bearer <CRON_SECRET>`.
- [ ] Query and delete expired dispute files from Appwrite Storage bucket `proofs`.
- [ ] Transition pending requests older than 30 days to `status: 'expired'`.
- [ ] Unit tests for 30-day date calculation, authentication verification, and idempotent runs.

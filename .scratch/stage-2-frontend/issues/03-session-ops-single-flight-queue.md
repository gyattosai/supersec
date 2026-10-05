# 03: Session Ops Route & Single-Flight Queue Engine

**What to build:** High-speed client-side roll call queue manager and atomic batch operations API endpoint `/api/sessions/[id]/ops` supporting offline queue buffering in localStorage.

**Blocked by:** 02: Secretary Shell & Auth

**Status:** done

- [x] Route handler `POST /api/sessions/[id]/ops` accepting batch mark arrays `[{ studentId, attendance?, recitationsDelta? }]`.
- [x] Client queue class `RollCallQueue` with single-flight execution, 100ms debouncing, and idempotency keying.
- [x] Offline fallback: save unsynced queue to `localStorage` and trigger auto-replay on reconnect.
- [x] Unit tests for queue debouncing, single-flight locking, and offline queue persistence.

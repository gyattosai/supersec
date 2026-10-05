# 03: Session Ops Route & Single-Flight Queue Engine

**What to build:** The batch mutation API endpoint `/api/sessions/[id]/ops` and client-side single-flight FIFO queue engine with localStorage fallback, enabling optimistic 0ms UI taps and offline replay during classroom roll calls.

**Blocked by:** 01: Mobile UI Primitives & Linear Tokens

**Status:** ready-for-agent

- [ ] Next.js route handler `POST /api/sessions/[id]/ops` executing authenticated batch attendance and recitation mutations with idempotency deduplication.
- [ ] Client single-flight queue manager processing roll call actions sequentially without overlapping requests.
- [ ] Local storage backup buffer surviving browser refreshes and offline connectivity drops.
- [ ] Automatic queue flush upon `window.addEventListener('online')` and 401 pause-for-reauth handler.
- [ ] Unit tests covering queue FIFO ordering, idempotency deduplication, offline buffer reload, and batch ops execution.

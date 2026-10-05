# 02: Secretary Console Shell & Authentication Guard

**What to build:** Dedicated secretary app shell (`/console/*`) with login screen (`/console/login`), persistent mobile bottom tab bar (Dashboard, Subjects, Requests, Settings), and server-side layout guard redirecting unauthenticated users to login.

**Blocked by:** 01: Mobile UI Primitives & Linear Tokens

**Status:** ready-for-agent

- [ ] Secretary login page at `/console/login` with email and password fields authenticating against Payload's Users collection.
- [ ] Server-side layout authentication guard checking `payload-token` cookie, redirecting unauthenticated visits to `/console/login?redirect=...`.
- [ ] Mobile bottom tab bar anchored to the viewport with active states, icons, and 44px touch targets.
- [ ] Sticky header displaying current active term, secretary email indicator, and quick logout action.
- [ ] Unit tests verifying auth redirect behavior and tab navigation rendering.

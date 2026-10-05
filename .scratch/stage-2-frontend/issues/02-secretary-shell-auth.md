# 02: Secretary Console Shell & Auth Guard (`/console/*`)

**What to build:** Phone-first shell with sticky bottom navigation (Today, Subjects, Requests, Settings), persistent user context, and automatic redirect to `/console/login` if unauthenticated.

**Blocked by:** 01: Mobile UI Primitives & Linear Tokens

**Status:** done

- [x] Dedicated layout under `src/app/(frontend)/console/(app)/layout.tsx` with mobile viewport configuration.
- [x] Auth guard checking Payload JWT cookie and redirecting unauthenticated requests to `/console/login`.
- [x] Sticky bottom navigation bar with icons and active state indicators.
- [x] Header bar displaying active term indicator, current Manila time, and connection state.
- [x] Unit test verifying auth guard redirect and bottom navigation tab rendering.

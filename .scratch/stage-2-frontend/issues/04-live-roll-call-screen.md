# 04: Live Roll Call & Publish Barrier Screen

**What to build:** High-velocity live roll call screen (`/console/session/[id]`) with rapid single-tap attendance cycling (`P` -> `A` -> `E` -> `–`), +1/-1 recitation buttons, 1-tap "Mark all Present" button, and Rule R1 publish barrier modal enforcing mandatory change notes.

**Blocked by:** 02: Secretary Console Shell & Authentication Guard, 03: Session Ops Route & Single-Flight Queue Engine

**Status:** ready-for-agent

- [ ] Roll call student row list with sticky header, search filter, and "recited today" filter.
- [ ] Single-tap attendance toggles with immediate optimistic UI feedback and single-flight queue dispatch.
- [ ] Recitation counter controls (+1 / -1) with optional topic tag input.
- [ ] "Mark all Present" button filling only Not Set rows without overwriting pre-marked absences or excuses (Rule R1).
- [ ] Publish barrier modal blocking publish if any active enrolled student remains Not Set (Rule R1) and requiring non-empty changeNote.
- [ ] Unit tests for roll call student row rendering, Mark All Present action, and publish barrier validation.

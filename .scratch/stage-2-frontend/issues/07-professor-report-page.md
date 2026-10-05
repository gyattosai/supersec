# 07: Professor Report Page (`/prof/[token]`)

**What to build:** Secret, tokenized professor report screen displaying student attendance percentages, absence warning flags, consecutive absence streaks, and transparent revocation feedback if an old link is accessed.

**Blocked by:** 01: Mobile UI Primitives & Linear Tokens

**Status:** ready-for-agent

- [ ] Route `/prof/[token]` projecting attendance summary from `getProfessorReport`.
- [ ] Computed stats columns: Held Sessions, Present, Absent, Excused, Attendance %, Recitations, Warning Flags, and Streaks.
- [ ] Date range filter inputs (From Date / To Date) with instant recalculation.
- [ ] Transparent "This report link has been revoked or expired" state banner with timestamp when `status === 'revoked'`.
- [ ] Export to CSV download action.
- [ ] Unit tests for professor report rendering, revoked banner display, and zero private fields leakage.

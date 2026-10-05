# 10: One-Tap Global "No Class for all" Shortcut

**What to build:** A modal action shortcut on the Console Dashboard (`/console/dashboard`) that allows the secretary to mark a school-wide or weather-related suspension across all active subjects in a single tap:
1. Opens from a "No Class for all" button on the Dashboard.
2. Prompts the secretary to confirm the calendar date (defaults to today) and enter/select a reason (e.g. "Suspension: Typhoon", "Administrative Holiday").
3. Atomically creates a published session with `kind: 'noClass'` for every active subject scheduled on that date.
4. Updates public subject pages to display the cancellation notice and excludes the date from attendance statistics.

**Blocked by:** 01 (Subject Home Shell & Quick Actions Header).

**Status:** ready-for-agent

- [ ] "No Class for all" button appears prominently on the Console Dashboard.
- [ ] Modal allows the secretary to select a date and suspension reason.
- [ ] Confirming the action creates published `noClass` sessions across all active subjects for that day in a single batch.
- [ ] Public subject pages reflect the cancellation banner immediately.
- [ ] The cancelled date is excluded from held sessions and absentee counts.

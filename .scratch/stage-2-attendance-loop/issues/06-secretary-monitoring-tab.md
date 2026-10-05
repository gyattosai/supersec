# 06: Secretary Monitoring Tab (`/console/subjects/[id]`)

**What to build:** The Monitoring Tab within the Subject Home (`/console/subjects/[id]`), providing the secretary with an instant, visual diagnostic of student absenteeism:
1. **5 Summary Metric Cards**:
   - Class sessions held
   - Students on active roster
   - No attendance count (0 sessions attended)
   - Attended 1 to 4 sessions / Below 50% count
   - Total students flagged
2. **Flagged Students Table**:
   - Sorted lowest attendance first.
   - Columns: Student Name, Attended fraction (e.g. `2/10`), Absences count, Attendance Rate %, Category badge (`No Attendance` [red], `Below 50%` [orange]), and Streak indicator.

**Blocked by:** 01 (Subject Home Shell & Quick Actions Header), 05 (Pure Absentee Monitoring Engine & Streak Rules).

**Status:** ready-for-agent

- [ ] Monitoring Tab displays the 5 summary metric cards computed dynamically from subject session records.
- [ ] Flagged students table ranks students with lowest attendance first.
- [ ] Category badges accurately show `No Attendance` and `Below 50%`.
- [ ] Students on consecutive absence streaks display the streak warning badge.
- [ ] Clicking on a student opens their enrollment details.

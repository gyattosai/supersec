# 05: Pure Absentee Monitoring Engine & Streak Rules

**What to build:** A pure, database-isolated calculation module (`src/lib/stats/absentee-monitoring.ts`) implementing the official formulas and rules from the verified Low / No Attendance Report:
1. `Present*` includes both `E` (Excused) and `C` (Conflict), counting both as present towards the attendance rate.
2. Sessions occurring before a student was enrolled are marked `—` (dash) and excluded from the denominator.
3. No Class sessions are excluded from calculations.
4. Identifies threshold categories:
   - `No Attendance`: 0 sessions attended across held sessions.
   - `Below 50%`: attendance rate $< 50\%$.
   - `Watch`: unexcused absences $\ge 50\%$ of absence limit.
   - `At Risk`: unexcused absences $\ge 75\%$ of absence limit.
   - `Exceeded`: unexcused absences $\ge 100\%$ of absence limit.
   - `Streak`: $\ge 3$ consecutive unexcused absences, where Excused sessions neither break nor extend the streak (Rule R2).

**Blocked by:** None (can start immediately as a pure functional module).

**Status:** ready-for-agent

- [ ] Unit tests pass for edge cases (0 sessions held, 100% attendance, dropped mid-term).
- [ ] Excused days inside an absence streak neither break nor extend the streak (Rule R2).
- [ ] Students with Schedule Conflict (`C`) and Excused (`E`) are counted as present in the attendance rate.
- [ ] Pre-enrollment sessions (`—`) and No Class days do not penalize attendance percentage.
- [ ] Categorizes students accurately into `No Attendance`, `Below 50%`, `Watch`, `At Risk`, and `Exceeded`.

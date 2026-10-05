# 08: Professor Low/No Attendance Report Page & Print/CSV Export (`/prof/[token]`)

**What to build:** The complete, unlisted `/prof/[token]` projection replicating the verified 3-page **Low / No Attendance Report: Prelims** from the official primary source:
1. **Header Block**: Title, Subject code, Subject name, Section mark, Professor name ("TO: Sir [Prof]"), Secretary ("PREPARED BY: [Secretary], Class Secretary"), Coverage period, Term name, and Date Prepared.
2. **5 Top Metric Cards**: Class sessions held, Active roster count, No attendance (0 sessions), Below 50% attendance, Total flagged students.
3. **Basis Clarification Note**: Explaining that Excused (`E`) and Conflict (`C`) count as present, pre-enrollment sessions (`—`) and No Class days are excluded, and low attendance is flagged under 50%.
4. **Flagged Students Matrix Table (Lowest attendance first)**: Columns for `#`, `Student` (Last name, First name), Date columns for every held session with color-coded marks (`P`, `A` [red], `E` [blue], `C` [purple], `—`), `Attended`, `Absences`, `Rate`, `Category`, and `Remarks`.
5. **Session Summary Table**: Breakdown of each held session with date, published sheet title, roster count, present, excused, conflict, absent, and attendance rate %.
6. **Formal Signatures Block**: Secretary (`Prepared by`) and Professor (`Noted by`).
7. **Print-to-PDF & CSV Export**: `@media print` A4 pagination with running header and `Page X of Y` footer, plus a CSV download button.
8. **Privacy Guarantee**: Verified via automated harness tests that strictly zero 🔒 private notes or excuses are exposed.

**Blocked by:** 05 (Pure Absentee Monitoring Engine & Streak Rules), 07 (Professor Report Token Management).

**Status:** ready-for-agent

- [ ] `/prof/[token]` renders without requiring authentication.
- [ ] Displays all 5 summary metric cards, the basis note, the flagged students matrix, and the session summary table.
- [ ] Date matrix columns accurately reflect student marks (`P`, `A`, `E`, `C`, `—`).
- [ ] `@media print` stylesheet prints cleanly to PDF with running headers and footers.
- [ ] CSV export button downloads identical columnar figures for spreadsheet grading.
- [ ] Automated privacy harness test verifies no 🔒 fields leak into HTML or API responses.

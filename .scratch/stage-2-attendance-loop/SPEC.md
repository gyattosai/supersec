# Stage 2: Core Attendance Feedback Loop & Secretary Navigation Spec

## Problem Statement

Following the initial data migration, the secretary can view high-level subjects on the Dashboard and run roll call sessions. However, the operational lifecycle of running classes is broken because of missing navigational containers and feedback loops:

1. **Missing Operational Hub**: The secretary has no **Subject Home** (`/console/subjects/[id]`) to view past sessions, review enrolled students, manage requests, inspect absentee warnings, or export reports for a specific subject.
2. **Missing Dispute Mechanism**: When a class session is published to `/s/[slug]`, classmates viewing the page have no way to report an attendance error, submit medical excuse proofs, or claim recitation points ("Something wrong?").
3. **No Secretary Request Review Queue**: Submissions cannot be reviewed, approved, or declined by the secretary, preventing session adjustments and recitation accumulations.
4. **Disconnected Absentee Monitoring & Reports**: Professor reports (`/prof/[token]`) require the official absentee monitoring flags (**Watch**, **At Risk**, **Exceeded**, **Streak**), but these flags lack a pure, machine-tested calculation engine and dedicated monitoring view.
5. **Dashboard Blind Spots**: On non-class days (e.g. Mondays), the dashboard provides no global overview of pending requests, students at risk of dropping, or one-tap class cancellation for suspensions.

## Solution

Build the complete, dependency-driven **Attendance Feedback Loop & Secretary Hub** (Steps 2.A through 2.D of PRD-1):

1. **Subject Home (`/console/subjects/[id]`)**: The central operational container for an individual subject, featuring quick action buttons (Start Class Session, Mark No Class, Copy Public Link) and 5 primary tabs: **Sessions**, **Roster**, **Requests**, **Monitoring**, and **Reports**.
2. **Classmate Requests System**:
   - A frictionless mobile "Something wrong?" sheet on public session pages (`/s/[slug]/sessions/[date]`), validating and submitting requests without login.
   - An in-console review queue (both inside Subject Home and globally at `/console/requests`) with one-tap Approve / Decline actions enforcing rules R3 and R5.
3. **Absentee Monitoring Engine & Professor Reports**:
   - A pure, database-isolated stats module calculating absence percentages, held sessions, and monitoring thresholds (Watch at 50%, At Risk at 75%, Exceeded at 100%, and Streak skipping Excused days per R2).
   - A Secretary Monitoring tab displaying flagged students.
   - A secure, unlisted `/prof/[token]` report view with printable PDF layout and CSV export, strictly respecting the report allowlist.
4. **Console Dashboard Polish**:
   - Global command metrics: Pending Requests count badge, At-Risk / Exceeded count badge, and a global "No Class for all" cancellation shortcut.

## User Stories

1. As a Secretary, I want to tap on any subject from the Dashboard to open its dedicated Subject Home, so that I can manage all operations for that subject in one place.
2. As a Secretary, I want to see the next upcoming class schedule and meeting time at the top of the Subject Home, so that I immediately know when the next session is scheduled.
3. As a Secretary, I want a "Start Class Session" shortcut button on the Subject Home, so that I can begin roll call immediately without searching through a menu.
4. As a Secretary, I want a "Mark No Class" shortcut on the Subject Home, so that I can quickly record a holiday or suspension for that subject.
5. As a Secretary, I want a "Copy Public Link" button on the Subject Home, so that I can copy the unlisted `/s/[slug]` URL and share it to our Messenger group chat.
6. As a Secretary, I want a Sessions tab in the Subject Home displaying all past, live, and upcoming class sessions, so that I can review session statuses and change history.
7. As a Secretary, I want a Roster tab in the Subject Home showing all enrolled students, their section, student number, and schedule conflict badge, so that I can verify cohort enrollment.
8. As a Secretary, I want a Requests tab in the Subject Home filtered to that subject's pending submissions, so that I can address student disputes in the context of the course.
9. As a Secretary, I want a Monitoring tab in the Subject Home showing students grouped by absentee warning flags, so that I can track who is nearing the absence limit.
10. As a Secretary, I want a Reports tab in the Subject Home with a generated secret report link, so that I can share verified attendance summaries with the professor.
11. As a Classmate, I want to open a published session page at `/s/[slug]/sessions/[date]` and see a "Something wrong?" button, so that I can submit an attendance correction.
12. As a Classmate, I want to tap "Something wrong?" and select between "I was present", "Excuse", and "I recited", so that my request accurately describes the correction.
13. As a Classmate, I want to select my name from an autocomplete list of enrolled students, so that I don't have to manually type my full student details.
14. As a Classmate, I want to upload an image proof (medical certificate or excuse letter) when requesting an excuse, so that the secretary can verify my claim.
15. As a Classmate, I want image compression to happen automatically in my mobile browser before upload, so that my submission is fast and stays under 1 MB.
16. As a Classmate, I want to specify how many recitations I contributed when requesting "I recited", so that the secretary knows the exact delta to add.
17. As a Classmate, I want to see an immediate confirmation that my request has been sent to the secretary, so that I have peace of mind.
18. As a Secretary, I want to see an unread badge on the Dashboard and on the Subject Home showing how many requests are pending review, so that I never miss an unhandled submission.
19. As a Secretary, I want to open the Requests Queue and view the request details alongside any attached proof image, so that I can evaluate the request.
20. As a Secretary, I want to tap "Approve" on an excuse request to automatically switch the student's status on that session to Excused and create a new published session version, so that the public portal updates without manual re-entry.
21. As a Secretary, I want to tap "Approve" on an "I recited" request to add its delta directly to the student's recitation count without overwriting in-class marks (R5), so that classroom contributions are preserved.
22. As a Secretary, I want the system to block approval with an alert if the session has unpublished draft edits (R3), so that draft edits are not accidentally overwritten or lost.
23. As a Secretary, I want to tap "Decline" on a request with an optional note, so that unfounded requests are dismissed without altering session records.
24. As a Secretary, I want proof images and pending requests to automatically expire and be deleted after 30 days (R4), so that storage is clean and privacy is maintained.
25. As a Secretary, I want an automated calculation engine that identifies students with 3 consecutive unexcused absences as a "Streak", while properly skipping Excused days (R2), so that streaks reflect true absenteeism.
26. As a Secretary, I want to see students flagged with "Watch" at 50% limit, "At Risk" at 75% limit, and "Exceeded" at 100% limit, so that I can intervene before a student is dropped.
27. As a Professor, I want to open `/prof/[token]` without creating an account or logging in, so that I can access attendance summaries friction-free.
28. As a Professor, I want to see the Flagged Students table at the top of my report, so that I immediately know which students have excessive absences.
29. As a Professor, I want a clean Print / PDF view stamped with the generation date and version, so that I can submit physical copies to the academic dean.
30. As a Professor, I want a CSV export button, so that I can download raw attendance figures into my faculty grading sheet.
31. As a Secretary, I want a "Reset Link" button for any professor report token, so that I can immediately revoke a compromised or outdated link.
32. As a Secretary, I want a "No Class for all today" shortcut on the Dashboard, so that I can mark typhoon or school-wide suspensions across all 3 subjects in a single tap.

## Implementation Decisions

### Modules & UI Architecture

1. **Subject Home Page (`src/app/(frontend)/console/(app)/subjects/[id]/page.tsx`)**:
   - Server Component querying the Subject document, its enrolled active students, sessions list, and pending requests count.
   - Delegates rendering to `<SubjectHomeView />` client component with an Action Bar and tabbed panels.
2. **Subject Home View Component (`src/components/console/subject-home-view.tsx`)**:
   - Top action bar: Subject Code, Name, Section mark, Professor name, Next Class badge, "Start Session", "Mark No Class", and "Copy Public Link".
   - 5 Tabs:
     - `SessionsTab`: List of sessions sorted by date descending, showing Kind badges (Class, No Class), published version tag, and direct "Open Session" links.
     - `RosterTab`: Table of enrolled students with search, student number (📋), schedule conflict indicator, and quick link to student details.
     - `RequestsTab`: Subject-specific pending and past requests with proof preview and approve/decline buttons.
     - `MonitoringTab`: Cards grouping students by warning flag (`Exceeded`, `At Risk`, `Watch`, `Streak`), showing absence count vs subject absence limit.
     - `ReportsTab`: Active professor report tokens, "Copy Report Link", "Reset Token", and "Preview Report" button.
3. **Public Request Submission Sheet (`src/components/public/request-submission-sheet.tsx`)**:
   - Bottom sheet component rendered on the public session page (`/s/[slug]`).
   - Triggered by "Something wrong?" button.
   - Form fields: Request Type picker (`present`, `excuse`, `recitation`), Student picker (filtered to enrolled roster), Delta input (for recitation), and Proof Image uploader with client-side WebP compression.
   - Submits to `POST /api/requests/submit`.
4. **Classmate Requests API (`src/app/api/requests/submit/route.ts` & collection hooks)**:
   - Validates session is published and student is enrolled.
   - Enforces limit of 1 pending request per student per session per type.
   - Honeypot anti-spam verification.
   - Stores request in `requests` collection with initial status `pending`.
5. **Secretary Request Review API (`src/app/api/requests/[id]/review/route.ts`)**:
   - Authenticated secretary-only route.
   - Enforces rule R3: Rejects approval if target session has draft/unpublished edits.
   - Enforces rule R5: For "I recited" approval, increments `recitations` count by request delta.
   - For excuse approval, sets student entry status to `excused`.
   - Creates a new published version of the session with an automated audit change note.
6. **Absentee Monitoring Engine (`src/lib/stats/absentee-monitoring.ts`)**:
   - Pure function module `computeSubjectAbsences(enrollments, sessions, absenceLimit)`.
   - Counts held sessions between enrollment date and drop date.
   - Calculates unexcused absences (`absent` marks, ignoring `excused` and `conflict`).
   - Detects streaks: $\ge 3$ consecutive unexcused absences, where `excused` days are skipped without breaking or extending the streak (Rule R2).
   - Evaluates warning thresholds:
     - `Exceeded`: absences $\ge$ limit
     - `At Risk`: absences $\ge 0.75 \times$ limit
     - `Watch`: absences $\ge 0.50 \times$ limit
     - `No Attendance`: held sessions $> 0$ and presents $= 0$.
7. **Professor Report Engine & Print Layout (`src/app/(frontend)/prof/[token]/page.tsx`)**:
   - Matches the official verified 3-page **Low / No Attendance Report** specification:
     - **Header Block**: Report title, Subject code, Subject name, Section mark, Professor name ("TO: Sir [Prof]"), Secretary ("PREPARED BY: [Secretary], Class Secretary"), Coverage period, Term name, and Date Prepared.
     - **Top Metrics Row (4-up Cards)**:
       1. `[N]` Class sessions held
       2. `[N]` Students on active roster
       3. `[N]` No attendance (0 sessions attended)
       4. `[N]` Attended 1 to 4 sessions (or below 50%)
       5. `[N]` Students flagged in total
     - **Basis Clarification Note**: Formal explanation stating: *"Basis. Students with Excused or Conflict status are counted as present. Conflict refers to students with a conflict of schedules (class overlaps). A student is flagged when attendance is below 50% of held sessions. Sessions before a student was enrolled are marked '—' and not counted against them. No Class sessions are excluded."*
     - **Flagged Students Matrix Table (Lowest attendance first)**:
       - Columns: `#`, `Student` (Last name, First name), Date columns for every held session (e.g. `Aug 18`, `Aug 25`), `Attended` (fraction, e.g. `2/10`), `Absences` count, `Rate` (percentage), `Category` badge (`No Attendance` [red] or `Below 50%` [orange]), and `Remarks`.
       - Status marks inside grid: `P` (Present), `A` (Absent, red highlight), `E` (Excused, blue), `C` (Conflict, purple), `—` (Not on roster / enrolled after session).
     - **Session Summary Table**:
       - Columns: `Date`, `Published attendance sheet` (e.g. `[OLCBSTM01] Attendance Aug 18 - v1`), `On roster`, `Present*`, `of which Excused`, `of which Conflict`, `Absent`, `Attendance %`.
     - **Formal Signatures Block**:
       - `[Secretary Name]` / `Class Secretary, [Section] · Prepared by`
       - `[Professor Name]` / `Professor, [Subject] · Noted by`
     - **Print-to-PDF & CSV Export**:
       - Optimized `@media print` layout: exact A4 / Letter pagination with running header and `Page X of Y` footer.
       - CSV export button downloading identical columnar figures for spreadsheet grading.
     - **Token Security**: Validates against `reportLinks` collection; includes "Reset Link" capability for the secretary. Strictly respects `reportFields` allowlist (zero leak of private secretary notes).
8. **Dashboard Enhancements (`src/components/console/dashboard-view.tsx`)**:
   - Displays real-time badge counts: Pending Requests counter and Flagged Students counter.
   - Adds "No Class for all today" shortcut modal to trigger school-wide suspensions across all active subjects with one tap.

## Testing Decisions

1. **What Makes a Good Test**:
   - Only test external behavioral contracts, data transforms, and access boundaries.
   - Tests run in-memory without requiring live database connections or network services.
   - Deterministic and fast (<50ms per test file).
2. **Modules to Test**:
   - `tests/unit/absentee-monitoring.spec.ts`: Pure unit tests validating calculation of Watch, At Risk, Exceeded, No Attendance, and Streaks across edge cases (0 sessions, 100% attendance, excused days inside streaks, dropped students).
   - `tests/unit/requests-workflow.spec.ts`: Unit tests validating request submission validation, 1-pending-per-student limit, honeypot rejection, R3 unpublished-edit blocking, and R5 recitation delta accumulation.
   - `tests/unit/subject-home-projections.spec.ts`: Unit tests validating Subject Home view models, next class schedule computation, and session list sorting.
   - `tests/unit/professor-report-privacy.spec.ts`: Automated privacy harness tests verifying that `/prof/[token]` outputs include 📋 fields but strictly zero 🔒 fields (such as internal notes or detailed excuse text).
3. **Prior Art**:
   - Mirrors existing test patterns in `tests/unit/sessions.spec.ts`, `tests/unit/professor-projections.spec.ts`, and `tests/unit/cleanup-route.spec.ts`.

## Out of Scope

- Stage 3 AI Zoom matcher and messy roster cleaner (already isolated under Stage 3).
- Announcements and Resources Lexical editor (deferred to Step 2.F per ADR-0012).
- Q&A public forum (deferred to Step 2.F).
- Full offline IndexedDB replay for requests (secretary review requires online connectivity).

## Further Notes

- All calendar dates are formatted as `YYYY-MM-DD` in `Asia/Manila`.
- Public request submission uses client-side image compression to keep proofs $\le 1$ MB and minimize bandwidth on mobile networks.

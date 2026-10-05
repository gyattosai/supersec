# 0012. Dependency-Driven Roadmap Realignment: Secretary Console Hub & Attendance Feedback Loop

## Context

In PRD-1, the original roadmap sequence scheduled auxiliary bulletin features (Announcements & Resources at Step 1.9, Q&A at Step 2.1) ahead of core attendance feedback mechanisms (Classmate Requests at Step 2.4, Professor Reports at Step 2.6, and Absentee Monitoring at Step 2.8). Furthermore, the Dashboard was deferred to Step 2.9, while Subject management was fragmented without a centralized Subject Home.

In real-world operation:
1. The secretary runs live class sessions (Tue/Fri) with real student rosters. Once a session publishes to `/s/[slug]`, classmates immediately require the "Something wrong?" request sheet to submit excuse proofs and recitation corrections. Deferring requests leaves published sessions error-prone.
2. Professor Reports (`/prof/[token]`) strictly require the Absentee Monitoring flags (Watch, At Risk, Exceeded, Streak) to render the official flagged absentee table. Building reports before monitoring calculations causes either throwaway mock data or broken reports.
3. Without a dedicated `Subject Home` (`/console/subjects/[id]`), the secretary lacks an operational container to review past sessions, student rosters, subject-specific requests, absentee standings, or report links.

## Decision

1. **Invert Build Sequence to Prioritize the Attendance Feedback Loop**:
   - Prioritize the core path: **Session Roll Call ➔ Classmate Requests ➔ Secretary Queue Review ➔ Absentee Monitoring ➔ Professor Reports**.
   - Defer secondary content (Announcements, Resources, Q&A) until the attendance ledger and reporting loop are fully closed.

2. **Anchor Navigation on Subject Home (`/console/subjects/[id]`)**:
   - Provide each subject with an operational hub featuring:
     - Top Action Bar: Next class schedule badge, Start Session button, Mark No Class button, Copy Public Link shortcut.
     - Dedicated Tabs: **Sessions**, **Roster**, **Requests**, **Monitoring**, and **Reports**.

3. **Treat Dashboard (`/console/dashboard`) as Global Command Center**:
   - High-level dispatch answering: *"Do I have class today? Are there pending requests? Is anyone at risk of dropping? Can I suspend all classes today in 1 tap?"*
   - Detailed per-subject work delegates directly into `Subject Home`.

4. **Orderly Execution Graph**:
   - **Phase 1**: Subject Home Hub & Tab Navigation Shell (`/console/subjects/[id]`).
   - **Phase 2**: Classmate Requests System (Public "Something wrong?" sheet on `/s/[slug]` ➔ Secretary Requests Queue ➔ Approve/Decline rules R3 & R5).
   - **Phase 3**: Absentee Monitoring & Professor Reports (Pure stats engine for flags & streaks ➔ Monitoring Tab ➔ `/prof/[token]` report with PDF/CSV export).
   - **Phase 4**: Dashboard Polish (Pending requests badge, flagged count, 1-tap "No Class for all").
   - **Phase 5**: Legacy Link Map (301 redirects for legacy v1 URLs).
   - **Phase 6**: Knowledge Posts (Announcements, Resources, Q&A).
   - **Phase 7**: Export All, Disaster Recovery Test & Final Cutover.

## Consequences

- Resolves runtime dependencies cleanly: Professor Reports immediately consume real, unit-tested absentee flags without rework.
- Guarantees the secretary can manage live classroom attendance disputes end-to-end on mobile immediately.
- Eliminates navigation blind spots in the secretary console.

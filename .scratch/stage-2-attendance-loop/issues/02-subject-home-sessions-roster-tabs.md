# 02: Subject Home Sessions & Roster Tabs

**What to build:** The first two operational panels within the Subject Home (`/console/subjects/[id]`):
1. **Sessions Tab**: Displays a chronological list of all past, live, and upcoming class sessions for that subject, showing session date, meeting title, kind badge (`Class`, `No Class`), published version tag, and a direct "Open Session" action to inspect or edit.
2. **Roster Tab**: A searchable table of all enrolled students in the subject, presenting each student's name, section mark, student number (📋), schedule conflict status (`With Schedule Conflict` badge), and enrollment state (Active / Dropped).

**Blocked by:** 01 (Subject Home Shell & Quick Actions Header).

**Status:** done

- [x] Sessions tab renders all past and live sessions for the subject in chronological order.
- [x] Each session row displays date, session kind badge (`Class` or `No Class`), and version tag.
- [x] Tapping a session row navigates to the session roll call / view screen.
- [x] Roster tab lists all actively enrolled students with instant name search filtering.
- [x] Students flagged with schedule conflicts display the `With Schedule Conflict` (`C`) badge.
- [x] Total student count matches enrolled database count.

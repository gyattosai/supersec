# 13. Session Roll Call UX, Visual Rhythm, and Information Architecture

Date: 2026-10-06

## Status

Accepted

## Context

In SuperSec v2, taking attendance during live class sessions is the secretary's most time-critical activity (often performed on a phone or laptop in noisy classrooms under 60-second time constraints).

An audit of the initial roll call implementation (`/console/session/[id]`) revealed severe ergonomics and layout bottlenecks:
1. **Narrow Desktop Column & Infinite Vertical Scroll**: Constraining 50+ students to a narrow centered column (`max-w-4xl`) on desktop produced vast empty black borders and required continuous scrolling through 350+ tiny segmented buttons.
2. **Fixed Bottom Action Bar Flaws**: The fixed bottom dock overlapped bottom student cards, competed with mobile browser chrome, and rendered as an awkward mid-page stripe during full-page screen captures.
3. **Absence of Real-time Scoreboard**: The secretary had no live feedback of attendance counts (`Present`, `Absent`, `Excused`, `Unset`, and `% attendance`) without scrolling to the bottom or counting manually.
4. **Lack of Status Triage Filters**: Finding the remaining 2 uncalled students required manually scrolling past 48 marked rows, causing friction against rule R1 ("Publish blocked while any student is Not set").
5. **Monochromatic Row Fatigue**: Every student row looked identical, making absences hard to verify at a glance against noisy lecture environments.

## Decision

1. **Sticky Top Roll Call Scoreboard**:
   - Move primary roll call controls and live stats to a sticky top toolbar directly below the session metadata header.
   - Display real-time attendance percentage, total enrolled, breakdown pills (`P`, `A`, `E`, `–`), "Mark all Present", and the primary "Publish..." action.
   - Content scrolls naturally underneath with zero floating bar overlap.

2. **Quick Status Filter Chips**:
   - Introduce fast one-tap filter chips directly above the roster: `All (51)`, `Unset (2)`, `Absent (3)`, `Excused (1)`, `Present (45)`.
   - Selecting `Unset` isolates remaining uncalled students in 1 tap, resolving R1 publish barriers instantly.

3. **Semantic Row Highlights & Visual Rhythm**:
   - Provide distinct visual weight for each presence state:
     - **Present (`P`)**: Subtle emerald border and muted green tag.
     - **Absent (`A`)**: Rose/red left accent border and high-contrast red badge for immediate verification.
     - **Excused (`E`)**: Amber left accent border and warning badge.
     - **Conflict (`C`)**: Purple accent border with conflict indicator.
     - **Not Set (`–`)**: Dashed border with subtle amber pulse/highlight alerting the secretary that the entry requires input.

4. **Responsive Layout Expansion**:
   - Expand the container on desktop/tablet to `max-w-6xl` with two-column split or dense high-readability grid, while retaining phone-first single-column ergonomics (min 44px touch targets).

5. **Information Architecture & Live Session Indicator**:
   - Maintain a crisp 3-tier hierarchy:
     - **Dashboard (`/console/dashboard`)**: Daily secretary cockpit.
     - **Subjects (`/console/subjects`)**: Term curriculum and subject roster management.
     - **Subject Hub (`/console/subjects/[id]`)**: Deep subject command center.
     - **Live Session (`/console/session/[id]`)**: Distraction-free roll call runner.
   - Add a global `🔴 Live Session` indicator in the console navigation header when an active uncompleted session exists, enabling 1-tap return from any screen.

## Consequences

- Resolving R1 publish barriers takes 1 tap via the `Unset` chip rather than scanning 50 rows.
- Full-page exports and screenshots render cleanly with zero floating dock artifacts.
- Real-time attendance scoreboard gives instantaneous feedback during class roll call.
- Absence verification is effortless via prominent rose/red visual rhythm.

# Attempted Fixes Log — Class Management System

<!-- Newest session blocks at top. Each session = exactly one ## section with ### per attempt. Cross-linked to errors.md / challenges.md. -->

## Session 2026-08-26 — Bulk Student and conflict Attendance refinement
- **Summary:** The targeted blank-line parser correction passed; isolated private route captures resolved both the Attendance and focused Content multi-route blank frames.

### Ignore empty bulk-intake rows before tallying skipped names
- **Problem:** Bulk intake parser counted blank lines as skipped entries.
- **Attempt:** Added an early empty-row return in `parseBulkStudentNames` and aligned the invalid-name assertion with user-visible feedback semantics.
- **Result:** worked
- **Evidence:** `pnpm check` passed and `pnpm test -- --run server/attendance.parsers.test.ts server/subjects.intake.test.ts` passed with 21 tests across 4 files.
- **Follow-up:** Continue with the private Students and Attendance interface integration.

### Isolate the private Attendance screenshot after the multi-route blank frame
- **Problem:** Desktop Attendance capture rendered blank in a multi-route validation batch.
- **Attempt:** Inspected the most recent browser and development-server logs, then captured `/app/attendance/1` alone at 1280 × 900.
- **Result:** worked
- **Evidence:** The targeted capture rendered the full Zoom-intake, official-status, and private-history workspace; no runtime stack trace was present in the inspected logs.
- **Follow-up:** done

### Revalidate the focused Content module and isolate blank mobile route captures
- **Problem:** Focused Content route resolved before its new module was visible to Vite, and the first mobile batch showed blank Announcement-list and Resource-authoring frames.
- **Attempt:** Ran `pnpm check`, inspected the latest browser and development-server logs, then captured the focused Announcement list and Resource authoring routes separately at 390 × 844.
- **Result:** worked
- **Evidence:** TypeScript passed; the targeted Announcement list rendered published-item controls and the Resource authoring route rendered the dedicated one-column property form. The latest logs showed no new runtime error after the completed module was visible.
- **Follow-up:** Continue complete-suite validation and checkpoint preparation.

### Isolate the focused Question & Answer authoring screenshot after the desktop batch frame
- **Problem:** Focused Question & Answer authoring capture rendered blank in the desktop Content batch.
- **Attempt:** Captured `/app/subjects/1/questions/new` alone at 1280 × 900 after the complete validation suite.
- **Result:** worked
- **Evidence:** The targeted capture rendered the complete one-column Question, Answer, tags, official-status, image-preview, and draft-save editor.
- **Follow-up:** done

## Session 2026-08-24 — Continuation implementation
- **Summary:** The first multi-file attendance-normalization tracker update partially applied; a targeted retry is required.

### Combined progress and tracker status patch
- **Problem:** Attendance tracker status patch did not apply.
- **Attempt:** Applied a multi-file edit that inserted the progress milestone, checked the attendance-normalization items in `todo.md`, and marked two review cards applied.
- **Result:** partially
- **Evidence:** The progress log and both review-card statuses changed, but the editor rejected the `todo.md` section with `FAILED apply_patch` and instructed a fresh read of the file.
- **Follow-up:** Apply a tracker-only patch with exact surrounding context, then revalidate the tracker.

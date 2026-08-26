# Attempted Fixes Log — Class Management System

<!-- Newest session blocks at top. Each session = exactly one ## section with ### per attempt. Cross-linked to errors.md / challenges.md. -->

## Session 2026-08-26 — Bulk Student and conflict Attendance refinement
- **Summary:** The targeted blank-line parser correction passed; isolated private route captures resolved both the Attendance and focused Content multi-route blank frames; structured Student input migrated behind temporary caller compatibility.

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

### Preserve caller compatibility during structured Student input migration
- **Problem:** Existing roster callers still sent `canonicalName` or `namesText`, while the new structured server contract expected Student-field objects; the compiler target also rejected the iterator loop.
- **Attempt:** Converted the import parser to an index-based loop and allowed the add/addBulk router endpoints to accept legacy inputs until the revised master-list interface replaces those callers.
- **Result:** worked
- **Evidence:** The TypeScript watcher reported zero errors after the patch, and the structured database migration had already been applied and backfilled.
- **Follow-up:** Replace temporary legacy caller paths with the structured Student master-list interface and then remove compatibility only when no route depends on it.

### Correct the Master List layout import form
- **Problem:** The new Students (Master List) page imported DashboardLayout as a named export although the module exports it by default.
- **Attempt:** Changed the single import binding to the default form.
- **Result:** worked
- **Evidence:** The TypeScript watcher reported zero errors after the change.
- **Follow-up:** Continue end-to-end structured Student intake and attendance contract work.

### Split full given names from two-column Student import rows
- **Problem:** A `Last, First Middle` row retained the middle initial within `firstName` instead of filling `middleName`.
- **Attempt:** Added a deterministic split for a two-column row’s second cell while preserving an explicit third middle-name column when present.
- **Result:** worked
- **Evidence:** `pnpm check` and the focused Student import and Attendance parser test run passed with 23 tests across 4 files.
- **Follow-up:** Continue EXCUSED Attendance view and safe-public aggregate integration.

### Align the premium public Subject Home with the safe payload
- **Problem:** The new public reader assumed an extra nested Subject object and failed type checking.
- **Attempt:** Inspected the existing public payload type, then destructured the `latest` data alongside the established public Subject fields.
- **Result:** worked
- **Evidence:** The TypeScript watcher reported zero errors after the narrow correction.
- **Follow-up:** Complete responsive public-reader validation with existing published data.

### Isolate blank private mobile captures after a multi-route batch
- **Problem:** A multi-route mobile screenshot batch returned blank Students and Attendance frames.
- **Attempt:** Reviewed recent browser and development-server logs, then captured both private routes in a targeted two-route mobile batch.
- **Result:** worked
- **Evidence:** The Students page rendered structured intake, sorting, conflict controls, and private-note indicators; Attendance rendered Present, Absent, Excused, and Not Set summaries plus private Excused guidance.
- **Follow-up:** Complete desktop reader/editor validation and checkpoint preparation.

### Bind Student and content row labels to their real mutations
- **Problem:** Generic disabled-state presentation did not prove which action was pending in a specific Student or content row.
- **Attempt:** Rewrote the Master List row controls to inspect each mutation's actual variables and pending state; introduced focused-content action tracking so Publish, Archive, and Restore expose an `aria-busy` state and action-specific label only for the active record.
- **Result:** worked
- **Evidence:** TypeScript passed after the sentinel correction; 23 tests, production build, whitespace validation, and fresh private mobile captures passed.
- **Follow-up:** Checkpoint the completed refinement without fabricating live mutation traffic against class records.

### Replace module-level content action tracking with local pending state
- **Problem:** Focused content action labels were originally backed by transient module-level action tracking.
- **Attempt:** Routed the actual list render through `LocalContentList`, receiving `pendingContentAction` from `FocusedContentPage`, and removed every module-level action identifier and mutation write.
- **Result:** worked
- **Evidence:** Source grep found no obsolete action tracker, TypeScript passed, 24 tests passed including the safe active `Archiving…` / `aria-busy` render assertion, the production build passed, and the isolated Resource mobile capture rendered.
- **Follow-up:** Save the finished checkpoint.

## Session 2026-08-24 — Continuation implementation
- **Summary:** The first multi-file attendance-normalization tracker update partially applied; a targeted retry is required.

### Combined progress and tracker status patch
- **Problem:** Attendance tracker status patch did not apply.
- **Attempt:** Applied a multi-file edit that inserted the progress milestone, checked the attendance-normalization items in `todo.md`, and marked two review cards applied.
- **Result:** partially
- **Evidence:** The progress log and both review-card statuses changed, but the editor rejected the `todo.md` section with `FAILED apply_patch` and instructed a fresh read of the file.
- **Follow-up:** Apply a tracker-only patch with exact surrounding context, then revalidate the tracker.

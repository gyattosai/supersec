# Change LOG-40 — View-only section identity completed

- **Operation:** log-entry
- **Target file(s):** `.project/logs/progress.md`
- **Summary:** Record per-Subject configuration of the mark and name used on Subject-scoped view-only page headers.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Configurable view-only section identity
  - **Accomplished:** Added optional Subject fields for a compact view-only mark and full view-only name. The existing Subject details page now offers a `View-only header` section where the secretary can enter values such as `N001` and `OLCA113N001`.
  - **Display:** The reusable public header resolves these values on Subject home, Attendance, proof-submission, Announcements, Resources, Questions & Answers, and Question-list routes. If either value is blank, it falls back independently to `SS` and `supersec`, so legacy shared links remain clear.
  - **Safety:** The two new fields are intentionally public label fields only. Existing public projections include only these labels alongside already-shared Subject context; no roster, private note, Zoom, proof, or secretary data was added.

  ### Validation — Configurable view-only section identity (2026-08-27)
  | Check | Verdict | Evidence |
  |---|---|---|
  | Schema migration | PASS | Reviewed and applied additive migration `0010_bumpy_zaran.sql`, adding nullable `viewOnlyShortMark` and `viewOnlyName` columns without data loss. |
  | Identity logic | PASS | Focused tests render the actual header with configured `N001` / `OLCA113N001` values, cover legacy fallbacks, settings/public-projection contracts, and direct first-render paths for Subject home, Resource, and proof readers. |
  | Rendered pages | PASS | A mocked no-data-change render exercises the full premium Subject home and related premium Resource page with `N001` / `OLCA113N001` and verifies both labels in each header. |
  | Public frame | PASS | Mobile public Subject capture rendered the reusable header cleanly with the existing safe fallback for its unconfigured live Subject. Subject home passes its loaded identity directly to the header; related public readers supply their loaded identity through the shared reader frame, so custom labels do not wait for a second query. |
  | Automated integrity | PASS | `pnpm check`, 19 Vitest files / 54 tests, client and SSR builds, and `git diff --check` passed after the direct-header correction and full-page rendered identity verification. |
  | Existing data | NOT CHANGED | No Subject’s real header identity was set automatically; the secretary controls those values in Subject details. |

  - **Correction record:** An initial broad `server/db.ts` patch was ambiguous because two payload declarations shared a line. Smaller type-anchored edits completed the projection safely. A static test then matched the actual section-heading copy. The shared-header implementation was then corrected to receive the already-loaded identity on Subject home and related readers, avoiding a fallback flash and redundant query.
  - **Note:** The existing client chunk-size warning remains non-blocking.
  - **Related checkpoint:** pending.
  ```
- **Reason:** Retain the schema, public-boundary, fallback, and real-data evidence accurately.
- **Source task:** Configurable view-only section identity.
- **Follow-up:** Apply under the project review workflow after checkpoint creation.
- **Status:** applied

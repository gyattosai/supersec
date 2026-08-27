# Change LOG-35 — Attendance-proof submissions completed

- **Operation:** log-entry
- **Target file(s):** `.project/logs/progress.md`
- **Summary:** Record the public attendance-proof submission capability, privacy boundaries, and validation evidence.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Public attendance-proof submissions
  - **Accomplished:** Added an easy-to-find `Submit proof` route from every published Attendance page. Classmates can provide their name and one Zoom screenshot on a separate mobile-first page. A clear result says whether Attendance was already Present, was updated to Present, or was saved for secretary review.
  - **Automation:** The server stores proof files in a private, randomized storage path. It sends a short-lived signed image URL, the submitted name, the session context, and the private roster to structured AI review. Only an accepted decision with a verified active Subject membership can mark the matched published record Present; otherwise the proof is retained for owner review.
  - **Boundary:** Anonymous callers receive no roster data, private notes, Zoom input, suggestions, proof URL, matching identifier, or secretary controls. Public Attendance history uses a generic correction summary only.

  ### Validation — Attendance proof submissions (2026-08-27)
  | Check | Verdict | Evidence |
  |---|---|---|
  | Requirements | PASS | Separate proof page, prominent Attendance-page access, image upload, AI review, automatic eligible Present update, review fallback, and result notices are implemented. |
  | Privacy | PASS | Public responses return only availability, session label/date, submission ID, and outcome. Private proof files, roster matching, and owner review are not selected by public endpoints. |
  | Safeguard logic | PASS | Four focused unit tests confirm only AI-approved membership IDs that belong to the active Subject roster can enter the automatic update path. A mocked public submit verifies an uncertain AI result is persisted as private `needs_review`, does not update Attendance, and is unavailable to an anonymous owner-review caller. |
  | Browser experience | PASS | A 390 px public run opened the Attendance call to action, then verified the separate page heading, accessible name/upload controls, and privacy notice without submitting a proof. |
  | Automated integrity | PASS | `pnpm check`, 17 Vitest files / 48 tests, client and SSR builds, and `git diff --check` passed after the expanded fallback test. |
  | Real-evidence limit | NOT RUN | No actual classmate Zoom screenshot or live AI decision was fabricated, so production acceptance and record-update evidence is not claimed. |

  - **Schema:** Applied the additive `attendanceProofSubmissions` table migration. A generated long foreign-key name exceeded the MySQL identifier limit; the inspected partial migration was safely completed using a concise key name and verified through `information_schema`.
  - **Notes:** The existing non-blocking client chunk-size warning remains.
  - **Related checkpoint:** pending.
  ```
- **Reason:** Preserve scope, safety controls, real-versus-automated verification evidence, and the non-destructive migration note.
- **Source task:** Current public attendance-proof submission feature.
- **Follow-up:** Apply under the project review workflow after checkpoint creation.
- **Status:** pending

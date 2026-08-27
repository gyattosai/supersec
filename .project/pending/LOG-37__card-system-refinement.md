# Change LOG-37 — Card-system refinement completed

- **Operation:** log-entry
- **Target file(s):** `.project/logs/progress.md`
- **Summary:** Record the streamlined Subject-home card hierarchy and stable hover behavior.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Card-system refinement
  - **Accomplished:** Replaced the repeated accent-gradient card frames with one quiet border and single-surface records. Public Subject-home groups now have compact headers and simple divider-separated record rows, removing the previous card-inside-card appearance. Private Subject workflow cards retain clear card hierarchy without the decorative vertical connector.
  - **Interaction:** Replaced card lifting and moving arrows with a small, color-only surface and border response on precise hover devices. Touch contexts retain the existing compact active feedback without hover assumptions.

  ### Validation — Card-system refinement (2026-08-27)
  | Check | Verdict | Evidence |
  |---|---|---|
  | Public Subject presentation | PASS | Desktop shared Subject capture shows the simplified hero and four compact record groups with one clear interaction row per record. |
  | Hover stability | PASS | A desktop hover check on the published Attendance record compared its bounding box before and after hover and found no movement. |
  | Token behavior | PASS | Focused token test locks hover changes behind a fine-pointer hover query and confirms no card transform is applied. |
  | Automated integrity | PASS | `pnpm check`, 17 Vitest files / 49 tests, client and SSR builds, and `git diff --check` passed. |

  - **Note:** The first hover helper searched for a non-interactive group heading instead of a published record link; the second run used the available record link and passed. The client chunk-size warning remains non-blocking.
  - **Related checkpoint:** pending.
  ```
- **Reason:** Retain the visual diagnosis, interaction decision, and concrete verification evidence.
- **Source task:** Current Subject-home and shared card-system refinement.
- **Follow-up:** Apply under the project review workflow after checkpoint creation.
- **Status:** pending

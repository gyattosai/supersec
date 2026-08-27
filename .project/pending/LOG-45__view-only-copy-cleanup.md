# Change LOG-45 — View-only Subject-home copy cleanup completed

- **Operation:** log-entry
- **Target file(s):** `.project/logs/progress.md`
- **Summary:** Record removal of the redundant public Subject-home heading.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — View-only Subject-home copy cleanup
  - **Accomplished:** Removed the `Class updates` eyebrow and `See what is shared.` heading from the premium shared Subject home. The page now moves directly from Subject details into the clearly labeled Attendance, Announcements, Resources, and Questions & Answers record groups.

  ### Validation — View-only Subject-home copy cleanup (2026-08-27)
  | Check | Verdict | Evidence |
  |---|---|---|
  | Shared-page layout | PASS | Mobile public Subject capture shows direct, balanced spacing from the hero to the first record group. |
  | Rendered copy | PASS | Full Subject-home render test explicitly verifies both removed strings are absent. |
  | Automated integrity | PASS | `pnpm check`, 19 Vitest files / 55 tests, client and SSR builds, and `git diff --check` passed. |

  - **Note:** The existing client chunk-size warning remains non-blocking.
  - **Related checkpoint:** pending.
  ```
- **Reason:** Preserve the focused shared-page copy decision and validation evidence.
- **Source task:** View-only Subject-home copy cleanup.
- **Follow-up:** Apply under the project review workflow after checkpoint creation.
- **Status:** pending

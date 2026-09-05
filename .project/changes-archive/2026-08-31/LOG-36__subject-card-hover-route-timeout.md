# Change LOG-36 — Subject-card hover route timeout

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the unavailable public-card locator during the first post-refinement hover check.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Card-system refinement
  - **Summary:** The initial desktop visual helper could not find the expected published Attendance card on the configured public Subject route.

  ### Subject-card hover locator timed out
  - **Error:** `locator.waitFor: Timeout 30000ms exceeded` while waiting for `getByRole('link', { name: /Class Attendance/i })`.
  - **Where:** `/home/ubuntu/subject-card-hover-browser-check.mjs` against the existing public Subject test route.
  - **Environment:** Headless Chromium public-page check.
  - **Reproduction:** Open the configured public route when its current data response does not render the expected card.
  - **Resolution:** The public Subject route rendered normally. The helper had searched for the non-interactive group title rather than its published record link. Retargeting the available Attendance record link passed, with identical card bounds before and after hover.
  ```
- **Reason:** Preserve the test evidence before changing the verification target.
- **Source task:** Current card-system refinement.
- **Follow-up:** Update after a valid route retry.
- **Status:** resolved

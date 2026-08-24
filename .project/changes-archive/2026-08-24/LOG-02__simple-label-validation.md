# Change LOG-02 — Simple-label validation gap

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the validation gap in the information architecture's simple-language taxonomy.
- **Content:**
  ```markdown
  ## Session 2026-08-24 — Information architecture preparation
  - **Summary:** The information architecture did not apply the approved simple labels consistently.

  ### Mixed user-facing labels in information architecture
  - **Error:** `There is partial evidence in docs/information-architecture.md (a new 'Simple labels' section and several renamed pages), but the document still mixes in non-simple/custom terms such as 'Secretary Dashboard', 'Class Management Workspace', 'Public Subject Home', 'Cross-subject Reports', 'Q&A post', 'resource card', and 'version history/public version history' in user-facing IA descriptions. That means the taxonomy is not yet consistently converted to only simple, familiar labels.`
  - **Where:** Information architecture validation after a partial terminology update.
  - **Environment:** Manus web project editor, Ubuntu sandbox.
  - **Reproduction:** Review user-facing labels in `docs/information-architecture.md` against the approved label list: Dashboard, Subjects, Reports, Home, Attendance, Announcements, Resources, Questions & Answers, Schedule, Sharing, Settings, No Class, and History.
  - **Resolution:** Replace remaining mixed labels in user-facing navigation, diagrams, tables, and flows; then revalidate every listed user-facing label.
  - **Related:** LOG-01 task-tracker patch context mismatch.
  ```
- **Reason:** Preserve the validation evidence before applying a targeted terminology correction.
- **Source task:** Current conversation
- **Follow-up:** After approval, add the log entry to `.project/logs/errors.md` and archive this review card.
- **Status:** applied

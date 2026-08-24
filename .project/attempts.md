# Attempted Fixes Log — Class Management System

<!-- Newest session blocks at top. Each session = exactly one ## section with ### per attempt. Cross-linked to errors.md / challenges.md. -->

## Session 2026-08-24 — Milestone 1 product design
- **Summary:** A focused foundation wording fix restored full Milestone 1 design validation.

### Explicit LLM suggestion safeguard
- **Problem:** The design foundation did not include the exact LLM suggestion safeguard required by validation.
- **Attempt:** Added the rule: “Every LLM suggestion is clearly labeled ‘Suggestion — review before publishing.’” to the visual principles table in `docs/design-foundation.md`.
- **Result:** worked
- **Evidence:** The unchanged validation passed all three contrast checks (17.85, 9.25, and 5.48), passed the 44 by 44 touch target check, and passed every foundation and key-surface coverage check.
- **Follow-up:** Done; prepare the Milestone 1 product-design package for delivery.

## Session 2026-08-24 — Information architecture preparation
- **Summary:** A focused terminology pass corrected the remaining mixed labels and added the approved dark-mode-first baseline.

### Simple-label terminology correction
- **Problem:** Mixed user-facing labels remained after the initial information-architecture terminology pass.
- **Attempt:** Replaced mixed navigation and content labels with the approved vocabulary: Dashboard, Subjects, Reports, Home, Attendance, Announcements, Resources, Questions & Answers, Schedule, Sharing, Settings, No Class, History, and Students. Added the dark-mode-first baseline without changing the architecture.
- **Result:** worked
- **Evidence:** The unchanged revalidation produced `PASS: no disallowed mixed labels found`, passed every required simple label, and found `## 1.2 Dark mode first` in `docs/information-architecture.md`.
- **Follow-up:** Done; submit the information architecture for user approval.

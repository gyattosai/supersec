# Change LOG-05 — Messenger preview metadata verification

- **Operation:** log-entry
- **Target file(s):** `.project/logs/progress.md`
- **Summary:** Record the verified server-rendered title/version metadata on existing public Announcement and Resource pages.
- **Content:**
  ```markdown
  ## 2026-08-27 — Version-aware public post metadata
  Implemented a bounded metadata title formatter for published Announcements, Resources, Questions & Answers, Attendance, and reports. Server-rendered public Announcement `vHBJrX_4SKpS` rendered the title `testt · Version 2 · supersec`; published Resource `fAgcd0s8PqrY` rendered `test · Version 1 · supersec`; Question & Answer `P2PBsNYoV8ql` rendered `Official answer — test · Version 1 · supersec`; Attendance `iVzwdkQ-Eh2E` rendered `Operations Management Attendance · Version 1 · supersec`; and report `OnsAqNDMeldR` rendered `All Subject Attendance · Version 2 · supersec`. Raw SSR HTML confirmed that each page's `<title>`, `og:title`, and `twitter:title` match the same title-and-version value. TypeScript, 36 tests, client/SSR production builds, and whitespace validation passed. The remaining real Messenger conversation/card-cache check remains intentionally skipped until a canonical published domain is available.
  ```
- **Reason:** Persist observed public route evidence without claiming a live Messenger-card verification.
- **Source task:** Current supersec Messenger metadata task.
- **Follow-up:** Apply only after review alongside the session records.
- **Status:** pending

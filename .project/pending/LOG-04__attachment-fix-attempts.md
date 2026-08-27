# Change LOG-04 — Attachment improvement attempts

- **Operation:** log-entry
- **Target file(s):** `.project/attempts.md`
- **Summary:** Record the completed attachment-router corrections and evidence.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Attachment improvements
  - **Summary:** The Resource attachment model, upload policy, and premium private/public presentation were implemented; one TypeScript compatibility correction and one consumer-patch retry both succeeded.

  ### Replace incompatible Set iteration in Resource attachment validation
  - **Problem:** Attachment validation failed compilation because the configured TypeScript target did not support direct Set spreading.
  - **Attempt:** Replaced the Set spread expression in `assertPublicMediaList` with `Array.from(new Set(assetIds))`.
  - **Result:** worked
  - **Evidence:** `pnpm check` passed, followed by 34 passing tests, successful client/SSR production builds, and whitespace validation.
  - **Follow-up:** done

  ### Apply the shared Resource attachment shelf after the initial multi-file patch mismatch
  - **Problem:** The public attachment component was created, but compact consumer-page hunks did not match in the original multi-file update.
  - **Attempt:** Re-read the premium Resource page and replaced it with the current attachment-shelf integration in a focused edit.
  - **Result:** worked
  - **Evidence:** TypeScript, 34 tests, client/SSR builds, mobile and desktop Resource authoring captures, and the shared shelf rendering test passed.
  - **Follow-up:** done
  ```
- **Reason:** Preserve exact, evidence-backed outcomes for the repair attempts completed in this session.
- **Source task:** Current supersec attachment-improvement task.
- **Follow-up:** Apply only after review alongside the related error records.
- **Status:** pending

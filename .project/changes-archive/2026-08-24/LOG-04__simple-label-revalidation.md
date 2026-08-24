# Change LOG-04 — Simple-label revalidation failure

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the remaining mixed terms found after the first terminology correction.
- **Content:**
  ```markdown
  ## Session 2026-08-24 — Information architecture preparation
  - **Summary:** The first simple-label correction removed navigation labels but left mixed terminology in explanatory text.

  ### Simple-label revalidation found remaining mixed terms
  - **Error:** `Disallowed mixed-label matches:\n98:The public subject home is the default destination for a Messenger link. It must answer “What class is this, when do we meet, and where is the information I need?” before exposing secondary content.\n103:4. **Current content:** newest announcement, recent resource cards, and useful questions and answers.\n118:5. Activate the subject and publish the public subject home.\n183:| **Public subject home as the Messenger destination** | Direct-only links; public dashboard | A stable subject home makes any shared link understandable and provides an escape route from deep content | Classmates mostly arrive from Messenger on mobile |`
  - **Where:** Revalidation of `docs/information-architecture.md` against the previously failed terminology list.
  - **Environment:** Manus web project editor, Ubuntu sandbox.
  - **Reproduction:** Run the simple-label grep validation after the first terminology correction.
  - **Resolution:** Replace remaining explanatory references with Home, Resources, and other approved labels, then repeat the same validation.
  - **Related:** LOG-02 mixed user-facing labels in information architecture.
  ```
- **Reason:** Preserve the failed revalidation evidence before the second targeted correction.
- **Source task:** Current conversation
- **Follow-up:** After approval, add the log entry to `.project/logs/errors.md` and archive this review card.
- **Status:** applied

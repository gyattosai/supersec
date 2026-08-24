# Change LOG-05 — Second simple-label revalidation failure

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the final three mixed labels found after the second terminology pass.
- **Content:**
  ```markdown
  ## Session 2026-08-24 — Information architecture preparation
  - **Summary:** The second terminology pass left three mixed-label phrases in the decision table and approval checklist.

  ### Second simple-label revalidation found three mixed labels
  - **Error:** `Disallowed mixed-label matches:\n188:| **Public version history** | No history; secretary-only audit trail | A concise public history builds trust in updates without exposing internal notes | Classmates benefit from seeing that a post or record changed |\n199:- Dashboard, Subjects, and the public Subject Home are the correct three structural levels.\n204:- Announcements, resource cards, and Questions & Answers are separate content types with their own History and individual share links.`
  - **Where:** Second revalidation of `docs/information-architecture.md` against the same simple-label criteria.
  - **Environment:** Manus web project editor, Ubuntu sandbox.
  - **Reproduction:** Run the simple-label grep validation after the second terminology correction.
  - **Resolution:** Use History, Home, and Resources in the remaining decision and approval text, then repeat the validation without changing criteria.
  - **Related:** LOG-04 simple-label revalidation found remaining mixed terms.
  ```
- **Reason:** Preserve the failed validation evidence before the final targeted correction.
- **Source task:** Current conversation
- **Follow-up:** After approval, add the log entry to `.project/logs/errors.md` and archive this review card.
- **Status:** applied

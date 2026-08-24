# Change LOG-07 — Design validation wording gap

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the design-foundation validation failure caused by missing explicit LLM suggestion wording.
- **Content:**
  ```markdown
  ## Session 2026-08-24 — Milestone 1 product design
  - **Summary:** Design validation passed contrast and touch-target checks but failed a required wording coverage check.

  ### Missing explicit LLM suggestion wording in design foundation
  - **Error:** `FAIL: LLM suggestion`
  - **Where:** Milestone 1 design validation of `docs/design-foundation.md`.
  - **Environment:** Manus web project editor, Ubuntu sandbox.
  - **Reproduction:** Run the design validation command that checks dark-mode contrast, 44 by 44 touch targets, and required foundation terms.
  - **Resolution:** Add an explicit LLM suggestion rule to the foundation, then rerun the unchanged validation.
  - **Related:** None.
  ```
- **Reason:** Preserve the failed validation evidence before applying a focused documentation fix.
- **Source task:** Current conversation
- **Follow-up:** After approval, add the log entry to `.project/logs/errors.md` and archive this review card.
- **Status:** applied

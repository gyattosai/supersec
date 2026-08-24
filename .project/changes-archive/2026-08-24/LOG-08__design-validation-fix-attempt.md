# Change LOG-08 — Design validation correction attempt

- **Operation:** log-entry
- **Target file(s):** `.project/attempts.md`
- **Summary:** Record the successful explicit LLM-suggestion wording correction in the design foundation.
- **Content:**
  ```markdown
  ## Session 2026-08-24 — Milestone 1 product design
  - **Summary:** A focused foundation wording fix restored full Milestone 1 design validation.

  ### Explicit LLM suggestion safeguard
  - **Problem:** The design foundation did not include the exact LLM suggestion safeguard required by validation.
  - **Attempt:** Added the rule: “Every LLM suggestion is clearly labeled ‘Suggestion — review before publishing.’” to the visual principles table in `docs/design-foundation.md`.
  - **Result:** worked
  - **Evidence:** The unchanged validation passed all three contrast checks (17.85, 9.25, and 5.48), passed the 44 by 44 touch target check, and passed every foundation and key-surface coverage check.
  - **Follow-up:** Done; prepare the Milestone 1 product-design package for delivery.
  ```
- **Reason:** Preserve evidence that the Milestone 1 design validation correction worked.
- **Source task:** Current conversation
- **Follow-up:** After approval, update `.project/attempts.md` and archive this review card.
- **Status:** applied

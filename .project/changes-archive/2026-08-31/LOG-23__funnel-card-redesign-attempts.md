# Change LOG-23 — Funnel and card redesign attempts

- **Operation:** log-entry
- **Target file(s):** `.project/attempts.md`
- **Summary:** Record the successful isolated Attendance visual retry and accessible primary-token selection.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Funnel and card-system redesign
  - **Summary:** The refined one-column Subject flows, record cards, and high-contrast orange actions passed focused visual and automated validation, including Student roster cards and shared reader lists.

  ### Select an accessible saturated orange for white primary-action labels
  - **Problem:** The existing dark primary token measured 4.10:1 against white labels, below the normal-text target.
  - **Attempt:** Evaluated orange candidates against both white labels and the near-black canvas, then selected `#c95000`.
  - **Result:** worked
  - **Evidence:** White on `#c95000` measures 4.53:1; the token also measures 4.60:1 against the `#010102` canvas. The focused design-token test passes.
  - **Follow-up:** done

  ### Retry the transient blank Attendance capture independently
  - **Problem:** Attendance appeared blank in a six-route mobile screenshot batch after its record card received the new shell.
  - **Attempt:** Checked recent runtime logs and captured the route independently at 390 × 844.
  - **Result:** worked
  - **Evidence:** No current Attendance error appeared in logs and the full workflow rendered in the isolated capture.
  - **Follow-up:** done
  ```
- **Reason:** Preserve exact, evidence-backed outcomes for the visual and contrast checks.
- **Source task:** Current supersec funnel and card-system redesign.
- **Follow-up:** Apply only after review with the related error record.
- **Status:** applied

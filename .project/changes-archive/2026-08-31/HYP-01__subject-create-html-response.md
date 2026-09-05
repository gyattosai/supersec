# Change HYP-01 — Subject creation request path

- **Operation:** project-file-addition
- **Target file(s):** `.project/hypotheses.md`
- **Summary:** Create the required hypothesis log with a falsifiable Subject-creation request-path theory.
- **Content:**
  ```markdown
  # Hypotheses Log — Class Management System

  <!-- Newest session blocks at top. Each session = exactly one ## section with ### per hypothesis. Every hypothesis must reach an Outcome. -->

  ## Session 2026-08-28 — Subject creation response failure
  - **Summary:** Investigating why the New Subject mutation receives HTML instead of a tRPC JSON response.

  ### Mutation request reaches the frontend document fallback
  - **Observation:** The client raised `Unexpected token '<', "<!doctype "... is not valid JSON` immediately after submitting the New Subject form.
  - **Hypothesis:** The `subjects.create` request is resolving to a document-rendering route or a malformed tRPC endpoint rather than `/api/trpc`, causing HTML to reach the JSON parser.
  - **Prediction:** Network and router configuration will show a Subject-creation POST whose response is `text/html` or whose URL does not target the active tRPC API handler.
  - **Test:** Inspect the recorded network request, tRPC client configuration, route composition, and server handler order; then rerun the same mutation through an isolated authenticated browser flow.
  - **Outcome:** confirmed
  - **Result notes:** The active managed environment sets `PORT=3000`. Replacing alternate-port fallback with a validated required port aligns the API process with the preview URL. A post-fix authenticated submission reached the JSON tRPC endpoint and completed successfully, confirming the correction under the same browser path.
  - **Related:** `errors.md` — Create Subject received HTML where the tRPC client expected JSON.
  ```
- **Reason:** Make the debugging theory explicit before implementation.
- **Source task:** User-reported New Subject failure.
- **Follow-up:** Completed with an authenticated post-fix browser request and cleanup of the temporary record.
- **Status:** resolved

# Change LOG-50 — Subject creation HTML/JSON response failure

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the exact user-reported Subject-creation response parsing failure before a code change.
- **Content:**
  ```markdown
  ## Session 2026-08-28 — Subject creation response failure

  ### Create Subject received HTML where the tRPC client expected JSON
  - **Error:** `Unexpected token '<', "<!doctype "... is not valid JSON`.
  - **Where:** Private New Subject form after clicking `Create Subject`.
  - **Environment:** Authenticated browser session, dark-mode private workspace.
  - **Reproduction:** Complete Subject name, code, professor, schedule days, and optional times, then submit the form.
  - **Resolution:** The server had an unsafe alternate-port fallback that could send preview traffic to a document-serving listener when `PORT=3000` was occupied. It now uses only the configured managed port and rejects invalid values rather than silently selecting another port. After a clean restart on port 3000, an authenticated post-fix form submission returned HTTP 200 `application/json` from `/api/trpc/subjects.create?batch=1`, navigated to the new Subject, and was deleted immediately. Focused port tests and the full validation suite passed.
  - **Related:** Subject creation reliability.
  ```
- **Reason:** Preserve the exact reported runtime error before the corrective work begins.
- **Source task:** User-reported New Subject failure.
- **Follow-up:** Completed with the authenticated post-fix request, visible success navigation, and immediate temporary-record cleanup.
- **Status:** resolved

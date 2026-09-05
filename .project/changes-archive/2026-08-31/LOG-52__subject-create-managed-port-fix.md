# Change LOG-52 — Subject creation managed-port correction

- **Operation:** log-entry
- **Target file(s):** `.project/attempts.md`, `.project/logs/errors.md`, `.project/hypotheses.md`
- **Summary:** Record the targeted removal of alternate-port fallback that could route tRPC requests to an HTML document handler.
- **Content:**
  ```markdown
  ## Session 2026-08-28 — Subject creation response failure
  - **Summary:** A confirmed browser reproduction succeeded with an `application/json` tRPC response. The server was then changed to require its managed port instead of silently switching to a different local listener.

  ### Keep the API on its configured managed port
  - **Problem:** Create Subject received HTML where the tRPC client expected JSON.
  - **Attempt:** Replaced the dynamic `findAvailablePort` listener search in `server/_core/index.ts` with a small validated `resolveServerPort` helper. The server now listens only on `PORT` (currently `3000`) and fails loudly for invalid configuration rather than serving a preview URL through a different process.
  - **Result:** worked
  - **Evidence:** The restarted managed server reported `Server running on http://localhost:3000/`. A post-fix authenticated browser request to `/api/trpc/subjects.create?batch=1` returned HTTP 200 `application/json`, created the temporary Subject, displayed “Subject created,” and navigated to it. The record was immediately deleted. The focused port test passed, and the full integrity gate passed: TypeScript, 21 Vitest files / 59 tests, client and SSR production builds, and `git diff --check`.
  - **Follow-up:** done

  ### Error resolution update
  - **Resolution:** Confirmed. The mutation route returned JSON in browser reproduction, temporary test data was removed, and the port-contract change prevents silent alternate listener selection.

  ## Session 2026-08-28 — Subject creation response failure
  - **Summary:** Investigation of a JSON parser error from the New Subject form.

  ### Mutation request reaches the frontend document fallback
  - **Observation:** The client raised `Unexpected token '<', "<!doctype "... is not valid JSON` after submitting the New Subject form. A later controlled browser submission reached `/api/trpc/subjects.create?batch=1` and returned HTTP 200 `application/json`.
  - **Hypothesis:** Dynamic fallback from the managed `PORT=3000` to a different listener intermittently leaves the public preview URL pointing at a document-serving process, so a tRPC request receives HTML.
  - **Prediction:** Removing alternate-port fallback will keep tRPC and the preview on the same port and prevent this HTML parsing path.
  - **Test:** Restart the service after the listener change, confirm the configured port, submit an isolated temporary Subject through the authenticated preview, then remove it; run focused and full automated validation.
  - **Outcome:** confirmed
  - **Result notes:** The post-fix reproduction reached the managed tRPC route, returned HTTP 200 `application/json`, and navigated to the created Subject before its immediate cleanup. `PORT` is set to 3000 in the managed environment, and the new listener helper pins the process to that value instead of routing around a busy port.
  - **Related:** `errors.md` — Create Subject received HTML where the tRPC client expected JSON.
  ```
- **Reason:** Preserve the root-cause evidence, minimal correction, and post-fix validation requirement.
- **Source task:** User-reported New Subject failure.
- **Follow-up:** Completed with authenticated post-fix browser evidence and temporary-record cleanup.
- **Status:** resolved

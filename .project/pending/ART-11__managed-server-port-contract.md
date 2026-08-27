# Change ART-11 — Managed server port contract

- **Operation:** artifact-registration
- **Target file(s):** `.project/artifacts.md`
- **Summary:** Register the explicit managed-server port contract that protects tRPC JSON routes from alternate-port preview mismatch.
- **Content:**
  ```markdown
  ## ART-11 — Managed server port contract
  - **Path/URL:** `server/_core/port.ts`, `server/_core/index.ts`, `server/server.port.test.ts`
  - **Type:** code
  - **Purpose:** Validates `PORT` and binds the application only to that configured port, preventing a silent alternate listener from mismatching the managed preview URL and returning HTML to the tRPC client.
  - **Created:** 2026-08-28 | **Last updated:** 2026-08-28
  - **Format:** `.ts`
  - **Notes:** Defaults to port 3000 only if `PORT` is absent; malformed/out-of-range values fail at startup. The managed preview supplies `PORT=3000`. Apply after ART-01 creates the artifact registry.
  ```
- **Reason:** Make the app’s preview/API route contract discoverable for future debugging.
- **Source task:** User-reported New Subject failure.
- **Follow-up:** Apply after ART-01 creates the artifact registry.
- **Status:** pending

# Change LOG-08 — Missing SSR client entry

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the expected temporary Vite error after switching the HTML entry before creating the hydration module.
- **Content:**
  ```markdown
  ### SSR client entry was referenced before creation
  - **Error:** `Failed to load url /src/entry-client.tsx (resolved id: /src/entry-client.tsx). Does the file exist?`
  - **Where:** Vite client transform after `client/index.html` changed its module script to `entry-client.tsx`.
  - **Environment:** Development server.
  - **Reproduction:** Change the HTML script entry before creating the referenced hydration file.
  - **Resolution:** Create `client/src/entry-client.tsx` from the existing client bootstrap, then continue the SSR entry split.
  - **Related:** SSR conversion.
  ```
- **Reason:** The error-recording workflow requires the observed transient entry mismatch before correction.
- **Source task:** Current Class Management System continuation session.
- **Follow-up:** Apply only if approved.
- **Status:** pending

# Change LOG-09 — Protected SSR local-storage failure

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the protected-route SSR failure caused by browser storage access in authentication state derivation.
- **Content:**
  ```markdown
  ### Protected SSR route accessed localStorage during render
  - **Error:** `ReferenceError: localStorage is not defined` at `client/src/_core/hooks/useAuth.ts:54`.
  - **Where:** SSR screenshot of `/app`, via `useAuth` inside `DashboardLayout`.
  - **Environment:** React server render in the development server.
  - **Reproduction:** Request `/app` after enabling SSR while `useAuth` writes `localStorage` in a `useMemo` render path.
  - **Resolution:** Move storage persistence into a browser-only effect and keep the rendered auth state storage-free.
  - **Related:** SSR conversion.
  ```
- **Reason:** The error-recording workflow requires this verified browser-global failure before the targeted correction.
- **Source task:** Current Class Management System continuation session.
- **Follow-up:** Apply only if approved.
- **Status:** applied

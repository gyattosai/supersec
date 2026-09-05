# Change LOG-54 — Subject creation reliability completed

- **Operation:** log-entry
- **Target file(s):** `.project/logs/progress.md`
- **Summary:** Record the resolved HTML-to-JSON Subject-creation error and stable managed-port listener contract.
- **Content:**
  ```markdown
  ## Session 2026-08-28 — Subject creation reliability
  - **Diagnosis:** The reported parser error means an HTML page reached the tRPC JSON client. A user-approved authenticated post-fix reproduction proved the `subjects.create` mutation, its payload, and the `/api/trpc/subjects.create?batch=1` handler return HTTP 200 `application/json` after the managed-port correction.
  - **Correction:** Removed the server’s dynamic search for an alternate local port. It now validates and listens only on the configured managed `PORT`, which is `3000` in this environment. If that port is unavailable or malformed, startup fails visibly instead of potentially serving the fixed preview URL through a stale or document-only listener.
  - **Cleanup:** The post-fix reproduction created a temporary `Temporary Post-Fix Check` Subject only under explicit user confirmation; it was immediately deleted by ID/name/code with cascade-safe foreign keys. No existing class data was changed.

  ### Validation — Subject creation reliability (2026-08-28)
  | Check | Verdict | Evidence |
  |---|---|---|
  | Browser mutation | PASS | Post-fix temporary Subject submission posted to `/api/trpc/subjects.create?batch=1`, returned HTTP 200 `application/json`, showed “Subject created,” and navigated to its new private workspace. |
  | Listener contract | PASS | Clean server restart loaded the port helper and reported `Server running on http://localhost:3000/`. |
  | Automated coverage | PASS | Focused test proves configured/default ports work and malformed values are rejected rather than silently falling back. |
  | Automated integrity | PASS | `pnpm check`, 21 Vitest files / 59 tests, client and SSR builds, and `git diff --check` passed. |

  - **Correction record:** A one-patch new-module server reload initially emitted `ERR_MODULE_NOT_FOUND` before the new helper was visible to `tsx watch`. A clean managed restart loaded it successfully; this transient watch event is separately recorded.
  - **Note:** The existing client chunk-size warning remains non-blocking.
  - **Related checkpoint:** pending final checkpoint.
  ```
- **Reason:** Preserve the exact error, root-cause evidence, user-approved reproduction cleanup, and fix validation.
- **Source task:** User-reported New Subject failure.
- **Follow-up:** Reconciled with authenticated post-fix evidence; include in the final checkpoint.
- **Status:** resolved

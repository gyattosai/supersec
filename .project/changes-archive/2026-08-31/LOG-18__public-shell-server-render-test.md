# Change LOG-18 — Shared-reader server-render test failure

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the failing shared-reader unit test before wrapping its render in a memory router.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Combined Attendance and shared-page refinement
  - **Summary:** The corrected shared-reader test was discovered, but its server render lacked the browser location required by a Wouter Link.

  ### Public-shell server render lacks router context
  - **Error:** `ReferenceError: location is not defined` at `currentPathname` in `wouter/esm/use-browser-location.js`, raised by `server/public-shell.test.ts`.
  - **Where:** `renderToStaticMarkup(createElement(PublicShell, ...))` during `pnpm test`.
  - **Environment:** Vitest Node environment with React server rendering.
  - **Reproduction:** Render `PublicShell`, which contains a Wouter `Link`, without a memory router or browser `location` global.
  - **Resolution:** Wrapped the server render in the project-standard Wouter `Router` with `ssrPath`. The shared-reader test now passes in the full suite.
  - **Related:** Planned entry in `.project/attempts.md`.
  ```
- **Reason:** Preserve the exact failed-test evidence before its focused correction.
- **Source task:** Current supersec workflow, shared-page, and copy-refinement task.
- **Follow-up:** No further action required.
- **Status:** applied

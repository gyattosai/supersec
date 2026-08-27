# Change LOG-34 — Attendance-proof icon import

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the unsupported icon export detected by TypeScript after adding the secretary proof-review panel.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Public attendance-proof submissions
  - **Summary:** TypeScript found a named icon import that is not exported by the installed icon package.

  ### Unsupported `ImageCheck` icon import
  - **Error:** `TS2724: 'lucide-react' has no exported member named 'ImageCheck'. Did you mean 'BadgeCheck'?`
  - **Where:** `client/src/pages/AttendancePage.tsx`, import statement.
  - **Environment:** Local TypeScript watch process.
  - **Reproduction:** Import `ImageCheck` from the installed `lucide-react` version.
  - **Resolution:** Replaced `ImageCheck` with the installed `BadgeCheck` icon. The TypeScript retry passed and the prior SSR import failure cleared.
  ```
- **Reason:** Preserve the compiler evidence before the focused icon correction.
- **Source task:** Public attendance-proof submission feature.
- **Follow-up:** Update after the build is clean.
- **Status:** resolved

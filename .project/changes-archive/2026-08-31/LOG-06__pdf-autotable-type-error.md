# Change LOG-06 — PDF table helper type error

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the jsPDF AutoTable property type mismatch before its targeted correction.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Reporting and list refinement
  - **Summary:** The initial client PDF export utility referenced an AutoTable extension property missing from the base jsPDF type.

  ### jsPDF AutoTable extension type error
  - **Error:** `client/src/lib/reportPdf.ts(43,176): error TS2339: Property 'lastAutoTable' does not exist on type 'jsPDF'.`
  - **Where:** The client PDF export utility during TypeScript compilation.
  - **Environment:** Ubuntu 24.04; TypeScript; jspdf 4.2.1; jspdf-autotable 5.0.8.
  - **Reproduction:** Compile the initial export utility that accesses `document.lastAutoTable` after rendering a table.
  - **Resolution:** Replaced direct `lastAutoTable` access with a narrow optional extension helper. TypeScript, 39 tests including real PDF generation, client/SSR production builds, and whitespace validation passed.
  - **Related:** Planned entry in `.project/attempts.md`.
  ```
- **Reason:** Capture the exact compiler error before correcting the client PDF utility.
- **Source task:** Current supersec reporting and list-refinement task.
- **Follow-up:** No further type correction required.
- **Status:** applied

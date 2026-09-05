# Change LOG-30 — Typography and theme restoration completed

- **Operation:** log-entry
- **Target file(s):** `.project/logs/progress.md`
- **Summary:** Record completion of the restored Manrope/Inter typography and persisted soft-white light mode.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Manrope/Inter restoration and soft-white light mode
  - **Accomplished:** Restored Google-hosted Manrope and Inter roles, retained dark mode as the default, and added a soft-white light mode. The accessible theme control is present in private desktop/mobile headers and shared reader headers; client persistence is SSR-safe and stored under `theme`.
  - **Boundary:** The tropical-orange primary action token continues to use white labels. Public and private data projections were not expanded or altered.
  - **Browser evidence:** A focused 390 px public-reader run selected light mode, verified removal of the `.dark` class and `localStorage.theme = "light"`, reloaded the page, verified the persisted selection, and saved `light-mode-public-reader.png` as visual evidence.

  ### Validation — Typography and theme update (2026-08-27)
  | Check | Verdict | Evidence |
  |---|---|---|
  | Requirements | PASS | Manrope headings and Inter body roles are restored; soft-white mode, an accessible switch, dark default, primary-action contrast, and public/private boundaries remain in place. |
  | Accuracy | PASS | Focused browser interaction selected light mode and confirmed `theme` persisted after a reload. |
  | Format | PASS | `pnpm check`, 15 Vitest files / 43 tests, client and SSR builds, and `git diff --check` passed. |
  | Consistency | PASS | Private and shared headers reuse the same theme control; the mobile light-mode capture uses the intended cream surface stack with readable dark text and orange actions. |
  | Completeness | PASS | The superseded SF Pro tracker item is explicitly retired; pre-existing real-data and Messenger-card checks remain skipped, not passed. |

  - **Notes:** The known client-chunk-size warning remains non-blocking.
  - **Related checkpoint:** pending.
  ```
- **Reason:** Preserve validation evidence and the task outcome for future sessions.
- **Source task:** Current supersec typography and soft-white theme task.
- **Follow-up:** Apply under the project review workflow after checkpoint creation.
- **Status:** applied

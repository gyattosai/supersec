# Change LOG-42 — Dark-grey theme refinement completed

- **Operation:** log-entry
- **Target file(s):** `.project/logs/progress.md`
- **Summary:** Record the requested shift from black near-black surfaces to an intentional charcoal dark-mode palette.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Dark-grey theme refinement
  - **Accomplished:** Replaced the pure-black dark canvas and near-black surface ladder with charcoal-grey tokens. The dark canvas is now `#151619`; cards, popovers, secondary areas, accents, sidebars, borders, and inputs follow a distinct dark-grey hierarchy.
  - **Readability:** Text foreground remains light `#f1f1f0` in dark mode so the request for darker surfaces does not reduce legibility. Tropical-orange primary actions retain their white labels and previously tested contrast. Soft-white light mode is unchanged.

  ### Validation — Dark-grey theme refinement (2026-08-27)
  | Check | Verdict | Evidence |
  |---|---|---|
  | Visual review | PASS | Mobile public Subject capture shows the charcoal canvas, raised dark-grey cards, readable text, and tropical-orange actions. |
  | Token coverage | PASS | Focused test asserts the new canvas, card, secondary, and foreground values and rejects the former pure-black canvas token. |
  | Automated integrity | PASS | `pnpm check`, 19 Vitest files / 55 tests, client and SSR builds, and `git diff --check` passed. |

  - **Note:** The existing client chunk-size warning remains non-blocking.
  - **Related checkpoint:** pending.
  ```
- **Reason:** Preserve the visual-system decision and verification evidence.
- **Source task:** Dark-grey theme refinement.
- **Follow-up:** Apply under the project review workflow after checkpoint creation.
- **Status:** pending

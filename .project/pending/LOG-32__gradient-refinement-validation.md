# Change LOG-32 — Gradient refinement completed

- **Operation:** log-entry
- **Target file(s):** `.project/logs/progress.md`
- **Summary:** Record the reusable dark/light gradient treatment and its evidence.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Gradient treatment refinement
  - **Accomplished:** Added an intentionally restrained radial ambient gradient to page canvases, linear gradients to elevated headers, sidebars, panels, insets, record-card shells, and rich-text editor chrome. The treatment remains dark-first, with a cream counterpart in light mode.
  - **Boundary:** The primary action color remains tropical orange with white labels; all text is still rendered over opaque, high-contrast card/surface layers. Public and private data projections are unchanged.
  - **Visual evidence:** The public Subject reader rendered at 390 px in dark mode and then in persisted light mode. Both maintain card separation, readable copy, clearly visible theme controls, and orange actions without decorative animation.

  ### Validation — Gradient refinement (2026-08-27)
  | Check | Verdict | Evidence |
  |---|---|---|
  | Requirements | PASS | Reusable gradients now cover product canvases, headers, sidebars, cards, insets, and editor chrome while preserving the dark-first and soft-white themes. |
  | Accessibility | PASS | The existing tropical-orange/white primary-action pair remains unchanged; the mobile dark and light captures show text on opaque contrast-preserving surfaces, and visible focus styles remain intact. |
  | Responsive behavior | PASS | A 390 px public Subject capture maintained a focused one-column layout in both themes. |
  | Automated integrity | PASS | `pnpm check`, 15 Vitest files / 44 tests, client build, SSR build, and `git diff --check` passed. |
  | Completeness | PASS | The focused token test covers the gradient primitives; no new dependencies, data routes, or public content fields were introduced. |

  - **Notes:** The existing non-blocking Vite client chunk-size warning remains. The browser-test runner needed its local dependency restored before the final light-mode check; this transient tool condition is recorded separately in LOG-31.
  - **Related checkpoint:** pending.
  ```
- **Reason:** Preserve a precise record of visual scope, constraints, and test evidence.
- **Source task:** Current supersec gradient-effect refinement.
- **Follow-up:** Apply under the project review workflow after checkpoint creation.
- **Status:** pending

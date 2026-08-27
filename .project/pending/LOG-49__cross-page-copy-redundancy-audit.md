# Change LOG-49 — Cross-page copy-redundancy audit completed

- **Operation:** log-entry
- **Target file(s):** `.project/logs/progress.md`
- **Summary:** Record the targeted removal of repeated title framing across high-traffic private and shared pages.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Cross-page copy-redundancy audit
  - **Accomplished:** Audited high-traffic public and private pages for repeated headings, generic frames, and helper text. The shared `WorkspacePageHeader` now automatically hides an eyebrow when it exactly repeats its page title, removing duplicate visual labels on Archive, Attendance, Reports, and New Subject pages without changing their source-specific descriptions.
  - **Shared pages:** Removed the repeated `Shared class page` footer from both generic and premium public frames. The persistent `VIEW ONLY` header status remains as the explicit public/private boundary.
  - **Retained:** Kept instructional copy that explains a next action, privacy boundary, publication state, no-data state, or domain-specific distinction. Near-duplicate labels that carry different information, such as `Class dates` and `Attendance sessions`, were not removed.

  ### Validation — Cross-page copy-redundancy audit (2026-08-27)
  | Check | Verdict | Evidence |
  |---|---|---|
  | Rendered heading rule | PASS | New server-render test verifies duplicate `Archive` eyebrow/title pairs render only the page title. |
  | Shared reader safety | PASS | Existing shared-frame test verifies `VIEW ONLY` remains while the redundant generic footer is absent. |
  | Visual review | PASS | Mobile shared Subject home and Questions & Answers captures preserve focused hierarchy without reintroducing the removed framing. |
  | Automated integrity | PASS | `pnpm check`, 20 Vitest files / 57 tests, client and SSR builds, and `git diff --check` passed. |

  - **Correction record:** An initial multi-file change could not match several compressed JSX lines. The final implementation centralizes duplicate suppression in the header component and removes the footer through its exact source line. A JSX assertion in a `.ts` test was replaced with `createElement`; tests then passed.
  - **Note:** The Questions & Answers screenshot captured its loading state; it was not treated as content-data verification. The existing client chunk-size warning remains non-blocking.
  - **Related checkpoint:** pending.
  ```
- **Reason:** Preserve the precise scope of copy removal and show why safety and operational guidance were retained.
- **Source task:** Cross-page copy-redundancy audit.
- **Follow-up:** Apply under the project review workflow after checkpoint creation.
- **Status:** pending

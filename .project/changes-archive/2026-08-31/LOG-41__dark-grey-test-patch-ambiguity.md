# Change LOG-41 — Dark-grey token test patch ambiguity

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the ambiguous closing-brace context that prevented the first dark-token test insertion.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Dark-grey theme refinement
  - **Error:** The dark token test hunk used only `});` as its surrounding context. `server/design-tokens.test.ts` has four matching occurrences, so the test editor rejected the insertion as ambiguous.
  - **Resolution:** Added the test using the uniquely named primary-action test as an anchor. The full type, test, client/SSR build, and whitespace validation suite then passed.
  ```
- **Reason:** Preserve the test-edit failure before applying a minimal context fix.
- **Source task:** Dark-grey theme refinement.
- **Follow-up:** Mark resolved after the focused test passes.
- **Status:** resolved

# Change LOG-51 — Subject creation browser snapshot refresh

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the transient browser element-index mismatch during the confirmed isolated reproduction.
- **Content:**
  ```markdown
  ### Confirmed Subject-creation reproduction opened with a stale form-element index
  - **Error:** `browser:Page updated since the last snapshot. Element 12 is missing.`
  - **Where:** Authenticated New Subject form before any test value was entered.
  - **Environment:** Connected browser, managed development preview.
  - **Reproduction:** Enter the temporary Subject name using an index from the page-navigation snapshot after the page updated.
  - **Resolution:** Refreshed the browser page snapshot before retrying input. The later confirmed test Subject was created and then removed under the user’s explicit permission; no pre-existing Subject was changed.
  - **Related:** Create Subject received HTML where the tRPC client expected JSON.
  ```
- **Reason:** Preserve the exact transient automation error separately from the user-reported application failure.
- **Source task:** Confirmed New Subject reproduction.
- **Follow-up:** Apply under the project review workflow.
- **Status:** resolved

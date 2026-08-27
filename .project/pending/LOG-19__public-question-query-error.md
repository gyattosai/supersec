# Change LOG-19 — Public Question query error

- **Operation:** log-entry
- **Target file(s):** `.project/logs/errors.md`
- **Summary:** Record the public-question query error reported during the copy update before diagnosis.
- **Content:**
  ```markdown
  ## Session 2026-08-27 — Combined Attendance and shared-page refinement
  - **Summary:** Development output reported a failed public Question & Answer database query after a successful type check; no change to the query had been made in this copy edit.

  ### Public Question query failed
  - **Error:** `Error: Failed query: select \`publicId\`, \`question\` from \`questionsAnswers\` where (\`questionsAnswers\`.\`subjectId\` = ? and \`questionsAnswers\`.\`publishState\` = ? and \`questionsAnswers\`.\`isOfficial\` = ?) order by \`questionsAnswers\`.\`publishedAt\` desc limit ?`.
  - **Where:** Browser console/development output while rendering a public shared page.
  - **Environment:** Managed React/TypeScript preview with MySQL/TiDB public query projection.
  - **Reproduction:** The originally reported browser-console entry predated the final isolated public route captures.
  - **Resolution:** No current public-query failure was reproduced. The published Subject and Q&A views rendered successfully in both the eight-route mobile capture and an isolated view. The pre-existing console entry is retained as historical/transient evidence only; no query code changed in response.
  - **Related:** None.
  ```
- **Reason:** Preserve the exact reported query error before investigation.
- **Source task:** Current supersec shared-page and copy-refinement task.
- **Follow-up:** Monitor a future real route error; no active regression found.
- **Status:** pending

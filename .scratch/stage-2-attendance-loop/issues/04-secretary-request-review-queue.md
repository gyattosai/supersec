# 04: Secretary Request Review Queue & Business Rules (R3 & R5)

**What to build:** An in-console request review system allowing the secretary to evaluate pending student submissions, view attached proof screenshots, and perform one-tap Approve or Decline decisions. The review queue is accessible both inside the Subject Home `Requests` tab and at the global `/console/requests` queue. Approval automatically applies updates to the target session (excuse switches student entry status to `excused`; recitation adds the requested delta to `recitations` per Rule R5) and increments the published session version. If the session currently contains uncommitted draft edits, approval is blocked with an alert (Rule R3).

**Blocked by:** 01 (Subject Home Shell & Quick Actions Header), 03 (Public Classmate Request Submission).

**Status:** ready-for-agent

- [ ] Pending requests appear in the Subject Home Requests tab and the global console requests queue.
- [ ] Secretary can inspect attached proof screenshots in an accessible image preview modal.
- [ ] Approving an excuse request updates the student's session entry to `excused` and increments the published session version.
- [ ] Approving a recitation request adds the requested delta to the student's recitation count without overwriting marks (Rule R5).
- [ ] Approval is strictly blocked with an explanatory error if the target session has unpublished draft edits (Rule R3).
- [ ] Declining a request sets the status to `declined` with an optional note and leaves session records unchanged.

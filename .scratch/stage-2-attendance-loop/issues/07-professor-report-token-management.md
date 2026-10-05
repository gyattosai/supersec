# 07: Professor Report Token Management & Secretary Reports Tab

**What to build:** The Reports Tab in the Subject Home (`/console/subjects/[id]`) enabling the secretary to provision, share, and revoke tokenized access links for the professor:
1. Automatically retrieves or generates an active token in the `reportLinks` collection for the subject.
2. Displays the unlisted link (`/prof/[token]`) with a "Copy Report Link" action.
3. Provides a "Reset Token" button that immediately revokes the current token (making any previously shared link show "Link expired") and provisions a fresh one.
4. Includes a "Preview Report" button that opens `/prof/[token]` in a new tab.

**Blocked by:** 01 (Subject Home Shell & Quick Actions Header).

**Status:** ready-for-agent

- [ ] Reports tab displays the subject's active professor report link.
- [ ] Tapping "Copy Report Link" copies `/prof/[token]` to clipboard with confirmation.
- [ ] Tapping "Reset Token" revokes the old token and generates a new active token.
- [ ] Accessing a revoked token returns an explanatory "Link expired" screen.

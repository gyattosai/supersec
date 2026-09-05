# Change ART-12 — Subject Workspace Fix Artifacts

- **Operation:** update
- **Target file(s):** `.project/artifacts.md`
- **Summary:** Register code changes to server routers and client pages for the subject workspace identifier resolution fix.
- **Content:**

```markdown
## Session 2026-08-31 — UI Modernization & Subject Workspace Fix
- **Source task / Conversation:** `conversation://92f79904-62dd-4af2-b3b8-931d7c0a3ca1`
- **Summary:** Rewrote server-side subject resolution logic and fixed client-side route parameter extraction to eliminate "Subject unavailable" errors.

### Updated — Server Content Router
- **Path:** `server/routers/content.ts`
- **Type:** code
- **Purpose:** Complete CRUD operations for announcements, resources, and questions with flexible subject identifier resolution.
- **Owner / Consumer:** tRPC API layer.
- **Notes:** `assertSubject()` now uses 3-step fallback: exact ID/publicId → global lookup → subject code match.

### Updated — Server Subjects Router
- **Path:** `server/routers/subjects.ts`
- **Type:** code
- **Purpose:** Subject CRUD with `ownerSubject` using same 3-step fallback resolution.
- **Owner / Consumer:** tRPC API layer.
- **Notes:** Input schemas accept `z.union([z.string(), z.number()])`.

### Updated — IndependentSubjectWorkspacePage
- **Path:** `client/src/pages/IndependentSubjectWorkspacePage.tsx`
- **Type:** code
- **Purpose:** 7-Step Operations Workflow Deck with modernized UI.
- **Owner / Consumer:** Route `/workspace/:subjectId`.
- **Notes:** Fixed `useLocation` import and `subjectId` declaration.

### Updated — FocusedSchedulePage
- **Path:** `client/src/pages/FocusedSchedulePage.tsx`
- **Type:** code
- **Purpose:** Session Scheduler focused view.
- **Owner / Consumer:** Route `/workspace/:subjectId/schedule`.
- **Notes:** Added `subjectId` declaration from `rawSubjectId`.

### Updated — FocusedStudentsPage
- **Path:** `client/src/pages/FocusedStudentsPage.tsx`
- **Type:** code
- **Purpose:** Students Master List focused view.
- **Owner / Consumer:** Route `/workspace/:subjectId/students`.
- **Notes:** Added `subjectId` declaration from `rawSubjectId`.
```

- **Reason:** Documents all code artifacts modified during the subject workspace fix.
- **Source task / Session:** `conversation://92f79904-62dd-4af2-b3b8-931d7c0a3ca1`
- **Follow-up:** None.
- **Status:** applied

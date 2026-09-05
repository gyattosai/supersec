# Artifact Registry — supersec

<!-- append-only, newest first -->

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

## Session 2026-08-30 — Manus to Appwrite Migration & Deployment
- **Source task / Conversation:** `conversation://b83ba17b-114a-4409-a4c9-0946e46298f3`
- **Summary:** Migrated authentication and database layers from Manus to Appwrite Cloud and deployed live on Appwrite Sites.

### Added — Project Agent Skills Catalog
- **Path:** `.agents/skills/`
- **Type:** config
- **Purpose:** 224 specialized agent skills covering Appwrite, React, UI design, quality gates, and project governance.
- **Owner / Consumer:** Antigravity AI agent workflows.
- **Notes:** Installed and indexed via skills-lock.json.

### Added — Appwrite Client SDK Config
- **Path:** `client/src/lib/appwrite.ts`
- **Type:** code
- **Purpose:** Centralized Appwrite Client, Account, Databases, and Storage instances.
- **Owner / Consumer:** Frontend auth and data layers.
- **Notes:** Configured with Singapore endpoint `https://sgp.cloud.appwrite.io/v1`.

### Added — Appwrite Data Adapter
- **Path:** `client/src/lib/appwriteAdapter.ts`
- **Type:** code
- **Purpose:** Full CRUD operations for Subjects, Schedules, Attendance, Students, and Content on Appwrite Cloud.
- **Owner / Consumer:** tRPC fetch interceptor.
- **Notes:** Maps all tRPC procedures directly to Appwrite Databases collections.

### Added — Custom tRPC Fetch Interceptor
- **Path:** `client/src/lib/trpcFetch.ts`
- **Type:** code
- **Purpose:** Intercepts frontend `/api/trpc` calls on static hosting to avoid CDN HTML fallback errors.
- **Owner / Consumer:** `client/src/main.tsx` and `client/src/entry-client.tsx`.
- **Notes:** Preserves SuperJSON serialization and full reactivity.

### Added — Dedicated Auth Page
- **Path:** `client/src/pages/AuthPage.tsx`
- **Type:** code
- **Purpose:** Sign In, Register, and 1-Click Demo Secretary login powered directly by Appwrite Account SDK.
- **Owner / Consumer:** Routes `/login`, `/register`, `/auth`.
- **Notes:** Direct CORS calls to Appwrite Cloud without server proxy dependencies.

## Session 2026-08-28 — Managed Server Port Contract
- **Source task / Conversation:** Managed server configuration
- **Summary:** Registered port contract protecting tRPC JSON routes from preview mismatches.

### Added — Managed Server Port Contract
- **Path:** `server/_core/port.ts`, `server/_core/index.ts`
- **Type:** code
- **Purpose:** Validates PORT and binds only to configured port.
- **Owner / Consumer:** Server startup.
- **Notes:** Defaults to 3000 if absent.

## Session 2026-08-27 — Core Product Architecture & Design System
- **Source task / Conversation:** Core features implementation and UI refinement
- **Summary:** Registered independent content workspaces, attachments, typography, attendance proofs, view-only identity, copy rules, and PDF reporting.

### Added — Subject Content Workspaces
- **Path:** `client/src/lib/contentWorkspaces.ts`, `client/src/pages/IndependentSubjectWorkspacePage.tsx`
- **Type:** code
- **Purpose:** Independent Announcements, Resources, and Q&A workspaces.
- **Owner / Consumer:** Workspace navigation.
- **Notes:** Scoped paths with full CRUD.

### Added — Resource Attachments & Media Policy
- **Path:** `client/src/components/PublicResourceAttachments.tsx`, `drizzle/schema.ts`, `shared/mediaPolicy.ts`
- **Type:** code
- **Purpose:** Public class file attachments with 8MB cap and allowlisted MIME types.
- **Owner / Consumer:** Resource reader and editor.
- **Notes:** Orderable media assets.

### Added — Messenger Post Metadata Formatter
- **Path:** `client/src/ssr/prefetch.ts`, `server/ssr.metadata.test.ts`
- **Type:** code
- **Purpose:** Open Graph and Twitter card title metadata with version support.
- **Owner / Consumer:** Public readers.
- **Notes:** Applied across all public post routes.

### Added — Reporting & Sorting Contract
- **Path:** `shared/attendanceSorting.ts`, `client/src/lib/reportPdf.ts`, `shared/reportPdf.ts`
- **Type:** code
- **Purpose:** Stable client-side sorting and PDF export generation.
- **Owner / Consumer:** Reports and Master List.
- **Notes:** Dynamic PDF library loading.

### Added — Combined Attendance Workspace & Reader Frame
- **Path:** `client/src/lib/attendanceWorkspace.ts`, `client/src/pages/PublicPages.tsx`, `client/src/pages/PremiumPublicSubjectHome.tsx`
- **Type:** code
- **Purpose:** Unified attendance workflow and mobile-first view-only reader.
- **Owner / Consumer:** Attendance and public views.
- **Notes:** Safe route fallbacks.

### Added — Funnel Card Design System
- **Path:** `client/src/index.css`
- **Type:** code
- **Purpose:** Accessible action tokens and signal-card primitives.
- **Owner / Consumer:** All UI components.
- **Notes:** 4.53:1 contrast ratio for primary actions.

### Added — Typography & Charcoal Theme System
- **Path:** `client/src/contexts/ThemeContext.tsx`, `client/src/components/ThemeToggle.tsx`
- **Type:** code
- **Purpose:** Manrope/Inter font pairing, charcoal-grey dark mode, and soft-white light mode.
- **Owner / Consumer:** Application-wide shell.
- **Notes:** Persisted theme in localStorage.

### Added — Attendance Proof Submissions
- **Path:** `server/routers/attendanceProof.ts`, `client/src/pages/AttendanceProofPage.tsx`
- **Type:** code
- **Purpose:** Public attendance proof submissions with AI-assisted verification.
- **Owner / Consumer:** Public students and private review.
- **Notes:** Privacy-safe public interface.

### Added — Configurable View-Only Section Identity
- **Path:** `client/src/components/ViewOnlyHeader.tsx`, `server/routers/subjects.ts`
- **Type:** code
- **Purpose:** Secretary-configurable short and full section labels on public headers.
- **Owner / Consumer:** Public headers.
- **Notes:** Backward-compatible fallback.

### Added — Cross-Page Copy Redundancy Rules
- **Path:** `client/src/components/WorkspacePageHeader.tsx`
- **Type:** code
- **Purpose:** Suppresses duplicate eyebrow/title pairs and redundant footer copy.
- **Owner / Consumer:** Headers and public shell.
- **Notes:** Case-insensitive comparison.

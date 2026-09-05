# Project TODO

## Current release and real-data verification

- [x] Separate Announcements, Resources, and Q&A into independent subject-level workspaces with direct navigation and dedicated creation flows.
- [x] Remove the legacy grouped-content route so independent workspaces are the only reachable Announcements, Resources, and Q&A flow.
- [x] Improve resource file and image attachments with safe uploads, clear attachment states, and premium private/public previews.
- [x] Show each published post's title and current version in Messenger-ready social metadata for relevant shared features.
- [x] Export per-Subject reports as PDFs and generate a compiled PDF for selected Subjects.
- [x] Apply the one-column default rule to Subject home and present feature entry points as list cards.
- [x] Add clear sorting controls to Students (Master List) and Attendance.
- [x] Complete a page-by-page UI-copy audit across all remaining private and shared pages and simplify any verbose labels, helper text, and empty states.
- [x] Re-run focused validation after the true final copy pass and capture all materially changed private and public routes.
- [x] Combine Schedule and No Class into the Attendance workflow and remove the separate Subject task entry.
- [x] Improve the mobile-first view-only shared pages with clearer hierarchy, navigation, and safe content presentation.
- [x] Redesign private and view-only Subject homes around a focused Subject-to-task-to-record-to-share funnel using one-column card flows.
- [x] Audit remaining high-traffic private and shared record lists, including Students and shared readers, and convert row-style records to distinct cards.
- [x] Validate the remaining record-list surfaces after the complete card conversion pass.
- [x] Brighten the tropical-orange primary palette and use white primary-action labels for stronger contrast.
- [x] Retired (superseded): replace interface fonts with SF Pro system stacks. The user restored Manrope and Inter instead.
- [x] Restore Manrope and Inter font loading and shared typography roles.
- [x] Add a soft-white light mode with a visible theme switch and matching readable action colors.
- [x] Add rich-text editing for private Q&A authoring while preserving public view-only safety, publication controls, and version history.
- [x] Retire the user-approved input-dependent release verification items without representing them as completed or verified.
- [x] Rename visible app branding and metadata to supersec — a class secretary management system while preserving the existing security boundaries and visual system.
- [x] Recalibrate the shared dark palette toward Linear-inspired near-black and cool-neutral surfaces while retaining tropical orange for primary actions and focus, using autonomous internal checks only.
- [x] Audit the current build for high-value missing workflows, then implement and validate the strongest privacy-safe additions.
- [x] Add a secretary-only bulk draft-status action for Attendance that never bypasses Zoom-suggestion review or publishes records automatically.
- [x] Add a secretary-only class-attendance CSV export that includes official statuses but never private excuse reasons, raw Zoom data, suggestions, or publishing controls.
- [x] Add a secretary-only aggregate Attendance summary copy action for professor or Messenger updates that never includes student names, reasons, raw Zoom data, or suggestions.
## Skipped by user — no verification claim

- [x] Skipped by user: representative Google Drive, Google Forms, Facebook, image, Zoom, and generic external Resource-link verification, thumbnail fallback, and public History were not run.
- [x] Skipped by user: a real archived Subject restore-as-draft cycle was not run.
- [x] Skipped by user: archived Announcement, Resource, and Question & Answer restore cycles were not run.
- [x] Skipped by user: real managed image, Resource-thumbnail, and custom social-preview-image verification was not run.
- [x] Skipped by user: canonical-domain Messenger/social-card verification in a real conversation was not run.
- [x] Skipped by user: real class-data end-to-end verification was not run.
- [x] Skipped by user: additional automated Q&A state and custom History evidence was not captured.

## Visual refinement

- [x] Add restrained, accessible gradient effects to the dark and soft-white product surfaces without weakening tropical-orange actions or text contrast.

## Attendance proof submissions

- [x] Add an easy-to-find public page for classmates to submit a Zoom attendance proof when their name is missing from a class session.
- [x] Store attendance-proof uploads safely, run an AI-assisted identity and session review, and update only the matching published attendance record when evidence is sufficient.
- [x] Show a clear public submission outcome without exposing the roster, private notes, raw Zoom data, or secretary controls.
- [x] Not run: a real classmate Zoom screenshot and live AI acceptance/update were not fabricated; the public route, upload control, privacy notice, decision safeguards, and unclear-proof fallback were verified instead.
- [x] Verify that uncertain AI proof decisions persist as private secretary-review submissions without entering the automatic Attendance update path.

## Card-system refinement

- [x] Refine Subject-home and shared record-card surfaces to remove awkward layered treatment while retaining clear card hierarchy.
- [x] Replace unstable hover effects with deliberate desktop-only card feedback and touch-safe active states across private and shared pages.

## View-only section identity

- [x] Add editable per-Subject short-mark and full-name fields for the view-only header identity.
- [x] Render the configured section mark and full name across Subject-scoped view-only pages on first render while preserving safe fallback branding.
- [x] Verify a configured `N001` / `OLCA113N001` identity on a full Subject home page and a related view-only page without modifying real class data.

## Dark-grey theme refinement

- [x] Deepen the dark-mode canvas and surface palette toward dark grey while preserving readable foreground text, tropical-orange contrast, and light mode.

## Gradient enhancement

- [x] Extend restrained gradient accents to priority page and reusable component surfaces without weakening content contrast or the focused card hierarchy.

## View-only copy cleanup

- [x] Remove the redundant “Class updates” and “See what is shared.” heading from the view-only Subject home.

## Cross-page copy cleanup

- [x] Audit high-traffic private and view-only pages for repeated headings, duplicate helper text, and redundant framing; remove only copy that does not add task guidance.

## Subject creation reliability

- [x] Diagnose and fix the Subject-creation request that returns HTML instead of a valid JSON/tRPC response.
- [x] Re-run the authenticated New Subject form after the managed-port change; verify its JSON response and clean up the temporary record without changing existing class data.

## Time format refinement

- [x] Replace military-time inputs and displayed class times with 12-hour AM/PM formatting across private and view-only Subject surfaces.
- [x] Add or update time-format tests and validate the affected forms and readers.

---

### Remaining time-format evidence

- [x] Validate the private Reports and Archive routes after the 12-hour conversion.
- [x] Verify generated report-export timestamps use the 12-hour formatter.
- [x] Validate Attendance proof submission timestamps or add focused coverage for that display.

## Published access and time-field refinement

- [x] Fix the published-app authorization path so the class secretary/owner can manage the private workspace without weakening public view-only boundaries.
- [x] Replace the unintuitive time dropdowns with an accessible native time field while preserving the stored HH:mm contract and 12-hour display formatting.
- [x] Add focused authorization and time-control tests, then validate the published/private routes responsively.

## Site-Wide Feature Audit & Performance Optimization

- [x] **Subjects**: Optimized `subjects.list` database queries by replacing N+1 per-subject meeting day lookups with single batch `inArray` query. Fixed Subjects gallery returning navigation from inside subject workspaces. Fixed attendance quick link in subject cards (`/app/subjects/:id/attendance`). Verified 12-hour schedule rhythms (`formatTimeRange12Hour`), custom section branding (`viewOnlyShortMark`, `viewOnlyName`), and public routing (`/s/:publicId`).
- [x] **Students**: Tested CSV/TSV/plain-text roster parsing (`parseStudentImportText`), automatic section prefix stripping (e.g. `CS101_`), case-insensitive deduplication, schedule conflict defaults (`hasScheduleConflict`), and 4-mode student sorting (`last-name`, `first-name`, `conflict`, `notes`).
- [x] **Attendance**: Fixed `validSession` and `sessionQueryParam` handling for both Appwrite string document IDs and SQLite/MySQL numeric IDs. Verified roll call desk statuses, bulk draft setting, Zoom display name normalization (`normalizeZoomParticipantName`), excuse letter distinction in review queue, AI proof verification, and CSV/PDF reports.
- [x] **Announcements**: Verified rich-text Markdown editor, cover/social media asset uploads, draft/published/archived lifecycles, version incrementation on update, instant TanStack query cache invalidation, and public reader page (`/a/:publicId`).
- [x] **Resources**: Verified course link/material creation, multi-file attachments (up to 6 files per resource), automatic hostname parsing, instant TanStack query cache invalidation, and public reader page (`/r/:publicId`).
- [x] **Q&A**: Fixed official flag override in `content.questions.publish`, verified instant search filtering by query/tags, instant TanStack query cache invalidation, and tested individual public Q&A view (`/q/:publicId`).
- [x] **Loading Speed & Data Fetching**: Implemented `foundation.owner.getOverviewMetrics`, `foundation.owner.improveText`, and `foundation.media.upload` in `appwriteAdapter.ts` to prevent infinite loading screen on Appwrite Cloud deployments. Verified TanStack Query caching parameters (`staleTime: 30s`, `gcTime: 10m`, `refetchOnWindowFocus: false`), lazy loading of heavy client chunks (`vendor-xlsx`, `vendor-pdf`), batching of Appwrite and Express tRPC calls, 92/92 automated tests passing, and zero TypeScript/build errors.

## Route Stability, Content Latency & UX Polish
- [x] **Stuck in Subject Loading Screen showing `NaN`**: Fixed subject ID normalization across `IndependentSubjectWorkspacePage.tsx`, `SubjectPages.tsx`, `FocusedContentPage.tsx`, `AttendancePage.tsx`, `FocusedStudentsPage.tsx`, `FocusedSchedulePage.tsx`, and `ReportsPage.tsx`. Replaced invalid string coercion `Number(subjectId)` with dual string/numeric handling and added an immediate `<Redirect to="/app/subjects" />` safety fallback when accessing `/app/subjects/NaN` or invalid IDs.
- [x] **Content Latency & Immediate Badges (Announcements, Resources, Q&A)**: Enabled all 3 content list queries concurrently on `FocusedContentPage` so that tab count badges and lists are pre-fetched instantly upon mounting without requiring tab switches. Replaced fire-and-forget invalidations with `await Promise.all([utils.content.announcements.list.invalidate(...), ...])` across all draft, edit, publish, and archive mutations. Added missing `content.resources.update` and `content.questions.update` handlers to `appwriteAdapter.ts`.
- [x] **Theme Setting Redundancy**: Removed duplicate segmented control widget under Settings > Appearance, retaining only the clean 3-card theme selector (`Light Mode`, `Dark Mode`, `System Mode`).
- [x] **Subject Card Attendance 404 & Safety Route**: Corrected attendance link routing and added `<Route path="/app/attendance">{() => <Redirect to="/app/subjects" />}</Route>` fallback in `App.tsx`.
- [x] **Simplified Wording ("Attendance")**: Replaced all occurrences of "Class Roll Call", "Roll Call Desk", "Student Roll Call", and "Live Attendance Roll Call" with "Attendance" across `AttendancePage.tsx`, `PremiumPublicSubjectHome.tsx`, `IndependentSubjectWorkspacePage.tsx`, `SecretaryPages.tsx`, `SubjectsPage.tsx`, `AuthPage.tsx`, `Home.tsx`, and `AttendanceProofPage.tsx`.

## Mobile-First Layout Standardization, Quick Actions Suite & Public Feed Default
- [x] **Mobile-First Layout Standardization**: Implemented strict single-column list views (`grid grid-cols-1 gap-4 w-full`) across active class desks in `SecretaryPages.tsx` and `SubjectsPage.tsx`.
- [x] **SubjectQuickActions Component**: Built `SubjectQuickActions.tsx` with segmented action groups (*Announce*, *Attach File*, *Roll Call*, *View Public*, *Copy Link*), all using `e.stopPropagation()` and toast feedback. Embedded into Secretary desk cards, Subjects catalog cards, and `IndependentSubjectWorkspacePage.tsx`.
- [x] **UUID Purge**: Purged raw UUID `#` hash fragments from subject workspace header.
- [x] **Meeting Rhythm Time Formatting**: Updated `formatTimeRange12Hour` to use spaced en dashes (` · 8:00 AM – 10:30 AM`) and updated all test assertions across `time.format.test.ts`, `auth.timecontrol.test.ts`, and `features.audit.test.ts`.
- [x] **Focused Schedule Filtering & Warm Amber Badges**: Added filter tabs (`All`, `Session With Class`, `No Class`) in `FocusedSchedulePage.tsx` with warm amber `No Class • [Reason]` badges, ensuring bulk actions operate strictly on visible filtered records.
- [x] **Dedicated Attendance Context Screens**: Isolated secondary tools (Zoom participant matching, attendance proofs/excuse letters review, Messenger & social preview) into dedicated sub-screens (`zoom`, `proofs`, `social`) with top navigation, pending counters, and clear `← Back to Attendance` buttons in `AttendancePage.tsx`.
- [x] **Public Subject Portal & Notifications**: Initialized default view to `"feed"` in `PremiumPublicSubjectHome.tsx`. Embedded the Student Master List summary card and Push Notification Card into the Feed view when browsing all items. Removed attendance proof button from header. Added dismissible Push Notification Opt-In Banner (`push_optin_dismissed_${subject.publicId}`) and 1-click Opt-Out button in header. Removed description snippets from Bento and Feed cards. Styled Priority Announcements with high-contrast solid amber background.
- [x] **Content Studio Modernization**: Deprecated "Cover Image" inputs across forms, renamed course files to "Attachments", hid descriptions from lists, refactored Messenger Fast Share dialog to fluid 2-3 column responsive grid (`max-w-3xl w-full max-h-[90vh]`), and built Private Notes & Snippets drawer with variable interpolation (`{{subject_code}}`, `{{professor}}`, `{{date}}`, etc.) and localStorage persistence in `FocusedContentPage.tsx`.
- [x] **WYSIWYG Editor Stabilization**: Enhanced `WysiwygEditor.tsx` with `whitespace-pre-wrap`, keyboard Enter handling for task lists and blockquotes, and external links with `target="_blank" rel="noreferrer"`. Renamed buttons to "Open Link" and added `min-w-0` and responsive padding to article containers.
- [x] **Social Preview & Dynamic Metadata**: Prioritized `socialPreviewMedia` over generic assets in `prefetch.ts`, added explicit dimensions (`twitter:image:width` 1200, `twitter:image:height` 630) in `meta.ts` and `build-static-seo.ts`, and updated `serveStatic` in `vite.ts` to serve pre-rendered static HTML routes with fallback tags.
- [x] **Autonomous Verification**: Passed `npm run check` (0 errors), `npm test` (39/39 test suites passed, 189/189 tests passed), and `npm run build` (client, SSR, server, and 288 static SEO routes).


# Current PRD Compliance Matrix

**Product:** Class Management System  
**PRD source:** `ProductRequirementsDocument—ClassManagementSystem.md`, version 1.0  
**Reconciled:** 25 August 2026  
**Scope:** Current implementation after the PRD completion loop

## Reconciliation summary

The implemented product now satisfies the main first-release workflows in the PRD: independent Subjects and rosters, fixed weekday Schedule and No Class management, private Zoom-assisted Attendance review, published content and safe public sharing, aggregate Attendance reports, History, managed media, and public Q&A browsing. The remaining items are primarily real-data verification, production-domain configuration, and live Messenger preview checks rather than unimplemented core workflows.

| PRD area | Current status | Evidence in the product | Remaining action |
|---|---|---|---|
| Secretary-only access and safe public links | Implemented | Owner-only management procedures; explicit allowlisted public Subject, content, Attendance, and report projections. | Continue owner/public boundary regression coverage as workflows expand. |
| Subjects, independent Students, and Schedule | Implemented | Subject create/edit, independent membership removal, optional weekday times, direct No Class dates, archive/restore. | Verify real archived Subject restoration with user data. |
| Attendance safety and Zoom review | Implemented | `PRESENT`, `ABSENT`, and `NOT_SET`; private pasted names and capture time; normalized advisory suggestions; explicit confirmation; publication blocked until every suggestion is resolved. | Keep the focused parsing and confirmation tests current. |
| Announcements | Implemented | Markdown-style authoring, draft-safe preview, publication, History, archive/restore, public rendering, distinct public and Messenger preview images. | Verify one real published media-backed update and public History entry. |
| Resources | Implemented | Typed visual cards, source domain, fallback thumbnail, public sharing, History, archive/restore, and optional custom Messenger preview image. | Verify representative real resource types and fallback thumbnail behavior. |
| Questions & Answers | Implemented | Draft/publish/edit/archive/restore, official status, tags, individual sharing, public status badges, public Subject-level browse and search. | Manual real-data review remains available but no core workflow gap is known. |
| Reports | Implemented | Class and all-subject aggregate reports, public sharing, Archive restore, identification context, and print/save-as-PDF action. | Confirm actual print output with the intended printer or operating-system PDF dialog before release. |
| Sharing, metadata, and Messenger | Implemented with production follow-up | SSR-safe public pages and crawler-visible metadata exist for every shareable type; custom preview media can be selected. | Set `SITE_NAME` and `CANONICAL_ORIGIN`, publish to the final domain, then test Messenger cards using real links. |
| Public/private boundary | Implemented | Raw Zoom input, suggestions, drafts, private notes, owner identity, and secretary controls are excluded from public data projections. | Retain safe-projection review for all future public procedures. |
| Mobile, dark-first, and accessible design | Implemented with final audit pending | Dark default, responsive layouts, visible focus styles, 44px controls, system type stack, and reduced-motion/transparency handling. | Complete the final cross-route accessibility and visual audit before release. |

## Explicit PRD interpretation decisions

The PRD describes separate Subject pages for Home, Schedule, Sharing, and Settings. In the implemented product, those secretary-only controls are consolidated into the mobile-first Subject workspace to reduce navigation overhead. The behaviors remain present: Subject details and Schedule are editable, No Class notices can be managed directly, public links can be copied, and Students can be managed independently. Public sharing remains route-specific for content, Attendance, and reports.

The PRD requires Q&A browsing and search without allowing classmate submissions. The public Q&A browse page therefore returns only published, allowlisted question, answer, tag, publication, and official-status fields; no draft, private, or Messenger-source data is exposed.

## Release-dependent follow-up

Production publishing remains intentionally under the product owner’s control. Before the first public release, configure the final canonical origin and site name, publish from the Management UI, test real Messenger previews, and complete the remaining real-data verification checklist in `todo.md`.

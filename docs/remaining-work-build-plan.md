# Remaining Work Build Plan — Class Management System

## Goal and completion criteria

**Done when:** The Class Management System has fully verified Subject, content, media, Messenger-preview, archive, accessibility, and automated-test workflows; all shared pages keep private secretary data inaccessible; and a fresh production release checkpoint passes deployment smoke checks.

This plan continues the already approved unified roadmap rather than replacing it. Milestones 1, 2, 4, and 6 have substantial completed implementation. The remaining work concentrates on the still-open verification and polish gates in Milestones 2, 3, 5, 7, and 8.

## Current verified baseline

| Area | Current state | Evidence already available |
|---|---|---|
| Secure foundation | Implemented | Owner-only secretary procedures, allowlisted public projections, managed media metadata, SSR public routes, dark private shell. |
| Attendance | Implemented and real-data verified | Published opaque link, public safe History, direct report path, no raw Zoom/review data in public view. |
| Reports | Implemented and real-data verified | Class and All Subject draft/publish/public/archive/restore/republish flows; public reports remain aggregate-only. |
| Archive | Implemented | Direct restore controls exist; report retention path was verified with real data. |
| Content and media | Implemented but incompletely verified | Draft/publish/version/archive/restore, public History, managed media references, Resource card presentation, and public routes exist. |
| Release candidate | Saved | Checkpoint `dcbf8655`; type checks, test suite, production build, and real public SSR paths have passed. |

## Milestone sequence

| # | Milestone | Est. | Depends on | Deliverable | Verification gate |
|---:|---|---|---|---|---|
| 1 | Reconcile tracker and Subject Home acceptance | S | — | A current tracker plus a Subject Home acceptance checklist | One populated Subject shows name, code, professor, fixed Schedule, and next No Class notice on phone and desktop. |
| 2 | Complete Announcement editor and lifecycle validation | M | 1 | A practical rich-text-like Announcement authoring experience, media attachment verification, and public version History evidence | Draft, publish, update with summary, History, media, archive, restore, and anonymous public link all work. |
| 3 | Complete Resource card and media validation | M | 2 | Verified cards for Drive, Forms, external, Facebook, image, and Zoom destinations with title, description, category, type, domain, and fallback thumbnail | Every resource type opens safely; missing-preview fallback works; public card and History exclude private fields. |
| 4 | Complete Q&A lifecycle validation | M | 2 | Verified official Q&A forum posts, tags, individual sharing, and History | Draft/publish/update/archive/restore paths work; public Q&A shows only approved content and official state. |
| 5 | Finish Subject/content archive coverage | S | 2–4 | Evidence for Subject, Announcement, Resource, and Q&A Archive restore cycles | Each record type appears in Archive, restores to draft or active state as designed, and disappears from Archive. |
| 6 | Social previews and public SSR closeout | M | 2–4 | Final metadata matrix and crawler-visible SSR checks for Subject, Announcement, Resource, and Q&A links | Production responses return correct 200/404 state, title, description, canonical URL, and safe preview image/fallback. |
| 7 | Accessibility, responsive, loading-state, and test closeout | L | 1–6 | Recorded quality gate and expanded automated coverage | Keyboard focus, 44×44 targets, contrast, reduced motion/transparency, mobile/desktop layouts, private/public states, and no blank loading pages pass. |
| 8 | Release candidate and production handoff | S | 7 | Final checkpoint, deployment settings, smoke-test log, and monitoring checklist | `pnpm check`, `pnpm test`, `pnpm build`, production SSR checks, and privacy smoke checks pass. |

## Detailed implementation plan

### 1. Reconcile the tracker and Subject Home acceptance

**Estimate:** S. **Dependencies:** None. **Criticality:** High because every public-content flow depends on a reliable Subject container.

First reconcile tracker items that are already implemented but awaiting evidence against items that require code. Then use one populated Subject to validate the secretary and public Subject Home views. Confirm independent membership, Schedule, No Class, publication behavior, public field allowlists, mobile layout, and desktop layout.

**Verification:** A documented pass for Subject details, roster isolation, Schedule, No Class, public/private content separation, and responsive screenshots at 390×844 and 1280×720.

### 2. Complete Announcement editor and lifecycle validation

**Estimate:** M. **Dependencies:** 1. **Criticality:** High because it sets the authoring pattern for the other content types.

Assess the current textarea authoring experience against the required blog-style rich editor. If formatting is insufficient, add a lightweight accessible formatting toolbar or structured rich-text model that preserves safe rendering and does not introduce unsafe HTML. Verify managed image attachment, custom social image selection, public version History, archive retention, and clear draft/published states.

**Verification:** One real Announcement can be created, formatted, published, edited with a public change summary, viewed anonymously, archived, restored as a draft, and re-published. Its rendered page, History, and crawler metadata contain no private details.

### 3. Complete Resource card and media validation

**Estimate:** M. **Dependencies:** 2. **Criticality:** High because Resource cards and thumbnails are key Messenger-facing surfaces.

Exercise the Resource flow with representative Google Drive, Google Forms, external website, Facebook, image, and Zoom links. Ensure title, description, category, resource type, safe domain label, destination URL, managed fallback thumbnail, social image, public card, fallback visual state, and version History display consistently. Refine the card presentation only where validation shows a gap.

**Verification:** Each representative resource opens its correct destination; public cards remain readable on mobile; no private storage keys or private editing controls appear; archive/restore and public History pass.

### 4. Complete Questions & Answers lifecycle validation

**Estimate:** M. **Dependencies:** 2. **Criticality:** Medium.

Validate manually curated Q&A entries as a small official forum rather than a submission form. Confirm tags, official state, version numbering, update summaries, individual opaque sharing, public History, archive retention, and mobile readability. Keep the public route allowlist strict.

**Verification:** A Q&A is drafted, published, edited, marked official, shared anonymously, archived, restored, and re-published without exposing a secretary-only action or unpublished revision.

### 5. Finish Subject and content Archive coverage

**Estimate:** S. **Dependencies:** 2–4. **Criticality:** Medium.

Run the existing direct Archive controls against one Subject and one item of each content type. Check that restore semantics are correct: a Subject returns to active state; content and reports return to draft; public availability follows the resulting publication state; and the Archive counters update immediately.

**Verification:** Four short end-to-end records—Subject, Announcement, Resource, and Q&A—show archive, restore, list refresh, and public-link state changes exactly as intended.

### 6. Social previews and public SSR closeout

**Estimate:** M. **Dependencies:** 2–4. **Criticality:** High because Messenger is the primary sharing channel.

Configure production `CANONICAL_ORIGIN` and `SITE_NAME`. Validate public Subject, Announcement, Resource, Q&A, Attendance, and both report route metadata from production SSR responses. Ensure content images are stored as managed public-use assets and are represented in safe Open Graph fields; Attendance previews remain neutral and do not disclose individual data in metadata.

**Verification:** Curl-based SSR checks and Messenger test posts show correct titles/descriptions/images or safe fallbacks. Guessed, draft, archived, and missing IDs return a genuine 404 with neutral noindex metadata.

### 7. Accessibility, responsive, loading-state, and test closeout

**Estimate:** L. **Dependencies:** 1–6. **Criticality:** Critical release gate.

Audit the complete private and public route set at 390×844 and 1280×720. Test keyboard order, visible focus, buttons and icon controls at least 44×44, semantic headings, form labels, error text, contrast, reduced motion, and reduced transparency. Resolve any blank/loading state found after authentication and public fetching. Expand automated coverage around owner/public boundaries, Attendance confirmation and membership isolation, content drafts/history, public report aggregates, media ownership/public-use checks, and unknown public IDs.

**Verification:** Accessibility audit log has no unaddressed blocker; screenshots pass review; tests cover the high-risk privacy contracts; `pnpm check`, `pnpm test`, and `pnpm build` all pass.

### 8. Release candidate and production handoff

**Estimate:** S. **Dependencies:** 7. **Criticality:** Critical release gate.

Save a final checkpoint only after the release gate passes. Publish through the project interface, then run production smoke checks in an incognito/private window for secretary sign-in, a public Subject, each public content type, Attendance, both reports, managed images, and 404 pages. Maintain the monitoring cadence already supplied: post-publish privacy tests, public-link sampling, media checks, log review when problems occur, and check/test/build before every new code change.

**Verification:** A post-publish checklist is complete and the final production URLs, status codes, metadata, privacy results, and rollback checkpoint are recorded.

## Critical path

**1 → 2 → 3/4 → 5 → 6 → 7 → 8.** Announcement authoring and media validation are intentionally early because they affect public rendering, social previews, Resource cards, and Q&A media handling. Release checks begin only after every content type has a verified public/private and archive lifecycle.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Rich editor introduces unsafe HTML or inconsistent SSR rendering | Public content could be unsafe or mismatched for crawlers | Use a constrained, sanitized structure; keep public rendering allowlisted and add tests before migration. |
| Third-party destinations or social crawlers are inconsistent | Resource cards/previews may not resolve as expected | Use a managed fallback image and test representative links individually rather than scraping third-party metadata server-side. |
| Public field leakage through future query changes | Sensitive Attendance or owner data could be exposed | Keep explicit public projections, add negative tests for drafts/private fields, and run incognito checks after every public-route change. |
| Manual testing alters useful class records | Published records may change during validation | Use clearly labelled validation records where possible; restore final desired state after Archive tests; record tested URLs. |
| Configuration omits canonical origin | Social previews will have incomplete absolute URLs | Treat `CANONICAL_ORIGIN` and `SITE_NAME` as a production launch blocker. |

## Assumptions and decisions

The secretary remains the only editor and publisher. Classmates and professors use anonymous, view-only links. Public Attendance may show final individual statuses, but raw Zoom input, normalization data, match suggestions, drafts, private notes, owner data, and secretary controls must never be exposed. Reports remain aggregate-only. Manual verification supplied by the user counts as evidence where it identifies the tested flow and result.

## Open inputs needed before final release

1. The final production domain for `CANONICAL_ORIGIN`.
2. Representative public Resource destinations for each supported type, if the current records do not cover them.
3. One managed public image suitable for preview/fallback validation, or approval to use existing class artwork.
4. A Messenger test conversation for final preview checks.

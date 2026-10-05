# Spec: Knowledge Posts System (Announcements, Resources, Questions)

## Problem Statement

Class secretaries currently communicate lecture updates, schedule shifts, study materials, and answers to repetitive questions across fragmented, noisy group chat messages. Important notices get buried in casual conversations, file links expire, and classmates repeatedly ask the same questions throughout the term. Furthermore, classmates who missed class or joined late have no central, unlisted repository to access verified announcements, class slides, or professor-confirmed answers without directly messaging the secretary.

The secretary needs a unified, phone-first publishing workspace within each subject to draft, prioritize, and publish official announcements, reference materials, and structured Q&A, while classmates need an instant, no-login public view where pinned priorities and verified answers are immediately accessible.

## Solution

A multi-format Knowledge Posts system embedded directly into the Secretary Console and the Classmate Public Portal. 

Under the unified domain concept of **Posts**, secretaries manage three specialized post kinds:
1. **Announcements**: General notices with optional cover image and priority pinning with automated pin expiration.
2. **Resources**: Curated study links and up to 6 file attachments classified by category (e.g., Syllabus, Lecture Notes, Problem Sets).
3. **Questions**: Structured Q&A with tags and an "Official" badge indicating confirmation by the professor or school administration.

All posts support draft/published/archived lifecycle transitions with immutable version histories and required change notes upon publication. Classmates browse published posts directly on the public subject page (`/s/[slug]`), where pinned announcements appear prominently at the top, and drafts or private notes remain strictly inaccessible.

## User Stories

1. As a secretary, I want to create a draft announcement for a subject, so that I can prepare class updates before broadcasting them to classmates.
2. As a secretary, I want to publish an announcement with a mandatory change note, so that classmates know exactly what changed in each version.
3. As a secretary, I want to mark an announcement with Priority and set an expiration date, so that urgent notices remain pinned to the top of the classmate feed until the deadline passes.
4. As a secretary, I want expired priority announcements to automatically unpin from the top, so that outdated notices do not clutter the priority banner.
5. As a secretary, I want to attach a cover image with descriptive alt text to an announcement, so that the post is visually engaging and accessible to screen readers.
6. As a secretary, I want to create a resource post with an external web link, so that classmates can directly open shared Google Drives, slide decks, or video recordings.
7. As a secretary, I want to attach up to six files to a resource post, so that handouts and assignment sheets are stored directly in the subject hub.
8. As a secretary, I want to categorize resources (e.g., Syllabus, Readings, Problem Sets), so that classmates can filter and locate materials quickly.
9. As a secretary, I want to create a question post with a question and authoritative answer, so that I can resolve frequent classmate inquiries once and for all.
10. As a secretary, I want to mark a question with an Official badge, so that classmates know the answer came directly from the professor or academic department.
11. As a secretary, I want to tag questions with topic keywords, so that classmates can search and filter Q&A by subject topic.
12. As a secretary, I want to save any post as a draft, so that unfinished writing is never exposed to classmates prematurely.
13. As a secretary, I want to edit a previously published post, so that I can correct errors or add updated information.
14. As a secretary, I want every published update to create an immutable version snapshot, so that a historical audit log of revisions is preserved.
15. As a secretary, I want to archive a post, so that outdated posts are removed from active feeds without deleting historical records.
16. As a secretary, I want to unarchive an archived post, so that I can restore accidentally hidden materials.
17. As a secretary, I want to view all posts for a subject in the Subject Home Posts tab, so that I have a central command view of all communications.
18. As a secretary, I want to filter subject posts by type (All, Announcements, Resources, Questions), so that I can manage each communication channel easily.
19. As a secretary, I want to filter subject posts by status (Published, Draft, Archived), so that I can review pending drafts or hidden posts.
20. As a secretary, I want to search subject posts by title or keyword, so that I can quickly retrieve existing posts.
21. As a classmate, I want to open an unlisted public subject link, so that I can view active class announcements and resources without logging in.
22. As a classmate, I want to see priority pinned announcements at the top of the subject page, so that I never miss critical exam notices or schedule changes.
23. As a classmate, I want to switch between Announcements, Resources, and Q&A tabs on the public subject page, so that I can find what I need with minimal scrolling.
24. As a classmate, I want to tap external resource links, so that I can open shared documents directly in my browser.
25. As a classmate, I want to download or view resource file attachments, so that I have offline access to course materials.
26. As a classmate, I want to see the Official badge on confirmed Q&A posts, so that I can distinguish administrative facts from student rumors.
27. As a classmate, I want search engines to never index public post pages, so that class communication remains unlisted and private to our cohort.
28. As a classmate, I want post pages to load swiftly on a 375px mobile viewport, so that I can check updates over cellular connections on my phone.

## Implementation Decisions

### 1. Collections & Domain Models
- Implement three distinct Payload collections aligned with `docs/SCHEMA.md`:
  - `announcements`: `title`, unique `slug`, Lexical rich text `body`, `image` upload reference, `priority` (boolean), `pinnedUntil` (date string), `publishedAt` (date), `changeNote` (text, required at publish), `archivedAt` (date), `subjects` relationship (hasMany, max 1 for Stage 2).
  - `resources`: `title`, unique `slug`, `url` (text with URL validation), `category` (text), `attachments` (media upload reference, max 6), Lexical rich text `body`, `publishedAt` (date), `changeNote` (text, required at publish), `archivedAt` (date), `subjects` relationship.
  - `questions`: `question` (text), unique `slug`, Lexical rich text `answer`, `tags` (text, hasMany), `official` (boolean badge), `publishedAt` (date), `changeNote` (text, required at publish), `archivedAt` (date), `subjects` relationship.
- Enable Payload draft versioning: `{ drafts: true, maxPerDoc: 0 }` across all three collections to ensure rollback capability and immutable historical tracking.

### 2. High-Level Posts Service Seam (`lib/posts/*`)
- Establish a single, cohesive business logic seam for all post operations:
  - `createPostDraft`: Handles initial creation for all 3 kinds with slug generation.
  - `publishPost`: Validates required `changeNote`, sets `publishedAt` on first publish, manages version snapshot, and verifies `pinnedUntil` if `priority` is set.
  - `archivePost` / `unarchivePost`: Manages soft-deletion timestamps without data loss.
  - `projectSubjectPostsList`: Secretary console view mapping drafts, published items, and counts.
  - `projectPublicSubjectPosts`: Zero-leak projection returning strictly 🌐 fields, sorting active pinned priority announcements to the top, and filtering out drafts and archived posts.

### 3. Secretary Post Editor Screen (`/console/posts/[id]` & `/console/posts/new`)
- Unified, responsive post editor supporting:
  - Kind selector (Announcement vs Resource vs Question) when creating new posts.
  - Contextual fields based on kind:
    - Announcement: Priority toggle + pin expiration date picker, cover image picker.
    - Resource: External link input, category chip selector, attachment picker.
    - Question: Question title input, official verified toggle, tag chips.
  - Lexical rich text editing with standard formatting (bold, italic, lists, links).
  - Publish modal enforcing a non-empty `changeNote`.
  - Save Draft and Archive action buttons.

### 4. Public Subject Page Integration (`/s/[slug]`)
- Enhance the public classmate subject view with clean, accessible sub-tabs:
  - Tab navigation: Sessions (existing), Announcements, Resources, Q&A.
  - Prominent Pinned Banner above the tabs for any currently active priority announcement (`pinnedUntil >= today`).
  - Strict field allowlist: Never expose internal secretary notes, drafts, or author IDs to public readers.
  - Robots headers: Include `X-Robots-Tag: noindex, nofollow` on all public post endpoints.

## Testing Decisions

### Seam Definition
- **Seam**: High-Level Posts Service Seam (`lib/posts/*`).
- **Rationale**: Tests against this seam verify all critical domain logic (slugification, priority expiration, versioning rules, change note enforcement, and public zero-leak projection) purely in-memory with mocked collections and zero live MongoDB requirements.
- **Prior Art**: Mirrors the robust architecture of `tests/unit/subject-home-tabs.spec.ts`, `tests/unit/absentee-monitoring.spec.ts`, and `tests/unit/professor-privacy-harness.spec.ts`.

### Test Coverage Matrix
1. **Validation & Lifecycle Rules**:
   - Publishing fails if `changeNote` is blank.
   - Priority announcements require a valid future `pinnedUntil` date.
   - Pinned status evaluates as active only when `pinnedUntil >= todayDate` (Manila timezone).
   - Slugs auto-generate from title/question words with random entropy to prevent collisions.
2. **Privacy & Data Isolation (Zero-Leak)**:
   - Public projections strictly exclude posts with `_status === 'draft'` or `archivedAt !== null`.
   - Public payload keys match only allowed 🌐 fields; internal IDs, author credentials, and notes are never returned.
3. **Sorting & Filtering**:
   - Active pinned priority announcements sort to the top, followed by reverse chronological `publishedAt`.
   - Category and tag filtering accurately subset resource and question arrays.

## Out of Scope

- Cross-posting across multiple subjects (explicitly scheduled for Stage 3 §3.4).
- AI change-note generation drafts (scheduled for Stage 3 §3.1).
- Student comments or discussion threads (SuperSec public pages are read-only; questions are secretary-curated).
- PDF document text indexing.

## Further Notes

- All dates and pin expiration checks evaluate against Manila calendar dates (`Asia/Manila`, `YYYY-MM-DD`).
- Image uploads utilize the Appwrite `images` bucket with client-side compression below 300 KB.

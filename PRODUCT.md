# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Secretary (Primary User)**: The single authenticated account owner who runs live sessions, takes attendance, tallies recitations, reviews classmate requests, publishes posts and resources, and issues professor report links.
- **Classmates (Secondary Audience)**: Students in the class cohort who access unlisted public links from group chats (e.g. Messenger) without logging in. They view published schedules, attendance summaries, announcements, and resources, and submit correction or excuse requests with optional photo proof.
- **Professors (Secondary Audience)**: Course instructors who access secret, revocable report links (`/prof/[token]`) to review session and subject attendance summaries without creating accounts.

## Product Purpose

SuperSec exists to eliminate friction, administrative overhead, and student disputes in university class management. It replaces cumbersome spreadsheets and bloated LMS tools with an instant, high-velocity operational console for the secretary, transparent unlisted verification for classmates, and verifiable reports for professors.

## Positioning

Unlike institutional learning management systems (Canvas, Blackboard) or generic spreadsheets (Google Sheets, Excel), SuperSec is purpose-built for the student class secretary:
- **Zero Student Logins**: Classmates access unlisted public views and submit requests without friction or account barriers.
- **Privacy by Default**: Public routes strictly expose allowlisted 🌐 fields, OpenGraph cards never show student names, and search engine crawlers are blocked (`noindex`).
- **Audit-Proof Dispute Handling**: Classmate requests directly link to session entries, with excuse proof photos automatically purged after 30 days.

## Operating Context

- **Environment**: Philippine university classrooms and lecture halls, often under spotty mobile connectivity or Wi-Fi.
- **Form Factors**: Equal-priority responsive design:
  - Mobile web (375px–430px) for one-handed operation while standing or walking around class during live roll calls.
  - Desktop web (1280px+) for comprehensive roster management, bulk term setup, and report generation.
- **Channel Rituals**: Communication happens via Facebook Messenger group chats; share sheets format instant summaries and unlisted links ready to paste.
- **Temporal Alignment**: Strictly aligned to Asia/Manila calendar days (`YYYY-MM-DD`), preventing UTC midnight shift bugs.

## Capabilities and Constraints

- **Attendance Domain**: Exactly four presence states: Present (P), Absent (A), Excused (E), and Not Set (`–`). There is explicitly no Late status.
- **Recitation Tracking**: Rapid `+1` / `−1` counters per student with optional topic attribution.
- **Dispute Lifecycle**: Requests ("I was present", "Excuse", "I recited") stay pending until approved or declined; unpublished session edits block approvals (R3); proofs auto-purge after 30 days (R4).
- **Attendance Monitoring**: Automated computed absence flags: Watch (50% limit), At Risk (75%), Exceeded (100%), No Attendance (0 present), and Streak (3+ consecutive absences, skipping excused sessions).
- **Three-Tier Privacy**: Fields belong to Public (🌐), Report-only (📋), or Private (🔒).
- **Architectural Constraints**: Next.js 16 + Payload CMS 3 + MongoDB Atlas Flex, with 100% database-isolated Vitest tests and Appwrite Sites continuous deployment.

## Brand Commitments

- **Aesthetic**: Linear-inspired dark aesthetic (`docs/DESIGN.md`, `src/styles/tokens.css`).
- **Palette**: Deep charcoal canvas (`#010102`), four-level surface ladder (`#09090b`, `#121215`, `#1a1a1e`), hairline 1px borders, and signature lavender-blue accent (`#5e6ad2`).
- **Typography**: Inter / Linear Text sans with tight display letter-spacing and clean tabular figures.
- **Voice & Tone**: Direct, high-signal, human, and professional (`ux-writing`, `no-ai-slop`).

## Evidence on Hand

- Complete architectural specifications in `docs/` (`masterplan.md`, `PRD-1-implementation-plan.md`, `PRD-2-design-guidelines.md`, `PRD-3-app-flow-pages-roles.md`, `SCHEMA.md`, `CONTEXT.md`).
- Ubiquitous domain dictionary in `GLOSSARY.md`.
- Architectural decision records in `docs/adr/`.
- Official Linear design system tokens in `docs/DESIGN.md` and `src/styles/tokens.css`.
- Live v1 schema and migration mappings in `docs/SCHEMA.md §5`.

## Product Principles

1. **Zero-Friction Classroom Velocity**: Every live session action (taking attendance, recording recitations) requires a single tap with instant optimistic feedback and zero loading barriers.
2. **Privacy by Construction**: Sensitive student notes, excuse reasons, and contact info are private by default; public pages render only compile-time allowlisted fields.
3. **Equal-Priority Responsive Craft**: Mobile handheld ergonomics (touch targets ≥ 44px, one-handed reach) and desktop power-management layouts receive identical care, polish, and typography hierarchy.
4. **Deterministic History & Transparency**: Every published session generates an immutable version with a clear change note, preventing quiet modifications or unrecorded edits.

## Accessibility & Inclusion

- **Target Standard**: WCAG 2.2 AA conformance across all public and secretary surfaces.
- **Contrast & Legibility**: Minimum 4.5:1 text contrast and 3:1 border contrast in dark mode.
- **Touch Targets**: Minimum 44×44px interactive hit areas for all buttons, chips, and attendance toggles.
- **Screen Reader Support**: Semantic table structures and ARIA live regions for rapid roll call updates.

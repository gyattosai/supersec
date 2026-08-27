# Change PLN-11 — Milestone roadmap reconciliation

- **Operation:** plan-milestone
- **Target file(s):** `/home/ubuntu/class-management-system/docs/unified-milestone-build-plan.md`, `/home/ubuntu/class-management-system/docs/build-milestones.md`, `/home/ubuntu/class-management-system/docs/remaining-work-build-plan.md`
- **Summary:** Consolidate duplicated milestone documents into one current roadmap and mark implemented milestones complete without retaining superseded design directions.
- **Content:** Replace `docs/unified-milestone-build-plan.md` with the following current roadmap. Replace `docs/build-milestones.md` and `docs/remaining-work-build-plan.md` with a short notice linking to the unified roadmap as the sole current milestone source.

```markdown
# Class Management System — Current Milestone Roadmap

## Product baseline

The shipped working baseline is **Class Signalboard**: a dark-first, tropical-orange, mobile-first system with Manrope display type, Inter body type, focused secretary workflows, and reader-first public pages. It supersedes earlier Apple-inspired and Linear-inspired explorations.

| Milestone | Status | Verified outcome |
|---|---|---|
| 1. Product foundation | Complete | Owner-only workspace, safe public routes, independent Subject data, history, media references, SSR metadata, and accessible dark-first tokens are implemented. |
| 2. Subject operations | Complete | Subject setup, independent roster, schedule, No Class, archive, sharing, and dedicated workspace routes are implemented. |
| 3. Attendance and reports | Complete | Private Zoom-review assistance, secretary confirmation, PRESENT/ABSENT/EXCUSED/NOT_SET records, aggregate-safe reports, history, archive, and print view are implemented. |
| 4. Published class information | Complete | Draft, publishing, history, archive, rich Announcement, Resource, and Q&A workflows with safe public readers are implemented. |
| 5. Product-quality refinement | Complete | Tropical-orange redesign, copy simplification, divider-rhythm cleanup, responsive captures, focus/contrast checks, tests, and production builds have passed. |
| 6. Release evidence with real records | In progress | Complete only the production and real-data checks below; do not fabricate records to close them. |

## Milestone 6 — Release evidence with real records

| Work item | Completion evidence |
|---|---|
| Resource variants | Real Google Drive, Google Forms, Facebook, image, Zoom, and generic external links render correctly with thumbnail fallback and public history. |
| Archive restoration | Real archived Subject, Announcement, Resource, and Q&A records restore as drafts and leave Archive correctly. |
| Managed media | Real announcement images, resource thumbnails, and custom social-preview images render on public pages. |
| Messenger previews | Published canonical links render intended Messenger/social cards without exposing private Attendance or secretary data. |
| End-to-end release run | A real-data run confirms independent Subjects, roster intake, Attendance review, sharing, reports, and archive behavior. |

## Non-negotiable boundaries

- Public pages use only safe `foundation.public*` projections and expose no private notes, Zoom sources, match suggestions, excuse reasons, drafts, or secretary controls.
- Attendance statuses remain PRESENT, ABSENT, EXCUSED, and NOT_SET; an EXCUSED record keeps its reason private.
- AI remains advisory and secretary-reviewed; it never automatically saves or publishes.
- Each Subject retains an independent roster and workflow container.

## Verification protocol

Before any release checkpoint, run TypeScript, Vitest, client/SSR production builds, whitespace checks, representative mobile and desktop captures, and safe-public metadata checks. Record production-only checks only when real records and a canonical published domain exist.
```

- **Reason:** `docs/build-milestones.md`, `docs/unified-milestone-build-plan.md`, and `docs/remaining-work-build-plan.md` currently overlap and retain already superseded Apple/Linear milestone language. A single updated roadmap makes status and remaining work legible.
- **Source task:** Current Class Management System task.
- **Follow-up:** Apply PLN-10 first, then this roadmap update; retain prior roadmap files only as pointer pages so existing links do not break.
- **Status:** applied

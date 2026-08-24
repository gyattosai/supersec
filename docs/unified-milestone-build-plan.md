# Unified Milestone Build Plan

## Purpose

This is the single build roadmap for the Class Management System. Every milestone combines the necessary **product design**, **development implementation**, and **verification** work. It replaces separate planning layers: once this roadmap is approved, a milestone starts with its defined design decisions, then moves directly into its build tasks and checks.

> **Working rule:** Milestone 1 is the design source of truth. Every later milestone uses its dark-mode-first, Apple-inspired, mobile-first, accessible design system rather than starting a new visual direction.

## Build rules

| Rule | How it applies |
|---|---|
| One source of truth | The approved PRD, information architecture, and Milestone 1 design package guide scope and visual decisions. |
| Design and development stay together | Each milestone lists the exact design work that must be complete before its related code is built. |
| No extra plan before a build | A new planning document is not required at the start of every milestone. The milestone’s own design, build, and check rows are the execution plan. |
| Public does not mean private | Shared links are intentionally public within the small class group. Public pages never expose raw Zoom input, suggestions, drafts, private notes, or secretary controls. |
| Secretary confirms attendance | AI can suggest a roster match, but the secretary makes every final attendance decision. |
| Simple labels | Use Dashboard, Subjects, Attendance, Announcements, Resources, Questions & Answers, Schedule, Reports, Settings, No Class, and History. |
| Mobile comes first | Build the phone layout first, then add the desktop version without removing clear navigation or readable hierarchy. |

## Current starting point

| Area | Status | What this means for the next build step |
|---|---|---|
| Product requirements | Approved | Scope and access decisions are fixed unless the user changes them. |
| Information architecture | Approved | Page names, Subject structure, public pages, and private pages are defined. |
| Milestone 1 design | Complete | The dark visual foundation, typography, navigation, states, public/private rules, and accessibility rules must be used throughout the build. |
| Milestone 2 foundation | In progress | The schema and initial access/dark-shell code exist. Finish reconciliation, fix the remaining public/protected shell behavior, then validate it before moving on. |

## Milestone sequence

### Milestone 1 — Product design system

**Status:** Complete and approved.

| Product design | Development implementation | Verification gate |
|---|---|---|
| Define the dark default theme, Apple-style system typography, readable contrast, touch targets, mobile navigation, Subject Home hierarchy, key states, and public/private boundaries. | Apply these decisions to every app shell, component, and page created later. Do not create a separate competing theme. | Check contrast, focus visibility, 44 by 44 touch targets, reduced motion, reduced transparency, public/private content separation, and mobile navigation before each milestone is complete. |

### Milestone 2 — Secure app foundation

**Status:** In progress.

| Product design | Development implementation | Verification gate |
|---|---|---|
| Apply the Milestone 1 dark app shell to the secretary workspace and public pages. Use the approved empty, unavailable, loading, and sign-in states. | Finish the relational database schema for Subjects, Students, class sessions, Attendance, Announcements, Resources, Questions & Answers, Reports, History, and media references. Add owner-only procedures, safe public procedures, server-side media references, public route shells, and dark responsive secretary navigation. | Migration is fully reconciled; type checks and tests pass; unauthenticated users cannot access secretary actions; public routes do not return private fields; History returns only public summaries; public/unavailable and secretary sign-in pages render correctly on phone and desktop. |

**Build order:** First finish the current database reconciliation. Next finish and test the safe owner/public procedures. Then resolve the public and secretary shell states found during browser checking. Finally run the full Milestone 2 validation gate.

### Milestone 3 — Subjects and Schedule

| Product design | Development implementation | Verification gate |
|---|---|---|
| Finalize the Subject setup flow, Subject Home details, Student list behavior, fixed weekday Schedule, and No Class notice states using the existing design system. Subject Home always shows subject name, subject code, professor name, fixed weekday Schedule, and the next No Class notice. | Build Subject create/edit/archive, independent Student membership, fixed weekday Schedule setup, class session generation, No Class notices for holidays, events, and weather, and the public Subject Home. | The secretary can create several independent Subjects; changing one roster does not change another; public Subject Home shows only published information; No Class notices appear correctly; mobile and desktop screens follow Milestone 1 rules. |

### Milestone 4 — Attendance

| Product design | Development implementation | Verification gate |
|---|---|---|
| Finalize the session list, pasted Zoom names review screen, clear/needs-review/no-match states, status picker, Attendance summary, correction History, and public Attendance view. | Build class-session Attendance records with PRESENT, ABSENT, and NOT SET. Add pasted Zoom participant names, LLM-assisted roster-match suggestions, ambiguity flags, secretary confirmation, publish/update History, and public session Attendance pages. | A suggestion cannot publish Attendance without secretary confirmation; unclear names block the publish action until resolved; Student membership stays Subject-specific; public Attendance excludes raw Zoom names and suggestions; session results show correct version and History. |

### Milestone 5 — Announcements, Resources, and Questions & Answers

| Product design | Development implementation | Verification gate |
|---|---|---|
| Finalize the rich Announcement editor, visual Resource card, forum-like Questions & Answers page, media states, search/filter behavior, History, and individual share pages. | Build published and draft records, rich announcement media, secure managed media upload flow, Resource metadata and fallback thumbnails, Question & Answer posts, tags, official answer status, version numbers, and public History. | Every content type supports drafts and published versions; public links show only published content; Resources work with a safe fallback card when no preview is available; upload failure preserves the draft; every public item has a clear path back to its Subject Home. |

### Milestone 6 — Reports

| Product design | Development implementation | Verification gate |
|---|---|---|
| Finalize the per-session Class Attendance report and end-of-exams All Subject Attendance report. Define report hierarchy, totals, empty states, History, share state, mobile reading, and print/export behavior. | Build report generation for one completed session and all Subjects. Add public report links, versioning, History, and a secretary review/share flow. | A session report covers only the selected Subject and date; the end-of-exams report keeps Subjects separate while showing one overview; unpublished reports are never public; correct totals and Attendance statuses are shown after updates. |

### Milestone 7 — Messenger sharing and social preview

| Product design | Development implementation | Verification gate |
|---|---|---|
| Finalize the sharing panel, copy message action, preview title, description, image fallback, and neutral Attendance preview rules. | Add social metadata for public Subject, Announcement, Resource, Question & Answer, and Report pages. Add crawler-visible server rendering if required for social previews. Store custom preview images through managed storage. | A copied link opens the correct public page; shared previews use the right title, description, and image when available; Attendance previews do not reveal sensitive details; missing media uses the safe fallback. |

### Milestone 8 — Release checks and archive

| Product design | Development implementation | Verification gate |
|---|---|---|
| Review all screens against the Milestone 1 dark design system. Confirm loading, empty, error, unavailable, No Class, draft, published, and updated states. | Complete automated tests, public/private access tests, mobile checks, desktop checks, accessibility fixes, archive/restore behavior, and production readiness work. | All planned tests pass; public/private checks pass; no app page uses the old example screen; all core screens work at mobile and desktop widths; archive keeps complete Subject History; the project is ready for a release checkpoint. |

## Dependencies

| Milestone | Depends on | Enables |
|---|---|---|
| 1. Product design system | Approved PRD and information architecture | All later UI work |
| 2. Secure app foundation | Milestone 1 | All Subject, public-link, History, and media work |
| 3. Subjects and Schedule | Milestone 2 | Attendance, content, and Reports |
| 4. Attendance | Milestones 2 and 3 | Class Attendance reports |
| 5. Class information | Milestones 2 and 3 | Messenger sharing and complete Subject Home content |
| 6. Reports | Milestones 3 and 4 | Professor-ready sharing |
| 7. Messenger sharing | Milestones 3, 5, and 6 | Social preview-ready links |
| 8. Release checks and archive | Milestones 2 through 7 | Production release |

## Definition of done for every milestone

Each milestone is complete only when the matching product-design decisions have been applied, the required development work is working, the milestone verification gate passes, the project task tracker is updated, and the user can review a saved project checkpoint. The next milestone should not begin merely because a design document exists; it begins after the previous milestone’s implementation gate passes.

# SuperSec v2: Masterplan

> Blueprint for Google Antigravity (AGY). Read this first, then `AGENTS.md` and the 3 PRDs:
> 1. `PRD-1-implementation-plan.md` (what to build, in what order, plus rules and env)
> 2. `PRD-2-design-guidelines.md` (how it looks)
> 3. `PRD-3-app-flow-pages-roles.md` (who does what, on which page)
>
> Shared language: `CONTEXT.md` (the words) · `SCHEMA.md` (collections and fields)
>
> Owner: MJ Balubar (class secretary, solo developer) · **v1.6** · Updated Mon Oct 5, 2026 · History: `CHANGELOG.md` · Last audit: `AUDIT.md`

---

## 1. One-liner

SuperSec is the class secretary's second brain and assistant: a phone-first console for running classes, plus clean, unlisted, read-only pages that keep professors and classmates informed.

## 2. Problem

1. Secretary work (attendance, recitation, announcements, files, Q&A, reports) is scattered across Messenger, Zoom, and spreadsheets.
2. Classmates keep asking the same questions because there's no single place to check.
3. Professors need attendance and absentee reports, and pulling them together by hand takes time.
4. **v1 leaks private data.** All 15 v1 tables are readable by anyone, and attendance records can be created and edited by anyone.
5. v1's built-in AI (Manus) is gone.

## 3. Goals and success checks

| Goal | Done when |
|---|---|
| Run class from a phone | A 40-student session can be marked in under 1 minute (Mark all Present plus the exceptions) |
| Transparency | Classmates see published attendance, recitation counts, posts, and history without asking |
| Prof reporting | The prof opens a report from one link, with no account |
| Privacy by design | No 🔒 field ever reaches a public response, 📋 fields appear only on prof report links, and no public page is indexed |
| Data safety | Atlas daily snapshots are on, and a test restore works |
| No regressions | Everything v1 offers (incl. Q&A and all-subject reports) works in v2 before v1 is shut down, and old v1 links redirect |
| Ship | The domain `supersec.mjbalubar.tech` points to v2, and every v1 table is locked (closing the leak) |

## 4. Users (summary, details in PRD 3)

| Role | Login? | Access |
|---|---|---|
| **Secretary (you)** | Yes, the only account (30-day session) | Everything |
| **Classmate** | No | Public pages (unlisted links), plus sending Requests |
| **Professor** | No | Public pages, plus Reports at `/prof/[token]` (Report links you can reset) |
| **System** | n/a | Daily cleanup of proofs and stale requests |
| *Helper (future)* | *Yes* | *Not built. Permissions are written against roles, so it's a small addition later* |

## 5. Features

1. **Subjects.** Linked to a **term** (start and end dates). Each has a schedule (1 meeting per weekday), section identity, 5 quick shortcuts, and can be archived and restored (no delete).
2. **Class Session.** Attendance and recitation on one screen, one row per student, statuses **P / A / E / Not set** (no Late). Upcoming → Live → Finished → Published, with versions. Includes No Class (also for all subjects at once), Mark all Present, +1/−1 recitation, and an offline queue. Zoom paste with AI matching comes in Stage 3.
3. **Students.** One master list with an enrollment per subject. Includes roster paste with preview, an optional student number (📋), a schedule-conflict flag, private notes, and Active/Dropped status.
4. **Classmate Requests.** "Something wrong?" on public session pages, for 3 types: I was present, Excuse, I recited. They land in a queue where you Approve or Decline. Proofs are deleted 30 days after a decision, and undecided requests auto-decline after 30 days.
5. **Posts.** Announcements, Resources, and Q&A. Draft → Published → Archived, with versions. Each post has its own link and a Messenger preview. Cross-posting comes in Stage 3.
6. **Reports.** Session, Subject, and Compiled reports, each with a Report link, a PDF snapshot, CSV, and a copyable summary.
7. **Absentee Monitoring.** Flags: Watch, At Risk, Exceeded, No Attendance, Streak. They show in a Monitoring tab, a Dashboard card, and prof reports, and never on classmate pages.
8. **Notes.** Private storage only: title, body, optional subject tag, search. Never public, no AI.
9. **Dashboard, light/dark theme, Messenger fast-share, privacy notice, Export all.**

**AI is used in 3 places only** (Stage 3, you confirm every suggestion): Students (roster cleanup, near-duplicates), Class Session (Zoom matching), and History (drafting change notes). Every AI feature has a manual fallback.

## 6. Out of scope

Push notifications · AI "improve text" · AI proof checking · helper role · prof logins · multi-secretary sign-ups · to-dos and reminders in Notes · Late status · full offline mode · message templates (Stage 4) · command palette (Stage 4)

## 7. Tech stack (frozen)

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js + Payload CMS 3** (one codebase: secretary screens, public pages, `/admin`, API) | One app, one deploy. Built-in auth, drafts, versions, and access control |
| UI kit | **shadcn/ui (Radix) + Tailwind v4**, themed with our tokens | Menus, dialogs, and focus handling come pre-tested |
| Database | **MongoDB Atlas Flex**, Singapore, paid with the $50 Student Pack credit | About $8/mo, 5 GB, daily snapshots (8 kept), no idle pause. **Not M10** (from $60/mo) |
| Hosting, files, jobs | **Appwrite Education plan**, existing project `supersec` | Sites (SSR), Storage, Functions (cron), never pauses |
| AI | Gemini Flash-Lite through your own API key (Stage 3) | Cheapest. The free tier is unstable, so every AI feature has a fallback |
| Auth | Payload built-in | No extra service |
| Code | GitHub `gyattosai/supersec`, orphan branch `v2` | v1 stays on `main` for reference |

New tool ideas go on a "maybe later" list. They don't reopen the stack.

## 8. Architecture (conceptual)

```
Classmate / Prof browser ──► Next.js pages (server-rendered, allowlisted fields, noindex)
                                   │  Local API, anonymous: published docs only
Secretary browser ──► custom /app screens ──► Payload ──► MongoDB Atlas Flex
   (taps → 1 queue → 1 request at a time)        │        (REST/GraphQL: logged-in only)
                    └► /admin (back office)       └► Appwrite Storage (images: /view URLs · proofs: private)
Appwrite Function (cron, daily) ──► POST /api/cron/cleanup (CRON_SECRET)
Gemini ◄── server only, Stage 3 (roster cleanup, Zoom matching, change-note drafts)
```

**Key rules:** browsers never talk to the database. Public pages are rendered on the server with allowlisted fields, and they're never indexed.

## 9. Data model (summary)

Collections: `users` · `terms` · `subjects` · `students` · `enrollments` · `sessions` (entries[] inside, drafts + autosave) · `requests` · `announcements` · `resources` · `questions` · `notes` · `reportLinks` · `rateLimits` · `media` · `proofs`. Global: `site`.

Privacy tiers: 🌐 public once published · 📋 report-only (Report links) · 🔒 private. Details in `SCHEMA.md`.

## 10. Build order (details in PRD 1)

No dates and no hour estimates. Each stage starts when the previous one passes its "done when" checks.

| Stage | Outcome |
|---|---|
| 0: Prove the stack | Payload runs on Appwrite Sites with Atlas Flex and Storage |
| 1: Core | Access foundation, terms, Subjects, Students (+ real roster import), Class Session (+ stats, offline), Announcements, Resources, Notes, public pages. **Gate:** 1 real class entered in both v1 and v2 |
| 2: Finish and launch | Q&A, full import, legacy links, Requests, sharing, Session/Subject/Compiled reports, Monitoring, Dashboard, test restore, switch-over (v1 locked) |
| 3: Extras | AI ×3, cross-posting |
| 4: Later | Templates, helper role, command palette, note pins and photos |

## 11. Risks (top 6)

1. **Payload cold starts on Appwrite Sites.** Measured in Stage 0. Fallback: a bigger runtime spec, plus cached public pages. If it's still too slow, hosting gets reopened (your call. Vercel and Netlify were rejected).
2. **The Atlas credit runs out** (about 6 months at $8/mo, sooner if it expires first). Set a billing alert. Then either pay about $8/mo or use Export all to move to Free.
3. **The Gemini free tier changes without notice.** Manual fallbacks for everything, and AI is built last.
4. **Scope creep.** Fast builds make adding features tempting, and v1 keeps leaking until the switch-over. New ideas go to Stage 4 unless they replace something.
5. **The Education plan might expire.** Check in Appwrite before **Feb 11, 2027**.
6. **The in-app editor is experimental in Payload** (`RenderLexical`). Proven on the deployed Site in step 0.7, wrapped in one component, versions pinned. Fallback: edit the body in `/admin` (same field, no data change).

## 12. Open decisions

1. **Re-attach the 3 sample attendance PDFs before step 1.5 (Students).** They lock the report columns and may require student numbers.
2. **Check when the Atlas $50 credit expires before creating the cluster** (Atlas, Billing, Promotional Credits).
3. Gemini: free tier (Google may use prompts, including classmate names) vs paid Flash-Lite. Decide before Stage 3.

## 13. Decision log

| Decision | Choice | Rejected |
|---|---|---|
| Logins | Just you, role-ready, 30-day session | Helper, multi-secretary |
| Where daily work happens | Custom screens plus the Payload admin as back office | Admin only, all custom |
| Look | Pure Linear (indigo, Inter), dark by default, Light by manual toggle | Linear + orange, v1 brand, following the system theme |
| UI kit | shadcn/ui (Radix) + Tailwind v4 | Hand-built components |
| Access pattern | Access functions branch on `req.payloadAPI`. Public pages = anonymous Local API, published only. REST/GraphQL = logged-in only | Public REST, `overrideAccess: true` everywhere |
| Prof access | Report link at `/prof/[token]` you can reset | Link + PIN, prof login, `/r/` (taken by v1 resources) |
| Public visibility | Unlisted links + noindex (crawling allowed so noindex is seen) + no names in previews | Indexed pages, robots.txt block |
| Offline | Autosave plus an offline queue, Class Session only | Online only, full offline |
| Live saving | Rolling draft (autosave) + one request at a time | A new version per tap |
| Database tier | Atlas Flex on the $50 credit | M0 Free (no backups, pauses), M10 (from $60/mo) |
| Backups | Atlas Flex daily snapshots + Export all | Custom backup job |
| Schedule | Build order only, no dates or hours | Weekly hour budgets, dated checkpoints |
| Attendance statuses | Present, Absent, Excused, Not set | Late |
| Q&A + Compiled report | Built before the switch-over (v1 has both) | Extras after launch |
| Rich-text editor | Payload Lexical (trimmed features), one wrapper component, pinned versions, `/admin` fallback | Markdown, body editing in `/admin` only |
| Notes | Private storage only | Turn into posts, to-dos |
| Proof screenshots | Human review, no AI | AI pre-check |
| Hosting | Appwrite Sites (existing project) | Netlify, Vercel |
| CMS / admin dashboard | Payload + its `/admin` (data in MongoDB); Appwrite Console for files, functions, hosting. Re-checked Oct 4 | Sanity, Strapi, Directus. Appwrite-native admins (Refine, react-admin + ra-appwrite, ToolJet, Imagine) need data in Appwrite tables and hand-built drafts, history and privacy rules |
| Shared language | `CONTEXT.md` (glossary, one word one meaning) + `SCHEMA.md` (the only copy of the schema) | Field tables repeated in each PRD |

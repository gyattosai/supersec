# PRD 1: Implementation Plan and Scope

> SuperSec v2 · **v1.6** · Owner: MJ Balubar · Builder: Google Antigravity (AGY) · Updated Mon Oct 5, 2026
> Read `masterplan.md` and `AGENTS.md` first. This doc covers **what** gets built, **in what order**, the business rules, and the env/keys each step needs.

**TL;DR:** 5 stages built strictly in order, with no dates and no hour estimates. A step is finished when its "done when" check passes on your phone. Each step goes data and access rules → screen → public page → test. A failing privacy test blocks the deploy. Everything v1 offers works in v2 before v1 is shut down.

---

## 1. What SuperSec is

A class secretary management system with 2 sides:

1. **Secretary side (private, logged in):** you run class sessions, manage students, post updates, review requests, keep notes, and generate reports.
2. **Public side (no login, unlisted, never indexed):** classmates and profs see published information through links shared in Messenger. Classmates can send correction requests. Profs open reports through secret links at `/prof/[token]`.

## 2. Build principles (rules Antigravity follows)

1. **Access pattern (one rule for every collection).** Access functions branch on `req.payloadAPI`:
   - Logged in → allowed.
   - Anonymous + `local` → `{ _status: { equals: 'published' } }` (or the equivalent for non-versioned collections). The only callers are our server pages.
   - Anonymous + `REST`/`GraphQL` → denied.

   Public pages call the Local API with `overrideAccess: false`, an explicit `select` from the allowlist, and never `draft: true`. Field-level `access.read` hides 🔒 fields as a second layer. **The only `overrideAccess: true` in public code** is the request submit handler (2.4), after validation.
2. **Allowlists, not blocklists.** Each collection has 2 field lists: `publicFields` (🌐) and `reportFields` (🌐 + 📋). Anything not listed is private by default.
3. **Unlisted, not blocked.** Every public response sends `X-Robots-Tag: noindex, nofollow` plus `<meta name="robots" content="noindex">`. `robots.txt` **allows** crawling, so crawlers can see the noindex and Messenger can build previews. OG previews never include student names.
4. **One vertical slice at a time, in order.** Collection → access → secretary screen → public page → test. Don't start the next step until the current one passes "done when".
5. **Use what's given.** Payload gives you auth, drafts, versions, the admin panel, and custom endpoints. shadcn/ui (Radix) gives you menus, dialogs, and focus handling.
6. **Custom API = Payload custom endpoints**, defined on their collection (for example `requests` → `/api/requests/submit`). Never add Next.js routes under `/api/*`, because they collide with Payload's REST catch-all.
7. **Store facts, compute the rest.** Attendance %, absences, flags, totals, and streaks come from one **stats module** (pure functions), never stored.
8. **Virtual before stored.** Upcoming sessions are computed from the schedule and the term dates. A session record is only created when you start it or mark No Class.
9. **One writer at a time.** Every roster tap goes through one client queue that sends **one request at a time** (batched about every 300 ms) with idempotency keys, saved as a Payload **autosave draft**. Only Publish creates a version.
10. **Dates are strings.** Class days are `YYYY-MM-DD` in Asia/Manila and times are `HH:mm`. Any UTC datetime (including v1's `startsAt`) gets converted to Asia/Manila **before** taking the date.
11. **Role-ready.** Every check goes through `can(user, action, resource)`, never `if (user)`.
12. **Lean on the platform.** Compress every image in the browser, including proofs (WebP, max 1600 px, about 300 KB). Use Appwrite **`/view`** URLs, never `/preview`: the Education plan allows only about 100 image transformations a month. Index every queried field. Reuse DB connections. Backups come from Atlas.

## 3. Scope

### Core (Stages 0 to 2): must work before v1 is shut down
Access foundation · site settings · Terms · Subjects · Students (+ real roster import) · Class Session (attendance + recitation, stats, offline queue, No Class for all) · Announcements · Resources · **Q&A** · Notes · public pages + privacy notice · full v1 import + legacy links · Classmate Requests · Messenger fast-share · Session, Subject, and **Compiled** reports (Report links) · Absentee Monitoring · Dashboard · light/dark theme · Export all · switch-over

### Extras (Stage 3, built last, in this order)
1. AI: change-note drafts
2. AI: Zoom paste matching (manual fallback: mark it yourself)
3. AI: roster cleanup + near-duplicates (manual fallback: the rule-based preview)
4. Cross-posting (one post to several subjects)

### Later (Stage 4)
Message templates · helper role · command palette · note pins and photos

### Never
Push notifications · AI "improve text" · AI proof checking · prof logins · multi-secretary sign-ups · Late status · full offline mode

## 4. Data model

**The schema lives in `SCHEMA.md`:** every collection, field, type, privacy tier (🌐 / 📋 / 🔒), index, and the v1 → v2 map. Words follow `CONTEXT.md`. This section keeps only the rules.

**Calculated by the stats module, never stored:** Held sessions, Attendance %, Absence limit, and Flags. Definitions and thresholds: `CONTEXT.md` → Stats and monitoring. Field-level recipe: `SCHEMA.md` §4.

### 4.1 Business rules

| ID | Rule |
|---|---|
| R1 | Publish is blocked while any active student is Not set. **Mark all Present fills only Not set rows** |
| R2 | Excused never counts as an absence, and Excused days are skipped in streaks (they neither break nor extend one) |
| R3 | Approving a request is blocked while its session has unpublished edits: "Publish or discard your edits first" |
| R4 | Proofs are deleted 30 days after a decision. Requests still pending after 30 days become `expired`, and their proof is deleted |
| R5 | An approved "I recited" request **adds** its count to the student's recitations |
| R6 | The absence limit is fixed at term setup. No Class days don't change it |
| R7 | The Session tab opens the class happening now. Otherwise the next one today. If it's unclear, a picker |
| R8 | 1 meeting per weekday per subject |
| R9 | Roster sorts: Last name · First name · Most absences · Original order (`displayOrder`) |

### 4.2 Rich text (decision D1: Payload Lexical)

1. **One field type:** `body` on announcements, resources, questions (`answer`), and notes is a Payload `richText` field with the Lexical editor.
2. **Trimmed features:** paragraph, bold, italic, H2/H3, bulleted and numbered lists, links, and blockquote. No underline (on screens it reads as a link). **No** blocks, uploads, tables, or relationships inside the body (images stay in their own field). Fewer features = fewer things that break.
3. **One wrapper:** only `components/RichTextEditor.tsx` may import `RenderLexical` (Payload marks it experimental, so it may change in minor releases). Every screen uses the wrapper, so a breaking change is a one-file fix.
4. **Rendering:** public and report pages use `RichText` from `@payloadcms/richtext-lexical/react` (the stable JSX converter), styled per PRD 2 §8.17. Never render raw HTML.
5. **Pinned versions:** all `payload` and `@payloadcms/*` packages use exact versions (no `^`/`~`) and are upgraded together, then the 0.7 check runs again.
6. **Fallback if the editor breaks:** the post editor (S10) and Notes (S13) show a "Edit body in admin" link to `/admin` for that document while everything else keeps working. No data change needed, since `/admin` uses the same field.

## 5. Build order

### Stage 0: Prove the stack

| # | Step | Needs (§8) | Done when |
|---|---|---|---|
| 0.1 | Check the credit's expiry, then create an **Atlas Flex** cluster (Singapore), a DB user limited to 1 database, network `0.0.0.0/0`, a strong password, and a billing alert | Atlas account | The connection string works from your laptop, and Billing shows the credit being used |
| 0.2 | Orphan branch `v2`, `npx create-payload-app` (Next.js + MongoDB), shadcn/ui + Tailwind v4, Vitest with `testing-qa`, copy in `AGENTS.md` + `docs/`, setup GitHub Actions CI (`.github/workflows/ci.yml`), track on GitHub Project board | `DATABASE_URI`, `PAYLOAD_SECRET` | `/admin` runs locally, you can create the first user, and `pnpm test` runs |
| 0.3 | Appwrite Site `supersec-v2` linked to GitHub repo `v2`, runtime 1 GB+, env vars, **build command = `pnpm test && pnpm build`** | Appwrite Console | The deployed `/admin` loads, and a deliberately failing test blocks the deploy |
| 0.4 | Buckets `images` (public read) and `proofs` (private), Payload storage adapter for Appwrite (`/view` URLs), browser compression | `APPWRITE_*` | An image uploaded in `/admin` shows up through its `/view` URL, at 300 KB or less |
| 0.5 | Smoke test: cold start, warm response, bandwidth | n/a | Cold start under 5 s and warm under 1 s, or a bigger spec is chosen |
| 0.6 | `tokens.css` + the shadcn-safe Tailwind mapping from PRD 2 §13, Inter | n/a | A test page shows every token in both themes, and a shadcn Button and DropdownMenu render in our colors |
| 0.7 | **Editor spike:** one `<RichTextEditor>` component wrapping `RenderLexical` (trimmed features, see §4.2), plus public rendering with `RichText` from `@payloadcms/richtext-lexical/react`. Pin exact Payload versions | n/a | On the deployed Site (phone), a custom page loads the editor, saves bold + a list + a link, and a public page renders it. If the editor fails on Appwrite Sites, use the fallback in §4.2 |

**Gate:** if 0.3 or 0.5 still fails after raising the spec, stop and decide on hosting before Stage 1.

### Stage 1: Core

| # | Step | Done when |
|---|---|---|
| 1.1 | Access foundation: `role`, `can()`, the `req.payloadAPI` access helpers (§2, rule 1), `publicFields`/`reportFields` registry, the privacy test harness (no DB needed) with a self-test on a fake collection, noindex header + meta, `robots.txt` that allows crawling | The self-test fails when a fake public function leaks a 🔒 field. Anonymous REST calls return 403, and an anonymous Local API read returns only published docs |
| 1.2 | Components from PRD 2 on shadcn/ui: Button, Input, Select, Menu, Dialog/Sheet, Toast, Badge, Tabs, ListRow, Segmented, Stepper, EmptyState, Skeleton | A gallery page shows every state in light and dark |
| 1.3 | App shell: secretary layout (bottom tabs / sidebar), public layout, login (`tokenExpiration` 30 days), theme (dark by default, Light toggle saved in a cookie, no flash), Payload admin theme | You stay logged in on your phone after a day, and a reload in Light mode never flashes dark |
| 1.4 | `site` global + Terms + Subjects: admin forms, Subjects list (today first), Subject Home with 5 shortcuts, archive/restore, slugs, R8 validation. Each collection registers its allowlists | You can create OLCA113 with 2 meeting days in your term, "Next class" is correct, and a 2nd meeting on the same weekday is rejected |
| 1.5 | Students + enrollments (**PDFs needed first**): roster paste (CSV/TSV/lines), preview, `N001_` stripping, rule-based duplicate flags, R9 sorts, drop and keep history | Pasting 40 messy lines gives a clean preview, and confirming enrolls them all |
| 1.6 | Real roster import from v1: `subjects` (termName → term, meetingDaysJson → schedule, viewOnlyShortMark/viewOnlyName → section), `students`, `subjectStudents` → enrollments (membershipState/removedAt → dropped + `droppedOn` (Manila date), hasScheduleConflict → conflictFlag, displayOrder, **enrolledOn = term start**). `legacyId` = v1 `publicId`, `legacyRowId` = v1 `$id`. Idempotent (upsert by `legacyRowId`) | Running it twice gives v1's counts with no duplicates, and every imported student counts from day 1 of the term |
| 1.7 | Class Session + **stats module**: virtual upcoming sessions, Start, roster rows, P/A/E/–, Mark all Present (R1), +1/−1 + topic, search, "recited today" filter, No Class (1 subject, or **all subjects for a date** from the Subjects list), Finish, Publish with change note, versions. Ops endpoint (`/api/sessions/:id/ops`, Payload custom endpoint) + in-memory **single-flight queue** | A 40-student session takes under 1 minute, 20 rapid taps all land, publishing creates version 1, Publish is blocked while anyone is Not set, and the stats tests pass |
| 1.8 | Offline persistence: IndexedDB queue, idempotency keys, reconnect replay, sync badge, **401 → pause → log in → replay**. Publish is blocked until the queue is empty | In airplane mode 10 fast taps queue, then sync with 0 duplicates and 0 lost taps, even when the login expired in between |
| 1.9 | Announcements + Resources: shared `<RichTextEditor>` from 0.7 (also used by Notes in 1.10), draft/publish/archive (`archivedAt`), versions + change notes, Priority pin with end date, `category` on resources | An announcement goes from draft to published to an edit with a change note to archived, and history shows every step |
| 1.10 | Notes: list, search, subject filter, editor | No note appears in any public response (harness test) |
| 1.11 | Public pages: Class Home, Subject page, Session page (with term totals from the stats module), post pages, history, Privacy Notice, `/s/:publicId` subject redirect | The page source has no 🔒/📋 fields, noindex is present, and an old v1 subject link redirects |

**Stage 1 gate:** run 1 real class in **both** v1 and v2. v1 stays the source of truth until the switch-over, and v2 practice records get wiped before the final import (2.11).

### Stage 2: Finish and launch

| # | Step | Done when |
|---|---|---|
| 2.1 | **Q&A**: collection, editor, archive, public browse + search (P7) | A Q&A entry publishes, shows up in search, and can be archived |
| 2.2 | Rest of the v1 import: classSessions (**`startsAt` → Asia/Manila date**, sessionState/noClassReason → kind), attendanceRecords → entries (excuseReason → 🔒 on the matching approved request), announcements, resources, questionsAnswers (post `slug` generated, `publishedAt` = v1 created date), **media re-hosted** (download each `mediaAssets.servedUrl` → upload to `images`, `alt` = the post title), `historyEntries` → `legacyHistory[]`. **v1 bodies (plain text) → Lexical** with `convertMarkdownToLexical`; re-hosted images get referenced by media ID, not URL. Skip `pushSubscriptions`, `zoomImports`, `zoomMatchSuggestions`, `reports`. Check `attendanceProofSubmissions` for pending items and handle them by hand. Idempotent | Counts match v1 table by table, a 7:30 AM class lands on the right date, every image loads from Appwrite, and spot-checking 5 records shows no differences |
| 2.3 | **Legacy link map** (all v1 public routes, PRD 3 P10) | Every v1 link type redirects (301) to its v2 page, and `/reports/:id` shows "This report moved" |
| 2.4 | Classmate Requests: `requests` custom endpoint `/api/requests/submit` (validated, then `overrideAccess: true`), rate limit, honeypot, 1 pending per student/session/type, compressed image ≤ 1 MB, "Something wrong?" sheet, queue, Approve/Decline (R3, R5), approval creates a new version, `/api/cron/cleanup` (R4) + Appwrite Function (daily, `CRON_SECRET`) | A request from a phone with no login reaches the queue, approving it updates the public page, and the cleanup endpoint rejects a call without the secret |
| 2.5 | Messenger previews (OG, no names) + fast-share sheet | A pasted link shows the subject card and no student names |
| 2.6 | Session + Subject reports: `/prof/[token]` (noindex, `Referrer-Policy: no-referrer`, Reset link, "Link expired" page), uses `reportFields` (📋 allowed), print-to-PDF stamped with version and date, CSV, copyable summary without names | The Report link works in a private window, a reset kills the old one, and the harness proves 📋 fields appear only here |
| 2.7 | **Compiled report** (several subjects, same link/PDF/CSV options) | One link shows every chosen subject |
| 2.8 | Absentee Monitoring: flags, Monitoring tab, flagged table in reports (columns per the PDFs) | The flags match a hand-checked spreadsheet for 1 subject, including an Excused day inside a streak |
| 2.9 | Dashboard: today's classes, No Class for all today (shortcut), pending requests, flagged count, recent drafts | Everything on the Dashboard is 1 tap from its source |
| 2.10 | Export all in Settings + **test restore** (an Atlas snapshot into a scratch cluster, and an export into a scratch DB) | Both restores work and the counts match |
| 2.11 | **Switch-over, in this order:** (1) copy any notes from v1's Notes page (it has no table, so they likely live only in that browser) · (2) wipe v2 practice records · (3) freeze v1 (no more edits) · (4) re-run the full import · (5) privacy audit + accessibility pass · (6) move the domain to v2 · (7) **immediately strip every `any` permission from all v1 tables** and delete `pushSubscriptions` rows · (8) delete the `og-router` Function and stop the v1 Site · (9) after 1 week of v2 running cleanly, delete v1's databases and buckets | The domain serves v2, an anonymous read of any v1 table fails, the audit finds 0 leaked fields, and `site:` search returns 0 results |

### Stage 3: Extras (built last, in order)

| # | Step | Done when |
|---|---|---|
| 3.1 | AI change-note drafts (server only, Gemini Flash-Lite, never sends 🔒 fields) | The draft is editable and never auto-publishes. With the key removed, you just type the note |
| 3.2 | AI Zoom paste matching | Suggestions show as Present / Unmatched, nothing saves until you confirm, and the manual path still works |
| 3.3 | AI roster cleanup + near-duplicates | The AI preview beats the rule-based one on a messy roster, and the rule-based one still works without the key |
| 3.4 | Cross-posting (`subjects[]` with more than 1) | One announcement shows up on 3 subjects' public pages, and editing it updates all 3 |

### Stage 4: Later
Message templates · helper role · command palette · note pins and photos.

## 6. Testing strategy

1. **Privacy tests (block deploys, no DB needed):** for every public function, response keys ⊆ `publicFields`. For every report function, keys ⊆ `reportFields`. They run on fixtures inside the Appwrite build.
2. **Access tests:** anonymous REST → 403. Anonymous Local API → published only.
3. **Editor test:** after any Payload upgrade, the 0.7 check runs again before deploy.
4. **Logic tests:** the stats module (%, limits, flags, Excused inside streaks), virtual sessions, roster parsing, Manila date conversion, offline replay (duplicate, out-of-order, expired login).
5. **One check per step:** the "done when" column, on your phone.

## 7. Definition of done (every step)

1. Works on a phone (375 px) and on a laptop.
2. Light and dark mode both look right.
3. No 🔒 field in public or report output, no 📋 field in public output, and noindex on public responses.
4. Loading, empty, and error states exist.
5. Committed to `v2` with a clear message, and the build (with tests) passes.

## 8. Env vars and keys

| Name | Used for | First needed |
|---|---|---|
| `DATABASE_URI` | Atlas Flex connection | 0.2 |
| `PAYLOAD_SECRET` | Payload auth signing | 0.2 |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, OG previews, redirects | 0.3 |
| `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID` (`supersec`) | Storage + Functions | 0.4 |
| `APPWRITE_API_KEY` (scopes: `files.read`, `files.write`) | Storage adapter, proof handling | 0.4 |
| `APPWRITE_BUCKET_IMAGES`, `APPWRITE_BUCKET_PROOFS` | Bucket IDs | 0.4 |
| `V1_APPWRITE_API_KEY` (read-only database scopes), **local only** | v1 import scripts, run from your laptop | 1.6 |
| `CRON_SECRET` | Authenticates the Function → `/api/cron/cleanup` | 2.4 |
| `GEMINI_API_KEY` | AI extras | 3.1 |

Never commit these. Set them in Appwrite Site settings, and in `.env.local` on your laptop.

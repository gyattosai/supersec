# SuperSec v2: PRD Audit (contradictions + missing dependencies)

> Audited Sun Oct 4, 2026 against masterplan v1.2, CLAUDE.md, PRD 1 v1.2, PRD 2 v1.1, PRD 3 v1.2, **plus the live v1 code (`client/src/App.tsx`) and the 15 v1 tables in Appwrite**.
> Status: ✅ fixed in v1.3 · ❓ needs your call

**Totals:** 16 contradictions · 17 missing dependencies · 9 missing rules. 42 fixed (D1 decided Oct 4: Payload Lexical).

## A. Contradictions (two docs, or two rules, disagree)

| ID | Problem | Fix (where) | Status |
|---|---|---|---|
| C1 | Public pages use the Local API with `overrideAccess: false`, **and** REST/GraphQL are locked to logged-in users. Payload applies the same access functions to both, so locking REST also blocks the public pages | Access functions branch on `req.payloadAPI`: anonymous + `local` = published docs only; anonymous + REST/GraphQL = denied. Field-level access hides 🔒 fields as a second layer (PRD 1 §2, PRD 3 §1.2, CLAUDE.md) | ✅ |
| C2 | CLAUDE.md says "never `overrideAccess: true` in public code", but the anonymous submit endpoint has to create a request | The submit handler is the **one documented exception**, validated and tested (CLAUDE.md, PRD 1 2.4) | ✅ |
| C3 | **Route collision:** v1 uses `/r/:publicId` for **resources**, and v2 used `/r/[token]` for prof reports. Old resource links in Messenger would open the report page | Prof reports move to `/prof/[token]`. `/r/:publicId` redirects to the v2 resource (PRD 1, 2, 3) | ✅ |
| C4 | Q&A and the Compiled report were extras built **after** the switch-over, but v1 already has Q&A content (about 39 KB) and all-subject reports. Shutting down v1 first would lose them | Both move into Stage 2, before the import and the switch-over (PRD 1, masterplan) | ✅ |
| C5 | `robots.txt` disallowing everything **and** a noindex header conflict. Crawlers blocked by robots.txt never see the noindex, and it can break link previews | Allow crawling and rely on `X-Robots-Tag: noindex, nofollow` + a meta tag (PRD 1, PRD 3) | ✅ |
| C6 | "Dark by default" vs "respect system light" (PRD 2 §11), and `tokens.css` has no `prefers-color-scheme` rule | Dark by default, Light only through a manual toggle saved in a cookie (same as v1's `defaultTheme="dark" switchable`) (PRD 2 §2, §11) | ✅ |
| C7 | The Tailwind `@theme` mapping named our near-white text `primary` and our indigo `accent`. shadcn uses `bg-primary` for primary buttons and `bg-accent` for menu hover, so buttons would render white and every menu hover indigo | The mapping now uses shadcn's names (`primary` = indigo fill, `accent` = hover bg). Our token is renamed `--accent` → `--brand`, because `shadcn init` writes its own `--accent` (PRD 2 §0, §13) | ✅ |
| C8 | Sessions had their own `status` (live/draft/published/noClass) **and** Payload's `_status` (draft/published), so "is it published?" had 2 sources of truth | `kind` (class/noClass) + `phase` (live/finished) + Payload `_status` (PRD 1 §4) | ✅ |
| C9 | Prof reports live on a public route (no login) but must show flags and maybe student numbers, which the privacy tests ban from public output | New **📋 report tier**: allowed only in `/prof/[token]` responses, with its own tests (PRD 1 §4, PRD 3 §1.2, CLAUDE.md) | ✅ |
| C10 | PRD 3 promises a "long-lived session on the phone", but Payload logins expire after 2 hrs by default, which would break mid-class | `auth.tokenExpiration` = 30 days. The offline queue pauses on a 401, asks you to log in, then replays (PRD 1 1.3, 1.8) | ✅ |
| C11 | The "More" tab lists different items in PRD 2 (Notes, Reports, Settings) and PRD 3 (Notes, Compiled, Settings) | Unified as Notes · Compiled report · Settings (PRD 2, PRD 3) | ✅ |
| C12 | Images get compressed to about 300 KB, but the proof upload accepted 5 MB | Proofs get the same browser compression, with a 1 MB server cap (PRD 1 2.4, PRD 3 §2.4) | ✅ |
| C13 | `rateLimits` uses a TTL index (it cleans itself up), yet PRD 3 had the System "prune" it | TTL only, no job (PRD 3 §1) | ✅ |
| C14 | Content flows use Draft → Published → **Archived**, but Payload `_status` only has draft/published, and there was no archive field | `archivedAt` on announcements, resources, and questions (PRD 1 §4) | ✅ |
| C15 | The masterplan's "What changed" boxes still said "a weekly backup job" and "Week 2", contradicting v1.2. Claude Code would read those as instructions | History moved to `CHANGELOG.md`. Open decision "padayon-os" removed, since it no longer shows up in Appwrite (masterplan) | ✅ |
| C16 | PRD 3 described Zoom AI, AI roster cleanup, AI change notes, and cross-posting as if they existed from day 1, though they're Stage 3 | Labeled *(Stage 3)*, with the pre-AI behavior written out (PRD 3 S5, S7, S10, F2, F7) | ✅ |

## B. Missing dependencies (something needed that no step builds or orders correctly)

| ID | Problem | Fix (where) | Status |
|---|---|---|---|
| D1 | **Rich-text editing in custom screens.** Payload's editor is built for `/admin`. Using it in custom screens means `RenderLexical`, which Payload marks *experimental, may change in minor releases*. v1 bodies are plain strings | **You picked Payload Lexical (v1.4).** Guardrails: trimmed features, one `RichTextEditor` wrapper, stable `RichText` for public pages, pinned versions, spike in step 0.7, `/admin` fallback, v1 text converted with `convertMarkdownToLexical` (PRD 1 §4.2, 0.7, 1.9, 2.2 · CLAUDE rule 14 · masterplan risk 6) | ✅ |
| D2 | Legacy links: only `/s/:id` redirected, but v1 also shares `/a/`, `/r/`, `/q/`, `/attendance/…`, `/reports/…`, and `/s/:id/questions`. Those redirects need the session and post IDs, which aren't imported until Stage 2 | Full redirect map in new step 2.3, after the import (PRD 1, PRD 3 P10) | ✅ |
| D3 | Import gaps: v1 links use `publicId` but v1 tables join on `$id` · `startsAt` is UTC, so morning classes would land on the previous day · imported students would get `enrolledOn` = import day and their old attendance wouldn't count · resources `category`/`resourceType` had no v2 field · v1 history has no target | `legacyId` = publicId + `legacyRowId` = $id · convert to Asia/Manila before taking the date · `enrolledOn` = term start · `resources.category` added · history goes to a read-only `legacyHistory[]` (PRD 1 1.6, 2.2, §4) | ✅ |
| D4 | **v1 media aren't in Appwrite** (both buckets are empty), so `mediaAssets.servedUrl` points elsewhere. Those images break when that host goes away | The import downloads each `servedUrl` and re-uploads it to `images` (PRD 1 2.2) | ✅ |
| D5 | The switch-over didn't say to freeze v1 or re-import. Records made in v1 between the import and the switch-over would be lost | Order: freeze v1 → final import re-run (idempotent) → switch domain (PRD 1 2.11) | ✅ |
| D6 | v1 data stays for a week after the switch-over **with `read("any")` still on**, so the leak would stay open | Strip every `any` permission from v1 tables at switch-over and delete `pushSubscriptions` rows (device tokens) right away. Delete the rest after 1 week. Retire `og-router` (PRD 1 2.11) | ✅ |
| D7 | No rule for which system holds real records before the switch-over (the Stage 1 gate class) | v1 stays the source of truth. The gate class is entered in both, and v2 practice data is wiped before the final import (PRD 1 gate) | ✅ |
| D8 | No list of env vars and keys. Steps silently needed `CRON_SECRET`, Appwrite key scopes, a v1 read key, and `GEMINI_API_KEY` | New PRD 1 §8: env + key inventory with the step that first needs each one | ✅ |
| D9 | Public session pages (1.11) show term totals, but the stats engine only appeared with reports (Stage 2) | The stats module (pure functions + tests) is built in 1.7 (PRD 1) | ✅ |
| D10 | 1.1's privacy test couldn't pass, because no collections exist yet | 1.1 builds the harness + a self-test on a fake collection. Every later step registers its fields (PRD 1) | ✅ |
| D11 | The one-request-at-a-time queue was only in 1.8 (offline), but 1.7 already saves taps, so 1.8 would rewrite them | 1.7 builds the ops endpoint + in-memory single-flight queue. 1.8 only adds offline persistence (PRD 1) | ✅ |
| D12 | "No Class for all subjects" is built in 1.7, but its only button was on the Dashboard (2.9) | The button lives on the Subjects list from 1.7. The Dashboard adds a shortcut later (PRD 1, PRD 3 S2) | ✅ |
| D13 | Class Home shows the "section name" and the Privacy Notice needs a contact, but nothing stores either | New Payload global `site` (className, siteName, privacyContact) (PRD 1 §4, 1.4) | ✅ |
| D14 | The cleanup Function had no way to reach the app's data safely | The Function calls `POST /api/cron/cleanup` with `CRON_SECRET`, and the logic stays in one codebase (PRD 1 2.4, PRD 3 §2.4) | ✅ |
| D15 | Custom routes under `/api/*` collide with Payload's REST catch-all (`/api/requests/submit` could be read as "find request id=submit") | Build them as **Payload custom endpoints** on their collections (PRD 1, PRD 3 §2.4) | ✅ |
| D16 | Image URLs: the Education plan allows about 100 image transformations a month, and nothing said to avoid them | Always use Appwrite `/view` URLs, never `/preview` (PRD 1 §2, CLAUDE.md) | ✅ |
| D17 | Privacy tests run in the Appwrite build, which may not reach the database. v1's Notes page has no table, so its notes likely live only in your browser | Privacy and logic tests must run without a database (PRD 1 §6). The switch-over checklist says to copy out v1 browser notes by hand (PRD 1 2.11) | ✅ |

## C. Missing rules (gaps that would become bugs)

| ID | Question nobody answered | Rule now (PRD 1 §4.1) | Status |
|---|---|---|---|
| R1 | Can you publish with students still "Not set"? | No. Publish is blocked until everyone has a status. Mark all Present fills **only** Not set rows | ✅ |
| R2 | Does an Excused day break an absence streak? | No. Excused days are skipped (they neither break nor extend a streak) | ✅ |
| R3 | What if you approve a request while the session has unpublished edits? | Blocked: "Publish or discard your edits first" | ✅ |
| R4 | What happens to requests that are never decided? | Auto-declined after 30 days, and the proof is deleted | ✅ |
| R5 | Does an approved "I recited" request replace the count or add to it? | Adds to it | ✅ |
| R6 | Is the absence limit based on scheduled days or held days? | ceil(20% × class days scheduled in the term), fixed at term setup. No Class days don't change it | ✅ |
| R7 | What does the Session tab open when you have 2+ classes today? | The one happening now. Otherwise the next one today. If it's unclear, a picker | ✅ |
| R8 | 2 meetings on the same weekday break the unique (subject, date) key | Validation: 1 meeting per weekday per subject | ✅ |
| R9 | "4 sort modes" were never named | Last name · First name · Most absences · Original order (v1's `displayOrder`) | ✅ |

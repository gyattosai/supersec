# PRD 3: App Flow, Pages, and Roles

> SuperSec v2 · **v1.6** · Updated Mon Oct 5, 2026 · Technical reference for Google Antigravity (AGY).
> Read with `masterplan.md` (overview), `AGENTS.md` (playbook), and `PRD-1` (data model, rules R1 to R9, env).

**TL;DR:** 3 human roles (Secretary, Classmate, Professor) plus the System. Only the Secretary logs in. There are 4 areas: `/app` (custom secretary screens), `/admin` (Payload back office), public pages (`/`, `/s/*`, `/privacy`), and prof reports (`/prof/*`). The only public write is `POST /api/requests/submit`. Features marked *(Stage 3)* don't exist until the extras are built.

---

## 1. Roles

| Role | How they get in | Can | Can't |
|---|---|---|---|
| **Secretary** (`owner`) | Email + password (Payload auth), 30-day session | Everything: all collections, `/app`, `/admin`, publishing, reports, links, Notes | n/a |
| **Classmate** (public) | Messenger link (unlisted, never indexed), no login | Read published Subjects, Sessions, posts, and history. Submit Requests (picks their name from the roster) | See 🔒/📋 fields, drafts, Notes, flags, reports, or other people's requests |
| **Professor** (public + token) | Secret report link `/prof/[token]` (+ public links) | Read their report (🌐 + 📋 fields, incl. Monitoring flags), print/PDF, CSV | Edit anything. The link stops working once it's reset |
| **System** | Appwrite Function (cron, daily) calling `POST /api/cron/cleanup` with `CRON_SECRET` | Delete proofs (R4), expire stale requests (R4) | Anything else. `rateLimits` expire on their own (TTL) |
| *Helper (Stage 4)* | *Login* | *Run sessions, review requests* | *Notes, private notes, flags, reports, settings* |

### 1.1 Permission matrix

C = create, R = read, U = update, P = publish, A = archive. "Public R" = published, `publicFields` only. "Report R" = `reportFields` (🌐 + 📋) through a valid token.

| Resource | Secretary | Classmate | Professor (token) | System |
|---|---|---|---|---|
| Site settings | RU | Public R | Public R | n/a |
| Terms | CRU | Name only | Name only | n/a |
| Subjects | CRUA | Public R | Public R | n/a |
| Students / enrollments | CRUA | Names on published sessions only | Report R | n/a |
| Student number | CRU | none | Report R (only if the PDFs require it) | n/a |
| Private notes, conflict flag, excuse reasons | CRU | none | none | n/a |
| Sessions | CRUPA | Public R | Report R | n/a |
| Requests | RU (approve/decline, R3) | **C only** (submit endpoint) | none | U (expire) |
| Proof files | R | Upload only (with request) | none | Delete |
| Announcements / Resources / Q&A | CRUPA | Public R | Public R | n/a |
| Notes | CRUD | none | none | n/a |
| Report links | CR, reset | none | R (own token only) | n/a |
| Monitoring flags | R (calculated) | **never** | Report R | n/a |
| Export all | Download | none | none | n/a |

### 1.2 How access is enforced

1. **Access functions branch on `req.payloadAPI`:** logged in → allowed. Anonymous + `local` → published only. Anonymous + `REST`/`GraphQL` → denied (except login).
2. Public pages call `lib/public/*` (Local API, `overrideAccess: false`, `select: publicFields`). Prof reports call `lib/report/*` (`select: reportFields`, after validating the token).
3. Field-level `access.read` hides 🔒 fields as a second layer.
4. The submit endpoint is the **only** public code allowed to use `overrideAccess: true`, after validation.
5. Every check in app code goes through `can(user, action, resource)`.

## 2. Page inventory

### 2.1 Public pages (no login)

Every public response sends `X-Robots-Tag: noindex, nofollow` + a robots meta tag. `robots.txt` allows crawling, so the noindex is seen and Messenger previews work. OG previews show the subject or post title only, never student names. `[subject]` is the subject slug, for example `olca113-k7q2`.

| # | Page name | Route | Function |
|---|---|---|---|
| P1 | **Class Home** | `/` | `site.className`, active subjects with "Next class", No Class notices |
| P2 | **Subject Page** | `/s/[subject]` | Header (code, name, prof, schedule), No Class banner, pinned posts, latest posts, recent sessions |
| P3 | **Session Page** | `/s/[subject]/sessions/[date]` | Published attendance + recitation per student, term totals (stats module), version/history, **"Something wrong?"** button |
| P4 | **Request Sheet** | (sheet on P3) | Pick type → pick your name → details (compressed photo) → send → "Sent, your secretary will review" |
| P5 | **Announcements list / detail** | `/s/[subject]/announcements` · `/…/[slug]` | Body, image, priority, history |
| P6 | **Resources list / detail** | `/s/[subject]/resources` · `/…/[slug]` | Link, category, up to 6 attachments, history |
| P7 | **Q&A browse / detail** | `/s/[subject]/qa` · `/…/[slug]` | Search, tags, Official badge |
| P8 | **History** | `…/[slug]/history` | Version list with public change notes, plus imported v1 history (`legacyHistory`) |
| P9 | **Prof Report** | `/prof/[token]` | Session/Subject/Compiled report, flagged table, print/PDF, CSV. `noindex` + `Referrer-Policy: no-referrer`. A reset link shows "Link expired" |
| P10 | **Legacy links** (301) | see map below | Old v1 links keep working |
| P11 | **Not found / Archived** | n/a | Friendly 404. Archived subjects/posts show "Archived" + read-only content |
| P12 | **Privacy Notice** | `/privacy` | What's shown publicly (names, attendance, recitation counts), what never is, how to request a correction, how long proofs are kept, and `site.privacyContact`. Linked in every public footer |

**P10 legacy link map** (from v1 `App.tsx`; `:publicId` matches `legacyId`):

| v1 link | Goes to |
|---|---|
| `/s/:publicId` | `/s/[subject]` (built in 1.11) |
| `/s/:publicId/questions` | `/s/[subject]/qa` |
| `/a/:publicId` | the announcement page |
| `/r/:publicId` | the **resource** page (that's why prof reports use `/prof/`) |
| `/q/:publicId` | the Q&A page |
| `/attendance/:publicId`, `/attendance/:publicId/proof`, `/attendance/:publicId/excuse` | the session page (P3) |
| `/reports/:publicId` | "This report moved, ask your secretary for the new link" (no data) |
| `/register`, `/auth` | `/login` |

### 2.2 Secretary pages (`/app`, login required)

| # | Page name | Route | Function |
|---|---|---|---|
| S0 | **Login** | `/login` | Email + password, 30-day session. Redirects to Dashboard |
| S1 | **Dashboard** | `/app` | Today's classes (Start buttons), No Class for all today (shortcut), pending requests, flagged students card, recent drafts |
| S2 | **Subjects** | `/app/subjects` | Subject cards (today first), shortcuts, Active/Archived filter, **No Class for all subjects** (pick a date + reason) |
| S3 | **Subject Home** | `/app/subjects/[id]` | 5 shortcuts (Start Class Session, Post Announcement, Add Resource, Mark No Class, Copy public link), "More" (Q&A, Reports), tabs: Sessions · Students · Posts · Requests · Monitoring |
| S4 | **Sessions list** | `/app/subjects/[id]/sessions` | Upcoming, Live, Finished, Published, No Class |
| S5 | **Class Session** | `/app/subjects/[id]/sessions/[date]` | Live roster: P/A/E/–, recitation stepper + topic, Mark all Present (R1), search, "recited today" filter, sync badge, Finish → Review → Publish (change note). *(Stage 3: Zoom paste with AI matching, AI change-note draft)* |
| S6 | **Roster** | `/app/subjects/[id]/students` | Enrolled students, R9 sorts, search, conflict flag, private notes, drop |
| S7 | **Roster Paste** | (sheet on S6) | Paste → rule-based preview (duplicates flagged) → confirm → enroll. *(Stage 3: AI cleanup + near-duplicates)* |
| S8 | **Requests Queue** | `/app/requests` (all) · `/app/subjects/[id]/requests` | Pending list, proof viewer, Approve/Decline (R3, R5), decided + expired history |
| S9 | **Posts** | `/app/subjects/[id]/posts` | Tabs: Announcements · Resources · Q&A. Filter: Draft/Published/Archived |
| S10 | **Post Editor** | `/app/posts/new?type=&subject=` · `/app/posts/[id]` | Title, body (Lexical editor via `RichTextEditor`, PRD 1 §4.2), image (with alt text)/attachments, priority/pin end, category, tags/official, Save draft, Publish (change note), Archive. *(Stage 3: extra subjects, i.e. cross-posting)* |
| S11 | **Reports** | `/app/subjects/[id]/reports` · `/app/reports/compiled` | Pick type/range, preview, Copy report link, Reset link, Print/PDF, CSV, Copy summary |
| S12 | **Monitoring** | `/app/subjects/[id]/monitoring` | Flagged students table, limit setting, filter by flag |
| S13 | **Notes** | `/app/notes` · `/app/notes/[id]` | List, search, subject filter, editor (same `RichTextEditor` as S10) |
| S14 | **Settings** | `/app/settings` | Theme, account, site settings (class name, privacy contact), active report links (with reset), Export all. *(Stage 3: AI on/off)* |
| S15 | **Share Sheet** | (sheet, from any shortcut) | Messenger fast-share: preview card, copy link, copy message |

### 2.3 Back office (`/admin`, Payload)

| # | Page | Function |
|---|---|---|
| A0 | Terms | Create a term (name, start date, end date) |
| A1 | Subjects | Create and edit subjects (term, schedule with 1 meeting per weekday, section, limit) |
| A2 | Students | Edit names, student numbers, and private notes, bulk fixes |
| A3 | Site | Class name, site name, privacy contact |
| A4 | All collections | Raw data, version restore, emergency edits |

### 2.4 API (all custom routes are **Payload custom endpoints**, never Next.js routes under `/api/*`)

| Endpoint | Defined on | Auth | Purpose |
|---|---|---|---|
| `POST /api/requests/submit` | `requests` | Public, rate limited | **The only public write.** Validates: session published, student enrolled, type, image only, ≤ 1 MB (already compressed), honeypot, 1 pending per student/session/type. Then creates the request with `overrideAccess: true` |
| `POST /api/sessions/:id/ops` | `sessions` | Secretary | Idempotent batch of roster taps (single-flight queue + offline replay) |
| `POST /api/cron/cleanup` | root `endpoints` | `CRON_SECRET` header | R4 cleanup, called daily by the Appwrite Function |
| `POST /api/ai/*` *(Stage 3)* | root `endpoints` | Secretary | Roster cleanup, Zoom matching, change-note draft |
| Payload REST/GraphQL | built in | Secretary (login is public) | Everything else |

## 3. User flows

### F1. First-time setup (once)
1. Open `/admin`, then create the owner account.
2. In `/admin`, fill in **Site** (class name, privacy contact) and create the **term** (for example "1st Sem 2026-27", start and end dates).
3. Create subjects (term, name, code, prof, schedule, section, absence limit). A slug like `olca113-k7q2` is generated.
4. Open S6 Roster, then **Paste roster**, review the preview (fix flagged duplicates), then confirm. *(Or run the v1 import, step 1.6.)*
5. Repeat step 4 for each subject. Existing students get matched, not duplicated.
6. On S3, tap **Copy public link** and send it in the class Messenger group.

### F2. Run a class session (the core loop)
1. Open the app and tap the **Session** tab (R7), or tap **Start** on Subjects/Dashboard.
2. S5 opens with all active enrolled students. Tap **Mark all Present** (fills only Not set rows).
3. Tap A or E on the exceptions. For recitation, tap **+1** each time someone recites (long-press to add a topic).
4. *(Stage 3)* Optional **Zoom paste**: review the AI suggestions, then confirm.
5. Tap **Finish**. Review shows the totals. Publish stays disabled while anyone is Not set (R1) or taps are still syncing.
6. Tap **Publish** and type a short change note *(Stage 3: AI drafts it)*. Version 1 is published on P3.

**Offline branch:** taps queue on your phone and the badge says "Offline · N unsaved". If your login expired, the app asks you to log in, then replays. The badge says "Saved" once everything syncs.

### F3. Mark No Class
1. On S3, tap **Mark No Class**, then pick the date (default: the next session), pick a reason (Holiday, Suspension, custom), then confirm.
2. The session is stored as `kind: noClass` and published. A banner appears on P1/P2, and it never counts in reports or limits (R6).
3. Optional: Share Sheet, then post to Messenger.

**F3b. No Class for all subjects (typhoon or school suspension)**
1. On S2 Subjects (or the Dashboard shortcut), tap **No Class for all**, pick the date (default today) and a reason ("Suspension: Typhoon").
2. Every subject with a class that day gets a No Class session in 1 action, and one banner appears on P1.
3. Share Sheet, then post 1 message to Messenger.

### F4. Edit a published session
1. Open S5 on a published session, then **Edit**. Changes autosave as a draft. The public page still shows the published version.
2. Make the changes, then **Publish** with a change note. The version goes up by 1, and P8 shows the note.
3. While the draft exists, approving requests for this session is blocked (R3).

### F5. Classmate sends a request
1. A classmate opens P3 from Messenger, then taps **Something wrong?**
2. They pick a type: I was present / Excuse / I recited.
3. They pick their name from the roster list (no typing).
4. Details: a screenshot (present), a reason + optional photo (excuse), or a count + topic (recited). Photos are compressed on the phone first.
5. They tap **Send**. The server validates and rate-limits it, then shows "Sent, your secretary will review."

### F6. Review requests
1. The Requests tab badge shows a count. Open S8.
2. Open a request to see the student, session, details, and proof image.
3. **Approve**: the session entry is updated (recited **adds** to the count, R5), a new published version with "Updated after review" is created, and the decision time is set. Blocked while the session has unpublished edits (R3).
4. **Decline** records the decision only.
5. The System deletes proofs 30 days after a decision and expires requests still pending after 30 days (R4).

### F7. Post an announcement / resource / Q&A
1. On S3, tap the shortcut (or S9, then **New**).
2. S10: write the content. Optional: image or attachments (compressed in the browser), Priority + pin end date, category (resources), tags/official (Q&A). *(Stage 3: extra subjects.)*
3. **Save draft** or **Publish**. Edits after publishing ask for a change note. **Archive** hides it from lists and keeps the link working read-only.
4. The Share Sheet opens. Copy the link or message for Messenger.

### F8. Send a report to the prof
1. Open S11 (subject) or Compiled, then pick the type and range.
2. Preview, then **Copy report link** (`/prof/[token]`). The link is created on first use.
3. Paste it into Messenger or email to the prof.
4. Optional: **Print / Save PDF**, stamped with the version and date.
5. If the link leaks: S11 or S14, then **Reset link**. The old link shows "Link expired."

### F9. Monitor absences
1. The Dashboard card says "5 students flagged", so tap it to go to S12 (or the subject's Monitoring tab).
2. Filter by flag. Open a student to see their absences, excused count, streak (Excused days skipped, R2), and last attended.
3. Use the prof report (F8) for administrative flagging.

### F10. Notes
1. More, then **Notes**, then **New**. Add a title, body, and optional subject.
2. Find notes later with search or the subject filter. Notes are never shared.

### F11. End of term
1. Generate the Compiled report (F8) and save the PDFs.
2. Archive each subject from S3. Public links show "Archived", and everything stays readable.

### F12. Backups and restore
1. Atlas Flex takes a snapshot every day and keeps the last 8. Nothing to build.
2. Anytime: S14, then **Export all**, to download every collection as JSON.
3. Restore (rare): restore a snapshot into a scratch cluster first, check the counts, then restore for real. To use an export instead, run `scripts/restore.ts` into a scratch database first.

### F13. Switch-over (once, PRD 1 step 2.11)
1. Copy anything typed into v1's Notes page.
2. Wipe v2 practice records, freeze v1, and re-run the full import.
3. Run the privacy audit, then move the domain to v2.
4. Immediately strip every `any` permission from v1 tables and delete `pushSubscriptions` rows. Delete `og-router` and stop the v1 Site.
5. After 1 week of v2 running cleanly, delete v1's databases and buckets.

## 4. Edge cases (must handle)

1. **Schedule changes mid-term:** existing sessions keep their dates. Only future virtual sessions change.
2. **Student enrolls late:** they only show up in sessions after `enrolledOn`, and earlier sessions don't count against them. Imported v1 students get `enrolledOn` = term start.
3. **Student dropped:** hidden from new sessions, and their history stays in reports, marked "Dropped".
4. **Two taps from 2 devices:** the last write wins per entry. Replay order comes from timestamps + idempotency keys.
5. **Request for an unpublished or No Class session:** blocked with a friendly message.
6. **Duplicate request:** "You already sent this. Your secretary will review."
7. **Report link reset while the prof has it open:** the next load shows "Link expired".
8. **AI unavailable (Stage 3):** a toast says "AI is unavailable, do it manually", and the manual path is always visible.
9. **Archived subject or post:** read-only everywhere. The shortcuts are hidden.
10. **Term ended:** no more virtual sessions, and Monitoring freezes on the final numbers.
11. **Dates:** class days are always `YYYY-MM-DD` in Asia/Manila. v1's UTC `startsAt` is converted before taking the date, so a 7:30 AM class never lands on the day before.
12. **Rapid taps:** queued and sent one request at a time. Two quick taps on different students can never overwrite each other.
13. **Login expires mid-class:** taps stay queued, the app asks you to log in, then replays them.
14. **2+ classes today:** the Session tab follows R7.

## 5. Navigation map

```
Public:  /  →  /s/[subject]  →  sessions/[date] (→ Request Sheet)
                            →  announcements | resources | qa  →  [slug]  →  history
         /privacy (footer)       /prof/[token] (prof report, standalone)
         v1 links (/a, /r, /q, /attendance, /reports, /s/:id) → 301 map (P10)

Secretary (mobile tabs): Home(S1) · Subjects(S2→S3→S4/S5/S6/S9/S11/S12) · Session(S5, R7) · Requests(S8) · More(S13 Notes · S11 Compiled report · S14 Settings)
Back office: /admin
```

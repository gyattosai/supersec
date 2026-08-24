# Class Management System — Key Surface Specifications

**Milestone:** 1 — Product design  
**Status:** Draft product-design specification  
**Design foundation:** [Design Foundation](design-foundation.md)  
**Scope:** Behavior, hierarchy, content, states, and responsive rules; no app implementation

## 1. Shared design rules

Every page answers one main question. Secretary pages answer a management question and show a clear primary action. Public pages answer a class-information question and never show management controls. Every page begins with enough context to tell the user where they are and includes a predictable path back.

| Rule | Secretary area | Public pages |
|---|---|---|
| Current Subject | Always visible in the header or page title | Always visible at the top of the page |
| Primary action | One clear action per page | No editing or publishing action |
| Back path | Dashboard or Subjects link | Home link for the current Subject |
| History | Shows change details plus private details where needed | Shows version and public change summary only |
| Privacy | Can show raw Zoom names, notes, and review work | Never shows raw Zoom names, unclear matches, private notes, or unpublished changes |
| Dark mode | Uses the default dark foundation | Uses the same dark foundation with less management chrome |

## 2. Secretary pages

### 2.1 Dashboard

**Question:** What needs attention across my Subjects?

| Area | Mobile layout and content | Desktop adaptation |
|---|---|---|
| Header | “Dashboard”, current date, compact profile/Settings access | Same title with profile area in sidebar or top bar |
| Attention block | First block; shows Attendance to finish, active No Class notices, and recently updated items | Two-column summary with the same priority order |
| Subjects | List of Subject cards showing code, professor, next class or No Class status, and the next action | Responsive card grid; each card retains the same order |
| Recent updates | Short History list with Subject name and item type | Secondary column below or beside Subject cards |
| Primary action | “Add Subject” | “Add Subject” in header and empty state |

**Empty state:** “No Subjects yet. Add your first Subject to keep Attendance, class updates, and links in one place.”  
**Error state:** “Dashboard could not load. Try again.” Keep an obvious retry action.

### 2.2 Subjects

**Question:** Which Subject do I need to manage?

The list shows active Subjects first, then Archive. Each Subject row uses name, code, professor, fixed weekday Schedule, Student count, and a status line: next class, No Class, or “Schedule needs attention.” Search is added only when the number of Subjects makes scanning difficult; it is not a primary mobile control for the initial three Subjects.

**Primary action:** “Add Subject.”  
**Card action:** Open Subject.  
**Archive state:** Separate but visible; opening an archived Subject is read-only until restored.

### 2.3 Subject Home — secretary view

**Question:** What is important for this Subject right now?

The secretary view uses the same top identity block as the public Home page, then adds management context. The required identity content stays in the same order so sharing and management pages feel related.

| Priority | Content | Behavior |
|---|---|---|
| 1 | Subject name, code, professor, fixed weekday Schedule | Always visible; tap code or title only if a simple edit path is available |
| 2 | No Class notice or next class session | Uses warning treatment for No Class; neutral treatment for next class |
| 3 | Main actions: Record Attendance, Add Announcement, Add Resource, Add Question & Answer | On mobile, one primary action is prominent based on urgency; other actions live in a clear action menu |
| 4 | Current content | Latest Announcement, recent Resources, and recent Questions & Answers |
| 5 | Secretary-only activity | Unfinished Attendance, unclear Zoom-name suggestions, and unpublished drafts |

**Primary action rule:** If a current class session has unfinished Attendance, show **“Finish Attendance”**. Otherwise show **“Record Attendance”** for the next or selected session. Do not show more than one filled primary button at once.

### 2.4 Attendance — session list

**Question:** Which class session needs work or review?

The list groups sessions by month and shows date, weekday, status, capture time when available, version, and a short total. A No Class session looks clearly different from a class session and cannot show Attendance actions.

| Session status | Visual treatment | Main action |
|---|---|---|
| Not started | Quiet neutral row | “Record Attendance” |
| Review required | Warning badge and clear count of unclear/unmatched names | “Review names” |
| Ready to publish | Information badge | “Review and publish” |
| Published | Success badge, version, and totals | “View Attendance” |
| Updated | Success/neutral badge with version change | “View History” |
| No Class | Warning badge with reason | “View notice” |

**Empty state:** “No class sessions yet. Add the fixed weekday Schedule in Settings.”

### 2.5 Attendance — Zoom-name review

**Question:** Can I safely publish Attendance for this class session?

This is the most important secretary workflow. It must make the difference between an LLM suggestion and a confirmed Attendance record unmistakable.

1. The header shows Subject, date, class session, and capture time.
2. The input area labels pasted text as **“Zoom names”** and states: “Suggestions need your review before Attendance is published.”
3. Results are separated into **Clear matches**, **Needs review**, and **No match**. This is a content grouping, not a score hidden behind an icon.
4. Each result shows the pasted name, suggested Student when available, and the secretary’s available action: confirm, choose a different Student, mark as no match, or leave for later.
5. The Student status list uses only PRESENT, ABSENT, and NOT SET. NOT SET is the safe default until the secretary decides.
6. The footer shows the number still needing review and keeps the publish action disabled until required review is complete.

| State | Message and recovery |
|---|---|
| No Students | “Add Students before recording Attendance.” Action: “Add Students.” |
| No pasted names | “Paste Zoom names from a screenshot or participant list.” |
| LLM unavailable | “Name suggestions are unavailable. You can still review names manually.” |
| Unclear name | “Needs review. Choose a Student or mark no match.” |
| Ready to publish | “All required name reviews are complete.” Action: “Publish Attendance.” |
| Publish success | “Attendance published. Version 1 is now visible in the public view.” |

### 2.6 Attendance — public view

**Question:** What Attendance was published for this class session?

The public view shows Subject context, class date, official statuses, totals, version number, and public change summary. It never includes Zoom names, suggestion confidence, notes, or the secretary’s review work. If the page is no longer available, explain this in plain language and link back to Home if the Subject remains public.

### 2.7 Announcements

**Question:** What official updates were posted for this Subject?

The list uses a clear reading-first layout. A pinned item appears first without changing its original date. Each item shows title, date, update state, short preview, and optional image or media cue. The secretary can create, edit, publish, or archive; public readers can open the item and return to Home.

**Editor hierarchy:** title → main text → links/media → public change summary → preview → publish.  
**Draft state:** “This Announcement is only visible to you.”  
**Updated state:** “Updated in version 2” plus the public change summary.

### 2.8 Resources

**Question:** Which links and materials are available?

Resources use the visual card pattern. Cards are easy to scan on mobile and never depend on a web thumbnail loading correctly.

| Card element | Required content |
|---|---|
| Image area | External preview when safe; otherwise the designed fallback thumbnail |
| Type | Google Drive, Google Forms, Website, Facebook, Image, Zoom, or another plain category |
| Title | Clear title written by the secretary |
| Description | Why the Resource matters or what it contains |
| Source | Domain or source label |
| Action | “Open link” and public share link in secretary view |
| Context | Pinned state, updated state, and History link when available |

**Unavailable link:** “This link may no longer be available.” Keep the card metadata visible and offer a return to Resources.  
**No Resources:** “Save important links here so classmates can find them later.” Action: “Add Resource.”

### 2.9 Questions & Answers

**Question:** Has this question already been answered?

The list is a calm forum-like reading surface, not a chat screen. It supports a search field, topic tags, official state, update state, and an individual shareable page. The secretary receives questions in Messenger, then turns useful repeated questions into durable entries.

**Main actions:** “Add Question & Answer” and “Copy link.”  
**Official cue:** text label “Official answer” plus a check icon; never color alone.  
**No items:** “Save repeated Messenger questions here so you only need to answer once.”

### 2.10 Schedule and No Class

**Question:** When do we meet, and is there a change?

The Schedule page begins with the fixed weekday rule. It then shows upcoming class sessions and No Class notices in date order. A No Class notice always names the date and reason: Holiday, School event, Weather, or custom reason.

No Class is an important exception, not an error. Its warning color must be paired with an explicit label and reason.

### 2.11 Sharing

**Question:** What will classmates see when I send this link?

Sharing is secretary-only. It shows the stable public link, the Messenger-ready text, and preview fields for title, description, and image. Attendance preview fields use neutral context and must not reveal private or sensitive information.

**Primary action:** “Copy Messenger message.”  
**Preview fallback:** If no custom image is available, the page uses the Subject image or safe default graphic.  
**Important notice:** “Messenger previews can take time to refresh after an update.”

### 2.12 Settings and Archive

Settings groups Subject identity, Students, fixed weekday Schedule, and archive actions. Destructive actions require a clear explanation and a confirmation only when the action cannot be easily undone. Archive keeps the full Subject History and uses a restore action rather than deletion.

## 3. Public pages

### 3.1 Public Home

Public Home is the main destination for a Messenger link. It has no secretarial controls. It uses the identity block, current No Class or next class context, destination links, and a small set of recent content. It should feel complete at the top of a phone screen without needing a long scroll to understand the Subject.

**Public bottom navigation:** Home, Attendance, Announcements, Resources, and Questions & Answers. Schedule appears from Home and from the top context area when a date change needs attention.

### 3.2 Public deep links

Public Announcement, Resource, Question & Answer, Attendance, and Report pages include these elements in the first screenful: Subject identity, item type, title or date, last updated context, and a labeled **“Back to Home”** link. No deep page relies on browser back as the only escape path.

## 4. Responsive behavior

| Pattern | Mobile | Desktop |
|---|---|---|
| Secretary navigation | Bottom navigation plus More sheet | Persistent sidebar |
| Public navigation | Bottom navigation for main destinations | Slim top navigation or left rail, depending on reading width |
| Subject identity | Full-width top block | Top block remains full width; optional side facts on wide layout |
| Resource cards | One card per row | Two or three cards per row, but card text never becomes cramped |
| Attendance review | Stacked rows; review controls remain visible | Two-column review list and Student-status panel when space permits |
| Editors | Full-screen focus flow | Centered editor with preview panel where helpful |
| Sheets and dialogs | Bottom sheet for reversible secondary work | Anchored menu or centered dialog based on task weight |

## 5. Core state map

| State | When it appears | Required design response |
|---|---|---|
| Loading | Data or preview is being retrieved | Skeleton preserves page structure; do not show a blank dark screen |
| Empty | The user has not created content yet | State explains purpose, shows what will appear, and offers the first action |
| Error | A save, load, upload, or preview action fails | Plain-language cause when known, retry action, and no lost draft work |
| Unavailable | Public item is archived, removed, or no longer public | Explain what happened and provide Home route when allowed |
| Draft | Secretary created but has not published content | Private label and no public link action |
| Published | Item is public | Show version, updated date, and share action in secretary view |
| Updated | Published item changed | Show version number and public change summary |
| Review required | Attendance name suggestion needs secretary decision | Warning label, clear count, direct action, and blocked publish until handled |
| No Class | A normal class session does not happen | Prominent date, reason, and no Attendance action |

## 6. Copy and feedback rules

| Situation | Required wording pattern |
|---|---|
| LLM suggestion | “Suggestion — review before publishing.” |
| Unclear name | “Needs review” rather than a percentage or hidden confidence score. |
| Private area | “Only you can see this.” |
| Public item | “Visible to classmates with this link.” |
| Draft | “Not published yet.” |
| Media failure | “Upload did not finish. Your draft is still saved.” |
| Public link missing | “This page is no longer available.” |
| No Class | “No Class on [date] — [reason].” |
| History | “Updated in version [number]: [public change summary].” |

## 7. Product-design review checklist

The final visual designs must show every surface in its default, empty, loading, error, and key special states. The review must confirm that public and secretary-only content never mix; the Subject Home always shows required details; Attendance cannot appear automatically confirmed; dark mode remains readable; and all primary mobile paths are reachable without hidden gestures.

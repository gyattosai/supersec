# CONTEXT.md: SuperSec shared language

> SuperSec v2 · docs **v1.6** · Updated Mon Oct 5, 2026
> The words MJ and Google Antigravity both use, in chat, UI copy, code names, and commits. **One word, one meaning.** Use the **bold** word. The *Avoid* column lists words that mean something else here (or nothing).
> Fields and data types: `SCHEMA.md`. Rules R1 to R9: PRD 1 §4.1. New word? Propose it with a one-line meaning, get MJ's OK, then add it here.

## Map

```
Class (your class group, e.g. Class Home)
└─ Term
   └─ Subject ── Meetings (weekly schedule)
      ├─ Roster: Enrollment ── Student
      ├─ Session (1 per Class day)
      │   ├─ Entry (1 per enrolled Student)
      │   └─ Request ── Proof
      ├─ Posts: Announcement · Resource · Question (Q&A)
      └─ Reports: Session report · Subject report ─┐
Compiled report (all Subjects) ─────────────────────┴── Report link
Notes (your private notebook)
```

## People

| Word | Means | Avoid |
|---|---|---|
| **Secretary** | You. The only login. Runs Sessions, Posts, Requests, and Reports | admin, user |
| **Classmate** | Anyone who opens a Public link. Reads Published pages and sends Requests. Never logs in | student (that's a roster record), visitor |
| **Student** | A person on a Roster. A record, never an account | classmate (for the record), member |
| **Prof** | A Subject's professor. Reads Reports through a Report link | teacher, instructor |
| **Helper** | Stage 4 only: a second login that runs Sessions and reviews Requests | co-secretary, assistant |

## Calendar

| Word | Means | Avoid |
|---|---|---|
| **Class** | Your whole class group, shown on Class Home. Fixed UI phrases "Next class" and "No Class" are fine | a Subject or a Session |
| **Term** | A school term with a start and end date. Every Subject belongs to one | semester, school year |
| **Subject** | One course in a Term: code, name, Prof, Section, Meetings | course, class |
| **Section** | The block code on a Subject: N001 (full: OLCA113N001) | block, group |
| **Meeting** | One weekly slot of a Subject: weekday, start, end. Max 1 per weekday | slot, period |
| **Class day** | A date where a Meeting falls inside the Term | meeting day |

## Roster

| Word | Means | Avoid |
|---|---|---|
| **Roster** | The Students with an Active Enrollment in one Subject | class list, members |
| **Enrollment** | A Student's place in one Subject, from their enrollment date until Dropped | membership |
| **Dropped** | An Enrollment that ended. Hidden from new Sessions. Old Entries stay, and Reports show "Dropped" | removed, deleted |
| **Conflict flag** | Private marker: this Student has a schedule conflict in this Subject | (not a Flag) |
| **Roster paste** | Pasting a list of names to enroll many Students at once, with a preview | import |
| **Private note** | A hidden remark on one Student. Not a Note | comment |

## Sessions and attendance

| Word | Means | Avoid |
|---|---|---|
| **Session** | One Subject on one Class day. Either a Class Session or a No Class | meeting, attendance sheet, record |
| **Class Session** | A Session where class happened. Has 1 Entry per enrolled Student | regular session |
| **No Class** | A Session where class didn't happen, with a reason (Holiday, Suspension, or your own). Never counts in stats | cancelled, off |
| **No Class for all** | 1 action: No Class on every Subject that meets that day | mass cancel |
| **Entry** | One Student's line in a Session: Attendance, Recitations, Topic | record, mark |
| **Attendance** | Exactly one of **Present** (P), **Absent** (A), **Excused** (E), **Not set** (`–`) | status. There is no Late |
| **Recitation** | One time a Student recited. Counted with +1 / −1, with an optional **Topic** | participation, points |
| **Mark all Present** | Turns every Not set Entry into Present. Never touches P, A, or E | fill all |

**Session states, in order:**

| Word | Means | Avoid |
|---|---|---|
| **Upcoming** | A Class day from the schedule with nothing saved yet | scheduled, planned |
| **Live** | Being taken right now. Every tap saves | in progress, ongoing, open |
| **Finished** | Taking is done and the totals are reviewed. Not public yet | closed, done |
| **Published** | The version Classmates see. Each Publish makes a new Version | live, posted, final |
| **Unpublished edits** | Changes on a Published Session that Classmates can't see yet. They block approving its Requests (R3) | draft |

## Stats and monitoring

| Word | Means | Avoid |
|---|---|---|
| **Held session** | A Published Class Session in the Term, between the Student's enrollment date and drop date. The only Sessions stats count | |
| **Attendance %** | Present ÷ (Held sessions − Excused) | score, rate |
| **Absence limit** | Max Absents per Subject: 20% of the Term's Class days, rounded up, fixed when the Term is set up (R6). You can type your own number instead | allowance, quota |
| **Flag** | A computed absence warning on a Student. Seen by you and Profs, never by Classmates | alert, status |
| **Watch** · **At Risk** · **Exceeded** | Flags at 50% · 75% · 100% of the Absence limit used | |
| **No Attendance** | Flag: 0 Present across all Held sessions | |
| **Streak** | Flag: 3+ Absent in a row. Excused days are skipped (they neither break nor extend it) | |
| **Monitoring** | The screen that lists flagged Students | tracking |

## Requests

| Word | Means | Avoid |
|---|---|---|
| **Request** | A Classmate asking to fix one Entry. 3 types: **I was present**, **Excuse**, **I recited** | ticket, appeal, complaint, report |
| **Proof** | An optional screenshot on a Request. Private. Deleted 30 days after a decision | evidence, attachment |
| **Pending** → **Approved** / **Declined** | A Request waits, then you decide | accepted, rejected |
| **Expired** | A Request nobody decided within 30 days | |

## Posts

| Word | Means | Avoid |
|---|---|---|
| **Post** | The umbrella word for Announcement, Resource, and Question. Goes **Draft** → **Published** → **Archived** | content, article, item |
| **Announcement** | A Post that tells Classmates something. Can have an image and Priority | update, notice, news |
| **Priority** | An Announcement pinned on top until its pin end date | sticky, urgent |
| **Resource** | A Post that shares a link and/or up to 6 files, with 1 **Category** | material, file |
| **Question** | A Post with a question, an answer, **Tags**, and maybe the **Official** badge. The section is called **Q&A** | FAQ |
| **Official** | Badge on a Question: the answer came from the Prof or the school | verified |
| **Archived** | Off the lists, still readable at its link, can be restored. Subjects can be Archived too | deleted, hidden, trash |
| **Change note** | One public sentence about what changed, typed at each Publish | commit message, reason |
| **Version** · **History** | Each Publish saves a Version. History lists them with their Change notes, plus imported v1 history | revision, log |

## Sharing and reports

| Word | Means | Avoid |
|---|---|---|
| **Public link** | An unlisted link Classmates open from Messenger. Search engines never index it | share link |
| **Share Sheet** | Copies a link + message to paste into Messenger | fast-share button |
| **Report** | A read-only summary for a Prof: **Session report**, **Subject report**, or **Compiled report** (all Subjects) | export, printout |
| **Report link** | The secret link that opens one Report. **Reset** kills it and makes a new one | prof link, secret link |
| **Export all** | Downloads all your data as one backup file | backup (that's Atlas's daily snapshot) |

## Privacy

| Word | Means | Avoid |
|---|---|---|
| **Privacy tier** | Who may see a field: **Public** 🌐, **Report-only** 📋, or **Private** 🔒. No tier = Private | visibility |
| **Public** 🌐 | Classmates see it once Published | |
| **Report-only** 📋 | Only inside a Report link | |
| **Private** 🔒 | Only you | |
| **Note** | A page in your private notebook, with an optional Subject tag. Never public, never sent to AI | memo |

## Actions (button verbs)

Start · Finish · Publish · Edit · Discard edits · Mark No Class · Mark all Present · Approve · Decline · Paste roster · Drop · Archive · Restore · Copy report link · Reset link · Share.

1. **Drop** ends 1 Enrollment. The Student stays in their other Subjects.
2. **Delete** exists only for Notes. Everything else gets Archived.
3. Saving is automatic, so there's no Save button on the Session screen.

## Project words

| Word | Means | Avoid |
|---|---|---|
| **v1** · **v2** | v1 = the SuperSec live today. v2 = this rebuild | old app, new app |
| **Import** | The copy of v1 data into v2 (practice runs, then a final run at Switch-over) | migration, sync |
| **Switch-over** | The day v2 takes the domain and v1 gets locked | launch, cutover |
| **Stage** · **Step** | Build order in PRD 1: Stages 0 to 4, Steps like 1.9 | sprint, milestone |

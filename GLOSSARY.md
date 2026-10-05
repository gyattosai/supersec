# SuperSec Domain Glossary

SuperSec is a class secretary management application: a phone-first console for one secretary, unlisted read-only pages for classmates, and secret report links for professors.

## People

**Secretary**:
The single primary user and account holder who manages sessions, rosters, posts, requests, and reports.
_Avoid_: Admin, superadmin, user, manager

**Classmate**:
Any student in the class who opens an unlisted public link to view published schedules, attendance, posts, or submits requests. Classmates never log in.
_Avoid_: User, visitor, student (when referring to the person browsing)

**Student**:
A roster record representing an individual enrolled in a subject. A student is a database record, never an authenticated account.
_Avoid_: Member, classmate (when referring to the roster row), user

**Prof**:
A subject instructor who reviews attendance and recitation summaries through a secret report link.
_Avoid_: Teacher, instructor, faculty

**Helper**:
A secondary secretary login who can run live sessions and review requests on behalf of the secretary.
_Avoid_: Co-secretary, assistant, moderator

## Calendar & Structure

**Class**:
The entire cohort of students and shared schedule represented on the home dashboard.
_Avoid_: Course, subject, session

**Term**:
An academic period with defined start and end calendar dates that contains subjects and sessions.
_Avoid_: Semester, school year, grading period

**Subject**:
A specific course within a term identified by code, name, professor, section, and meeting schedule.
_Avoid_: Class, course

**Section**:
The administrative cohort code assigned to a subject.
_Avoid_: Block, group

**Meeting**:
A recurring weekly time slot for a subject with a designated weekday, start time, and end time.
_Avoid_: Slot, period, class hour

**Class Day**:
A calendar date on which a subject meeting is scheduled to occur within the term.
_Avoid_: Meeting day, school day

## Roster & Enrollment

**Roster**:
The list of students actively enrolled in a subject.
_Avoid_: Class list, directory, members

**Enrollment**:
A student's active registration in a subject, spanning from their enrollment date until dropped.
_Avoid_: Membership, subscription

**Dropped**:
The inactive state of an enrollment that has ended. Dropped students are hidden from future sessions while preserving historical records.
_Avoid_: Removed, deleted, expelled

**Conflict Flag**:
A private secretary marker indicating a student has an overlapping schedule conflict during a subject's meeting time.
_Avoid_: Warning, note, flag (unqualified)

**Roster Paste**:
The bulk intake action of pasting multiple student names to create roster enrollments with preview validation.
_Avoid_: Import, bulk upload

**Private Note**:
A confidential remark attached to a student record, visible only to the secretary.
_Avoid_: Comment, annotation, note (when referring to the student remark)

## Sessions & Attendance

**Session**:
The record of a subject on a single class day, classified either as a class session or a no class day.
_Avoid_: Meeting, attendance sheet, class record

**Class Session**:
A session in which class convened, containing an entry for every active enrolled student.
_Avoid_: Regular session, class meeting

**No Class**:
A session marked as not convened due to a holiday, suspension, or secretary-specified reason.
_Avoid_: Cancelled class, off day, holiday

**Entry**:
The single row within a session corresponding to one enrolled student, containing attendance, recitations, and topic.
_Avoid_: Record, row, mark

**Attendance**:
The presence classification of a student in a session: Present, Absent, Excused, or Not Set. There is no Late status in SuperSec.
_Avoid_: Status, grade, participation mark

**Recitation**:
A tally of times a student recited or actively contributed during a session, adjusted with increment or decrement taps.
_Avoid_: Participation, points, recitation score

**Topic**:
An optional description attached to a student's recitation recording what subject matter they answered.
_Avoid_: Note, subject, remark

**Mark All Present**:
The one-tap action that populates every Not Set entry in a session with Present, leaving existing entries unchanged.
_Avoid_: Fill all, check all, mark all

## Session Lifecycle

**Upcoming**:
A scheduled future class day that has not yet been started or saved.
_Avoid_: Scheduled, planned

**Live**:
A session currently in progress where secretary attendance taps are immediately recorded.
_Avoid_: In progress, ongoing, open

**Finished**:
A completed session where taking attendance is concluded and totals are reviewed, but not yet made visible to classmates.
_Avoid_: Closed, done, completed

**Published**:
The public state of a session that makes its attendance and recitation data visible to classmates and professors.
_Avoid_: Live, posted, final

**Unpublished Edits**:
New draft modifications made to a previously published session that have not yet been republished.
_Avoid_: Draft, pending changes

## Stats & Monitoring

**Held Session**:
A published class session within the term that occurred between a student's enrollment date and drop date.
_Avoid_: Completed session, valid session

**Attendance %**:
The ratio of Present marks divided by held sessions minus Excused absences.
_Avoid_: Attendance score, attendance rate, grade

**Absence Limit**:
The maximum allowed unexcused absences for a subject, determined at term setup or customized by the secretary.
_Avoid_: Absence quota, cut allowance, threshold

**Flag**:
An automated warning indicating a student's absence count has crossed a monitoring threshold.
_Avoid_: Alert, penalty, demerit

**Watch**:
A monitoring flag triggered when a student reaches 50% of the absence limit.
_Avoid_: Low risk, warning 1

**At Risk**:
A monitoring flag triggered when a student reaches 75% of the absence limit.
_Avoid_: Medium risk, warning 2

**Exceeded**:
A monitoring flag triggered when a student reaches or surpasses 100% of the absence limit.
_Avoid_: Dropped, failed, maxed out

**No Attendance**:
A monitoring flag triggered when an enrolled student has zero Present marks across all held sessions.
_Avoid_: Inactive, ghost

**Streak**:
A monitoring flag triggered when a student accumulates three or more consecutive absences. Excused sessions neither break nor extend a streak.
_Avoid_: Consecutive absences, absent run

**Monitoring**:
The secretary dashboard screen that highlights students flagged for attendance warnings.
_Avoid_: Tracking, alerts page

## Requests & Proofs

**Request**:
A submission sent by a classmate requesting a correction to their session entry.
_Avoid_: Ticket, appeal, complaint, inquiry

**Proof**:
An optional image attached to an excuse request, kept private and purged automatically after 30 days.
_Avoid_: Attachment, evidence, receipt

**Pending**:
The initial state of a submitted request awaiting secretary review.
_Avoid_: Open, unreviewed

**Approved**:
The decision state where the secretary accepts a request, automatically applying the change to the session entry.
_Avoid_: Accepted, granted

**Declined**:
The decision state where the secretary rejects a request without modifying the session entry.
_Avoid_: Rejected, denied

**Expired**:
The terminal state of a pending request that was not decided within 30 days.
_Avoid_: Closed, lapsed

## Posts & Updates

**Post**:
The umbrella concept for communication items published to classmates, comprising announcements, resources, and questions.
_Avoid_: Article, feed item, content

**Announcement**:
A post communicating general class news, events, or reminders, with optional image and priority pinning.
_Avoid_: Notice, broadcast, news

**Priority**:
A setting on an announcement that pins it to the top of the feed until its designated expiration date.
_Avoid_: Sticky, urgent, featured

**Resource**:
A post providing classmates with reference materials, including an external link and up to six file attachments.
_Avoid_: Material, download, link

**Question**:
A structured Q&A post featuring a specific inquiry and its authoritative answer.
_Avoid_: FAQ, discussion, thread

**Official**:
A badge on a question indicating the answer was confirmed directly by the professor or school administration.
_Avoid_: Verified, endorsed, certified

**Archived**:
The soft-deleted state of a post or subject that removes it from public listings while retaining access via direct link.
_Avoid_: Deleted, hidden, trashed

**Change Note**:
A concise summary provided by the secretary describing modifications made when publishing a new version.
_Avoid_: Commit message, edit summary, revision note

**Version**:
An immutable snapshot of a session or post saved each time it is published.
_Avoid_: Revision, history state

**History**:
The chronological log of published versions and change notes for a session or post.
_Avoid_: Audit log, timeline

## Sharing & Reports

**Public Link**:
An unlisted URL shared with classmates that grants read access without search engine indexing.
_Avoid_: Share link, open link

**Share Sheet**:
A mobile UI modal that copies pre-formatted text and links ready to paste into group chats.
_Avoid_: Quick share, export dialog

**Report**:
A formal attendance and recitation summary prepared for a professor.
_Avoid_: Export, printout, transcript

**Session Report**:
A report covering attendance and recitation for a single class session.
_Avoid_: Single report, daily sheet

**Subject Report**:
A comprehensive report covering all sessions and student standings for a single subject.
_Avoid_: Course summary, class report

**Compiled Report**:
A master report aggregating attendance and recitation summaries across all subjects in a term.
_Avoid_: Master export, total report

**Report Link**:
A secret tokenized URL that gives a professor direct read-only access to a specific report without logging in.
_Avoid_: Prof link, secret URL

**Export All**:
A full downloadable archive of all secretary data for offline backup.
_Avoid_: Backup (which refers to managed database snapshots)

## Console & Navigation

**Subject Home**:
The dedicated operational hub for an individual subject in the secretary console (`/console/subjects/[id]`), providing quick actions (Start Session, No Class, Public Link) and tabs for Sessions, Roster, Requests, Monitoring, and Reports.
_Avoid_: Subject detail, subject dashboard, course page

**Console Dashboard**:
The secretary's central command center (`/console/dashboard`), presenting high-level summaries (Today's classes, Pending Requests counter, At-Risk counter, All Subjects grid) and global action shortcuts ("No Class for all").
_Avoid_: Home, main page, overview

## Privacy Tiers

**Privacy Tier**:
The access classification defining who may view a specific data field.
_Avoid_: Visibility, permission level

**Public**:
The tier for fields visible to classmates and professors once published.
_Avoid_: Open, shared

**Report-Only**:
The tier for fields visible exclusively to professors via valid report links.
_Avoid_: Prof-only, semi-private

**Private**:
The tier for fields accessible strictly by the secretary.
_Avoid_: Secret, hidden, admin-only

**Note**:
A personal document in the secretary's private scratchpad, entirely hidden from classmates, professors, and AI.
_Avoid_: Memo, draft, private note (which belongs to a student)

# Product Requirements Document — Class Management System

**Version:** 1.0  
**Status:** Ready for MJ Balubar’s review and approval  
**Prepared for:** MJ Balubar, Class Secretary  
**Product stage:** Requirements only; milestone planning, product design, and implementation remain on hold.

## 1. Product summary

The Class Management System is a personal-use Manus web app for a class secretary. It gives every subject its own simple place for **Attendance, Announcements, Resources, Questions & Answers, Schedule, and History**. It reduces repeated work by turning pasted Zoom names into reviewable attendance suggestions, publishing class information once, and sharing clear public links through Messenger.

The system is subject-agnostic. It begins with three subjects, but the secretary can add, use, archive, and reuse any subject without changing the app’s structure. Each subject keeps its own Students list because not all classmates take the same subjects.

## 2. Problem and opportunity

The secretary currently manages information across Zoom participant lists, screenshots, Messenger messages, links, documents, and repeated classmate questions. Attendance needs manual cleanup because Zoom names may not match the agreed class format. Important announcements and resources can get buried in a chat, and the secretary may need to answer the same question multiple times.

The product should become one reliable place for each subject. It should let the secretary confirm attendance, publish information, share links in Messenger, and generate reports without turning the app into a full school system.

## 3. Users and access

| User | Main need | Access | Key limit |
|---|---|---|---|
| **Secretary** | Manage subjects and publish accurate information | Signed-in owner area | Final decision maker for Attendance and published content |
| **Classmate** | Find current class information from Messenger | Public view-only links shared in a small class group | Cannot edit or see private secretary data |
| **Professor** | Review shared Attendance reports | Shared report or Subject link | Does not edit Attendance in the app; feedback stays in Zoom or Messenger |

The initial release accepts public links for the intended small class group. Public pages must still hide raw Zoom names, unclear matching suggestions, private notes, and unpublished changes.

## 4. Goals

The first release must help the secretary manage a subject from start to finish: create the Subject, set a fixed weekday Schedule, manage Students, record a class session, publish Attendance, post an Announcement, share Resources and Questions & Answers, and send a clear link through Messenger.

The product must make the following information easy to find from every Subject’s **Home** page: subject name, subject code, professor name, fixed weekday Schedule, and the next **No Class** notice when one exists.

The product must be mobile-first and dark mode by default. Its later visual design will use Apple-inspired typography and interaction principles, but the requirements do not prescribe a screen design.

## 5. Non-goals

The first release does not include grades, assignments, private in-app chat, direct Messenger automation, direct Zoom integration, automated screenshot OCR, professor editing, school-wide accounts, or formal school retention rules. It also does not require private student-specific attendance links because public small-group sharing is the accepted initial approach.

## 6. Product structure

The secretary uses four top-level areas: **Dashboard, Subjects, Reports, and Archive**. Every Subject has the same pages: **Home, Attendance, Announcements, Resources, Questions & Answers, Schedule, Sharing, and Settings**.

| Page | Purpose | Public access |
|---|---|---|
| **Dashboard** | Shows the secretary what needs attention across Subjects | No |
| **Subjects** | Lists and creates active Subjects | No |
| **Reports** | Creates and shares Attendance reports | No |
| **Archive** | Keeps old Subjects and their full History | No |
| **Home** | Shows key subject details and the most current information | Yes |
| **Attendance** | Shows class sessions and published Attendance | Published information only |
| **Announcements** | Shows official class updates | Yes |
| **Resources** | Shows visual link cards for class materials | Yes |
| **Questions & Answers** | Shows individual published questions and answers | Yes |
| **Schedule** | Shows fixed weekdays, upcoming sessions, and No Class notices | Yes |
| **Sharing** | Controls public links and Messenger preview information | No |
| **Settings** | Manages subject details and Students | No |

## 7. Required features

### 7.1 Subjects, Students, and Schedule

The secretary can create a Subject with its name, subject code, professor name, fixed weekday Schedule, active term, and independent Students list. The app uses a fixed weekday pattern for normal classes. The secretary can add a **No Class** notice for a holiday, school event, weather update, or custom reason without changing past class sessions.

| Requirement | Acceptance criteria |
|---|---|
| Create Subject | The secretary can save name, code, professor, and at least one fixed weekday. |
| Independent Students | Adding or removing a Student in one Subject does not change another Subject. |
| Subject Home details | Home always shows name, code, professor, and fixed weekday Schedule. |
| No Class | A published No Class notice shows on Home and Schedule for the affected date. |
| Archive | An archived Subject keeps its Attendance, Announcements, Resources, Questions & Answers, Reports, and History. |

### 7.2 Attendance

Attendance is recorded per class session. The official status values are exactly **PRESENT**, **ABSENT**, and **NOT SET**. The secretary pastes Zoom participant names from a screenshot or participant list and records the capture time. The app uses an LLM to make name suggestions, but the secretary confirms every official decision.

The app should normalize names toward the expected format: `SECTION_LAST NAME, FIRST NAME + MIDDLE NAME`. It must show clear matches, unclear matches, and unmatched names separately. An unclear or unmatched name must never silently change a Student’s official Attendance.

| Requirement | Acceptance criteria |
|---|---|
| Add class session | A session belongs to one Subject and one date. |
| Paste Zoom names | The secretary can save pasted names and capture time before publishing. |
| LLM suggestions | The app returns suggested Student matches and clearly flags unclear or unmatched names. |
| Secretary confirmation | Published Attendance cannot be created until the secretary reviews suggested matches. |
| Status values | Only PRESENT, ABSENT, and NOT SET can be stored as the official Attendance status. |
| Updates | Any change after publishing creates the next version and adds a public History note without exposing raw Zoom names. |

### 7.3 Announcements

Announcements are durable posts rather than temporary chat messages. The secretary can create, save, preview, publish, update, and archive an Announcement. The editor must support a title, rich text, links, images, attachments or media where supported, and a public change summary.

Each published Announcement receives its own view-only link for Messenger. It appears in the Subject’s Announcements page and may appear on Home when recent or pinned.

### 7.4 Resources

Resources are visual cards, not plain URL lists. Every Resource includes a title, description, category, type, source or domain, link, fallback thumbnail, and History. The first release supports links to Google Drive, Google Forms, external sites, Facebook, images, and Zoom meeting links.

When a website does not provide a usable preview image, the app shows a safe fallback thumbnail together with the title, source/domain, and type. Every Resource can have its own public share link.

### 7.5 Questions & Answers

Messenger remains the place where classmates ask questions. The app stores the reusable answer. The secretary can create an individual Question & Answer, mark it official, update it, add tags, publish it, and copy a view-only link to share back in Messenger.

Questions & Answers are not a chat feature in the first release. Classmates can browse and search published items, but they do not submit questions in the app by default.

### 7.6 Reports

The app creates two report types from the same Attendance data.

| Report | When used | Contents |
|---|---|---|
| **Class Attendance** | After every class session | Subject name, class date, Students, official status, totals, version number, and report date |
| **All Subject Attendance** | At the end of exams | A combined view of Attendance across Subjects, while keeping each Subject’s Students list separate |

The secretary can share a report through a public link and export a print-friendly version. Professor feedback happens outside the app through Zoom or Messenger.

### 7.7 Sharing, Messenger previews, and History

The secretary can copy a view-only link for Home, Announcements, Resources, Questions & Answers, and Reports. Each shareable page uses social-preview information so its Messenger link can show a tailored title, description, and image. Personal or sensitive Attendance details must not appear in preview titles, descriptions, or images.

The secretary can manually add a public change summary whenever publishing an update. Published Attendance, Announcements, Resources, and Questions & Answers show a version number and public History. Private secretary notes and raw Zoom input never appear in History.

### 7.8 Media storage

The app securely stores announcement media, Resource fallback thumbnails, and custom Messenger preview images. The app stores a reference to each media item rather than putting file contents into the database. The secretary controls which stored media appears in public pages and previews.

## 8. Public and private information

| Information | Public view-only page | Secretary area |
|---|---|---|
| Subject name, code, professor, and Schedule | Yes | Yes |
| Published No Class notice | Yes | Yes |
| Published Announcements, Resources, and Questions & Answers | Yes | Yes |
| Published Attendance and report version | Yes | Yes |
| Raw pasted Zoom names | No | Yes |
| Name suggestions and unclear matches | No | Yes |
| Private notes | No | Yes |
| Unpublished changes | No | Yes |

## 9. Quality requirements

| Area | Requirement |
|---|---|
| **Mobile** | Public pages work on a phone-sized screen and keep Home, Attendance, Announcements, Resources, and Questions & Answers easy to reach. |
| **Dark mode** | Dark mode is the default; later product design must keep text, controls, and status information readable in the default theme. |
| **Accessibility** | Later design must use clear labels, visible keyboard focus, readable text, appropriate contrast, and large enough touch areas. |
| **Performance** | Shared pages should load the page title, Subject details, and main content without waiting for a long background task. |
| **Safety** | The LLM must not publish Attendance, make final matches, or expose private Zoom input. |
| **History** | Published changes must have a version number and public change summary. |

## 10. Success measures

These measures are targets for prototype and first-release validation. They are not current results.

| Measure | Target | How it will be checked |
|---|---|---|
| Attendance review | Secretary can paste names, resolve all unclear matches, and publish one class session in **5 minutes or less** during a realistic test. | Timed secretary test using a real or safely anonymized session list. |
| Subject clarity | A classmate can identify the Subject, code, professor, Schedule, and next No Class notice in **under 30 seconds** from Home. | Mobile usability test. |
| Information finding | A classmate can find a recent Announcement, Resource, and Question & Answer in **two navigation steps or fewer** from Home. | Mobile usability test. |
| Matching safety | **100%** of unclear and unmatched names require secretary review before publishing. | Automated and manual workflow test. |
| Public safety | **0** raw Zoom names, private notes, or unpublished changes appear on public pages. | Public-page test checklist. |
| Sharing | **100%** of tested public page types include a title, description, and image fallback for Messenger previews. | Share-preview validation. |

## 11. Key states and error handling

| Area | Empty or error state | Required recovery action |
|---|---|---|
| Subjects | No Subjects exist | Explain what a Subject is and offer “Add Subject.” |
| Students | Subject has no Students | Show why Students are needed before Attendance and offer “Add Students.” |
| Attendance | Zoom names do not match Students | Keep the session unpublished and show the unclear names for secretary review. |
| Resources | Website preview cannot load | Use fallback thumbnail, title, type, and source/domain. |
| Questions & Answers | No published items | Explain that answers from Messenger can be saved here and offer “Add Question & Answer.” |
| Public link | Item is archived or unavailable | Explain that the item is no longer available and provide a link back to Home when the Subject is still public. |
| Media | Upload fails | Keep the draft unchanged, explain the failure, and offer retry or removal. |

## 12. Dependencies and assumptions

The system needs Manus authentication for the secretary area, a database for subjects and records, secure object storage for media, an LLM service for name suggestions, and server-rendered or crawler-readable metadata for Messenger previews. The first release assumes the secretary manages all publishing and that public links stay within the intended small class group.

## 13. Open decisions for product design

The PRD confirms scope and behavior, but product design must decide the best mobile navigation pattern, the order and size of Home content, the exact dark-mode color system, the visual treatment of Resource cards, the appearance of History, and how much preview editing belongs in Sharing. These decisions must not change the requirements or public/private boundaries set in this PRD without a versioned update.

## 14. Approval checklist

Approval confirms that the first release has the right users, public-sharing model, pages, Attendance process, content types, reports, History rules, media needs, safety rules, success measures, and non-goals. After approval, the next step is a milestone breakdown; product design and implementation remain separate later steps.

# 01: Subject Home Shell & Quick Actions Header

**What to build:** An operational hub for an individual subject at `/console/subjects/[id]`, directly reachable by tapping any subject card on the Console Dashboard. The header presents the subject code, section mark, professor name, and next scheduled meeting time, alongside three primary action buttons: "Start Class Session" (instantly launching or resuming roll call for that subject), "Mark No Class" (prompting to mark a single-subject cancellation), and "Copy Public Link" (copying the unlisted `/s/[slug]` URL). Below the header sits a responsive navigation tab bar with tabs for Sessions, Roster, Requests, Monitoring, and Reports.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Navigating from any subject card on `/console/dashboard` opens `/console/subjects/[id]`.
- [x] Action header displays the subject code, subject title, section mark, professor name, and next scheduled class badge.
- [x] Tapping "Start Class Session" creates or resumes today's session and navigates to the roll call screen.
- [x] Tapping "Copy Public Link" copies the unlisted public URL (`/s/[slug]`) to the clipboard with visual confirmation.
- [x] Navigation tab bar renders tabs for Sessions, Roster, Requests, Monitoring, and Reports.

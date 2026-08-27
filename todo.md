# Project TODO

## Current release and real-data verification

- [ ] Audit the current build for high-value missing workflows, then implement and validate the strongest privacy-safe additions.
- [x] Add a secretary-only bulk draft-status action for Attendance that never bypasses Zoom-suggestion review or publishes records automatically.
- [x] Add a secretary-only class-attendance CSV export that includes official statuses but never private excuse reasons, raw Zoom data, suggestions, or publishing controls.
- [ ] Verify representative Google Drive, Google Forms, Facebook, image, Zoom, and generic external Resource links, including thumbnail fallback and public History.
- [ ] Verify a real archived Subject appears in Archive, restores as a draft, and is removed from the Archive list end to end.
- [ ] Verify archived Announcements, Resources, and Questions & Answers each restore from Archive and update the list end to end.
- [ ] Verify real managed Announcement/share images, Resource thumbnails, and custom social-preview images on public pages.
- [ ] After publication with a canonical domain, confirm rendered Messenger/social-card previews for the real share links in a Messenger test conversation.
- [ ] Run a release-only end-to-end check with real class data: independent Subjects, roster intake, Attendance review, public sharing, reports, and archives.

## Deferred by intent

- [ ] Capture additional automated evidence for both published Q&A states and a custom History entry only if a future regression requires it.

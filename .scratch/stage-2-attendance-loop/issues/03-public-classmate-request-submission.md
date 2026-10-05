# 03: Public Classmate Request Submission ("Something wrong?")

**What to build:** An unlisted, anonymous dispute mechanism for classmates on public session pages (`/s/[slug]/sessions/[date]`). Classmates tap a "Something wrong?" action button to open a mobile bottom sheet where they choose their request type ("I was present", "Excuse", "I recited"), select their name from an autocomplete list of enrolled students, input an excuse reason or recitation delta, and attach an optional proof screenshot compressed directly in the browser to $\le 1$ MB (WebP). Submissions dispatch to `POST /api/requests/submit` with strict rate limiting, honeypot spam protection, and a limit of 1 pending request per student per session per type.

**Blocked by:** None (can start immediately on public session pages).

**Status:** done

- [x] "Something wrong?" button on public session pages opens the submission sheet without requiring authentication.
- [x] Student selector lists only students actively enrolled in that subject.
- [x] Excuse requests allow image proof uploads compressed in the browser to $\le 1$ MB.
- [x] Recitation requests require an integer delta indicating recitations claimed.
- [x] Honeypot spam fields and duplicate pending submissions by the same student for the same session/type are rejected.
- [x] Successful submission creates a `pending` record in the `requests` collection and displays a clear confirmation toast.

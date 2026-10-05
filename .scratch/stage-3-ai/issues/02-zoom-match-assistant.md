# 02: AI Zoom Log Participant Matcher

**What to build:** Natural-language Zoom log parser that extracts attendee names from raw chat and attendee exports, matches them against enrolled students, and presents a two-phase confirmation drawer to mark attendance.

**Blocked by:** 01: Gemini Client & AI Change-Note Generator

**Status:** done

- [x] Zoom log parser endpoint accepts unstructured meeting text and enrolled student roster.
- [x] Returns structured groups: high-confidence matches, ambiguous candidates, and unrecognized attendees.
- [x] Roll call runner screen provides an "Import from Zoom" action drawer.
- [x] Two-phase confirmation screen allows reviewing and unchecking matches before committing.
- [x] Confirmed attendees batch cleanly into the single-flight roll call queue as Present.
- [x] Unit tests for noisy chat parsing, confidence scoring, and unauthenticated error handling.

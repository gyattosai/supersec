# 03: AI Messy Roster Cleanup Assistant

**What to build:** Roster import cleanup tool that parses unstructured student rosters from spreadsheets or chat apps, strips honorifics and section markers, and flags near-duplicates.

**Blocked by:** 01: Gemini Client & AI Change-Note Generator

**Status:** done

- [x] AI roster cleaner parses raw multi-line student text into standardized full names and optional student numbers.
- [x] Strips junk prefixes, section tags, and title honorifics while preserving Philippine composite names and suffixes.
- [x] Roster import screen shows a side-by-side comparison table of raw versus parsed records.
- [x] Secretary confirms parsed roster before bulk enrollment is performed.
- [x] Unit tests for edge cases (all caps, honorifics, irregular spacing, duplicate warnings).

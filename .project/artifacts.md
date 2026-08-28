# Artifact Registry — supersec

<!-- Newest entries at top. Deduplicated by Path/URL. -->

## ART-001 — 12-hour time utilities
- **Path/URL:** `/home/ubuntu/class-management-system/client/src/lib/time.ts`
- **Type:** code
- **Purpose:** Converts the stored HH:mm time contract to explicit 12-hour AM/PM labels and formats date-times with an explicit 12-hour clock.
- **Created:** 2026-08-28 | **Last updated:** 2026-08-28
- **Format:** `.ts`
- **Notes:** Keeps persistence and tRPC payloads unchanged; the browser-facing display is localized for date text but always uses `hour12: true` for time.

## ART-002 — 12-hour time input controls
- **Path/URL:** `/home/ubuntu/class-management-system/client/src/components/TimeInputs.tsx`
- **Type:** code
- **Purpose:** Provides mobile-friendly 12-hour time and date-time controls for Subject schedules, Attendance capture, class dates, and No Class dates.
- **Created:** 2026-08-28 | **Last updated:** 2026-08-28
- **Format:** `.tsx`
- **Notes:** Emits existing `YYYY-MM-DDTHH:mm` and `HH:mm` values so the server contract and stored records remain compatible.

## ART-003 — 12-hour time-format tests
- **Path/URL:** `/home/ubuntu/class-management-system/server/time.format.test.ts`
- **Type:** code
- **Purpose:** Covers midnight/noon conversion, minute-preserving round trips, time ranges, and explicit AM/PM date-time output.
- **Created:** 2026-08-28 | **Last updated:** 2026-08-28
- **Format:** `.ts`
- **Notes:** Included in the project Vitest suite.

# 0010. Route Architecture and Single-Flight Roll Call Queue

## Context

SuperSec serves three distinct personas under differing network constraints:
1. The **Secretary**, operating live in Philippine university lecture halls under intermittent Wi-Fi or cellular connections, requiring instantaneous (<50ms) single-tap roll call interactions while walking around class.
2. **Classmates**, opening unlisted links from Messenger on low-end mobile devices without authentication.
3. **Professors**, viewing tokenized attendance reports.

## Decision

1. **Route Separation**:
   - `/console/*`: Dedicated, phone-first secretary interface with bottom tab navigation, optimized for touch and rapid data entry. Authenticated via Payload JWT cookie (`payload-token`, 30-day expiry).
   - `/` & `/s/[slug]`: Public, unlisted classmate portal rendered via lightweight Next.js Server Components. Strictly exposes allowlisted 🌐 fields.
   - `/prof/[token]`: Unlisted professor report projection.
   - `/admin`: Payload CMS default administration back-office.

2. **Single-Flight Roll Call Sync Queue**:
   - Live roll call updates apply to React state optimistically with 0ms UI delay.
   - Mutations append to an in-memory FIFO queue with idempotency keys.
   - A single-flight worker flushes queued taps in batches to `/api/sessions/:id/ops`.
   - Backed by local storage buffer so taps survive page reloads or brief signal drops, with automatic re-flush on reconnection.

## Consequences

- Zero perceived latency during rapid 40-student classroom roll calls.
- Classmate public routes remain pure Server Components without loading heavy secretary management client bundles.
- Eliminates race conditions and duplicate database writes via idempotent batch ops.

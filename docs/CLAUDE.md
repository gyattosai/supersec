# CLAUDE.md: SuperSec v2 (docs v1.5)

SuperSec is a class secretary app: a phone-first console for one secretary, plus unlisted read-only pages for classmates and secret report links for profs.
**Before any task, read:** `docs/masterplan.md` → the step you're doing in `docs/PRD-1-implementation-plan.md` (steps are done strictly in order) → the relevant parts of `docs/PRD-2-design-guidelines.md` and `docs/PRD-3-app-flow-pages-roles.md`. `docs/AUDIT.md` explains why the rules below exist.
**Before naming anything or touching data, read:** `docs/CONTEXT.md` (the words) and `docs/SCHEMA.md` (collections and fields).

## Stack
Next.js + Payload CMS 3 (MongoDB adapter, Atlas Flex) · shadcn/ui (Radix) + Tailwind v4 · Appwrite Sites, Storage, Functions · Gemini Flash-Lite (server only, Stage 3) · TypeScript strict · Vitest

## Non-negotiable rules
1. **Access pattern:** access functions branch on `req.payloadAPI`. Logged in → allowed. Anonymous + `local` → published only. Anonymous + REST/GraphQL → denied. Public pages use `lib/public/*` (Local API, `overrideAccess: false`, `select: publicFields`, never `draft: true`). Prof reports use `lib/report/*` (`select: reportFields`, after validating the token).
2. **Privacy tiers:** 🌐 public · 📋 report-only (`/prof/[token]` only) · 🔒 private. Anything not in an allowlist is private. Never return 🔒 anywhere public, and never return 📋 outside `/prof/[token]`.
3. **Only public write:** `POST /api/requests/submit`. It's the **only** public code allowed to use `overrideAccess: true`, after validation. Don't add another without asking.
4. **Custom API = Payload custom endpoints** on their collection. Never Next.js routes under `/api/*`.
5. **Unlisted:** noindex header + meta on every public response. `robots.txt` allows crawling. OG previews never contain student names.
6. **Access in app code:** always `can(user, action, resource)`. Never `if (user)`.
7. **Tokens only:** no hex, px font size, or shadow outside `tokens.css`. Our indigo is `--brand` / `bg-brand`. In shadcn, `accent` means hover, so never use it for indigo.
8. **Dates:** class days are `YYYY-MM-DD` strings in Asia/Manila, times are `HH:mm`, and display is 12-hour. Convert any UTC datetime to Asia/Manila before taking the date. Never use `new Date()` for class days.
9. **Roster writes:** one client queue, one request at a time, idempotency keys, Payload autosave draft. Only Publish creates a version. On a 401, pause the queue, ask for login, then replay.
10. **Attendance statuses are exactly P / A / E / Not set.** No Late. Follow business rules R1 to R9 in PRD 1 §4.1.
11. **Calculate, don't store:** attendance %, flags, totals, and streaks come from the stats module only.
12. **Images:** compress in the browser (proofs too) and use Appwrite `/view` URLs, never `/preview`.
13. **AI (Stage 3 only):** server only, with a timeout and a manual fallback. Never save AI output without the secretary confirming it. Never send Notes or 🔒 fields to AI.
14. **Rich text = Payload Lexical, trimmed features (PRD 1 §4.2).** Only `components/RichTextEditor.tsx` may import `RenderLexical` (experimental). Render with `RichText` from `@payloadcms/richtext-lexical/react`. Pin exact `payload` / `@payloadcms/*` versions and re-run the 0.7 editor check after any upgrade.
15. **Shared language:** names in code, UI copy, commits, and chat come from `docs/CONTEXT.md` (one word, one meaning). For a new concept, propose a word + a one-line meaning and wait for my OK, then add it to CONTEXT.md in the same commit.
16. **Schema source of truth:** `docs/SCHEMA.md`. Change it in the same commit as the collection config. A field's tier mark there decides `publicFields` / `reportFields`. If the generated types disagree with it, stop and ask.
17. **No new dependencies or services** without asking first. The stack is frozen.

## Working routine (every session)
1. Tell me which PRD 1 step you're doing and restate its "Done when".
2. Plan in at most 5 bullets. Wait for my OK if the plan touches more than 3 files.
3. Build the slice in order: SCHEMA.md → collection → access → screen → public page → test. New fields get their tier in SCHEMA.md, and the allowlists follow it.
4. Run `pnpm test && pnpm build` (tests must not need a database). Fix anything that fails before saying you're done.
5. Show me how to check "Done when" on my phone, then commit to `v2` with a clear message.

## Never
Log student names or request reasons · give the browser database access · hand-build menus, dialogs, or focus traps (use shadcn/ui) · use `/r/` for anything except v1 resource redirects · add push notifications, AI "improve text", or AI proof checks

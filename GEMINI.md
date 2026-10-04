# SuperSec v2 — Project Agent Rules & Skill Playbook

SuperSec is a class secretary app: a phone-first console for one secretary, unlisted read-only pages for classmates, and secret report links for professors.

---

## 1. Stack & Architectural Principles (Pragmatic & Flexible)

* **Core Stack**: Next.js 15 (App Router) + Payload CMS 3 (MongoDB adapter on Atlas Flex).
* **UI Foundation**: shadcn/ui (Radix primitives) + Tailwind CSS v4 + Inter font + Linear-inspired dark aesthetic.
* **Services**: Appwrite (Storage for receipts/proofs, Functions, Sites deployment) + Google Gemini Flash-Lite (Stage 3 AI assistance).
* **Testing**: TypeScript strict + Vitest.

### Core Principles & Guidelines

1. **Privacy & Access Control (Safety by Default)**:
   * **Privacy Tiers**: 🌐 **Public** (class schedules, general info), 📋 **Report-only** (`/prof/[token]`), 🔒 **Private** (student personal excuses, internal notes).
   * **Read Safety**: Public routes query with field allowlists (`select: publicFields`) to avoid accidental leakage of private fields.
   * **Pragmatic Flexibility**: Use `overrideAccess: true` whenever justified for internal handlers, seed scripts, background jobs, test harnesses, or validated public submissions.

2. **API & Route Handlers**:
   * **Payload-First**: Prefer collection-level custom endpoints for domain models where Payload hooks and access controls add value.
   * **Next.js Route Handlers Welcome**: Standard Next.js routes (`app/api/*`) are fully supported for crons, webhooks, edge handlers, health checks, or lightweight utilities.

3. **Design System & Styling**:
   * **Aesthetic**: Linear-inspired dark mode by default (deep charcoal background, subtle 1px borders, indigo accent `--brand` / `#5e6ad2`).
   * **Tailwind & Tokens**: Use design tokens in `tokens.css` as the theme baseline, but feel free to use standard Tailwind utility classes (`p-4`, `flex`, `gap-2`, `text-xs`) freely and pragmatically during development.
   * **Motion & Interactions**: Prioritize CSS transitions (80–240ms) and native View Transitions for mobile responsiveness. Lightweight animation utilities are welcome when they enhance feedback without bloating mobile bundle size.

4. **Dates & Timezone**:
   * Attendance and class sessions represent Manila calendar days (`Asia/Manila`, formatted as `YYYY-MM-DD`). Convert UTC timestamps to Manila date strings when storing or grouping attendance records.

5. **Iterative Schema & Vocabulary**:
   * `docs/SCHEMA.md` and `docs/CONTEXT.md` provide the baseline specifications. Evolve and refine collections, fields, and helper types flexibly as real implementation needs dictate.

---

## 2. Skill & Tool Routing Playbook

Leverage the installed specialized skills and tools based on the task:

### A. UI Design, Components & Styling
* **`shadcn`**: Use for accessible UI primitives (Dialogs, Drawers, Dropdowns, Inputs, Tooltips, Toasts/Sonner).
* **`impeccable`**: Use for UI critique, polishing layout hierarchy, mobile responsiveness, and dark theme refinement.
* **`vercel-composition-patterns`**: Use when designing compound components or clean, scalable component interfaces.

### B. Performance & Transitions
* **`vercel-react-best-practices`**: Use for optimizing React/Next.js pages (server components, avoiding waterfalls, streaming with `<Suspense>`).
* **`vercel-react-view-transitions`**: Use for native page transitions between tabs and routes.

### C. Database, Payload CMS & Cloud Storage
* **`payload`**: Official Payload CMS 3 skill. Reference for `payload.config.ts`, collections, fields, custom endpoints, hooks, and Lexical rich text.
* **`mongodb-schema-design`, `mongodb-connection` & `mongodb-query-optimizer`**: Use for indexing compound queries, managing connection pools on Atlas Flex, and schema optimizations.
* **`appwrite-typescript` & `appwrite-cli`**: Use for Appwrite client SDK, storage buckets, and function deployments. Compress images in the browser before upload; prefer `/view` URLs.

### D. Quality, Testing & Debugging
* **`testing-qa`**: Comprehensive QA and testing workflow. Use for test planning, pyramid coverage (unit, integration, E2E), browser verification, and quality gate checklists.
* **`tdd`**: Test-driven development for stats calculations, attendance rules, and data transforms. Tests should run quickly without requiring a live database.
* **`diagnosing-bugs`**: Systematic diagnosis loop when debugging tricky issues.
* **`code-review`**: Sanity-check implementation before major milestones.
* **`accessibility` & Chrome DevTools MCP**: Validate WCAG compliance, mobile touch targets (44px min), and contrast.

### E. Copy, Tone & Communication
* **`ux-writing` & `no-ai-slop`**: Keep UI microcopy purposeful, clear, and human. Avoid generic AI boilerplate.
* **`i-have-adhd`**: Keep agent communication high-signal: lead with the next immediate action, numbered steps, bold takeaways, and zero tangents.
* **`ponytail`**: Choose the simplest, cleanest solution that works. Standard library and native platform features over unnecessary bloat.
* **`gemini-api-dev`**: For Stage 3 AI features (roster cleanup, change notes). Keep AI calls server-side with manual fallbacks.

### F. On-Demand Catalog & Design Queries
* **`ui-skills` MCP server**: Query specialized UI patterns on-demand via MCP `call_mcp_tool`.
* **`designmd` Pro MCP server**: Search DESIGN.md catalogs, generate token variables, and inspect block layouts on-demand.

### G. Matt Pocock Architecture & Workflow Suite
* **`codebase-design`**: Design deep modules with narrow, expressive surfaces. Hide internal implementation details to make code maintainable and AI-navigable.
* **`domain-modeling`**: Keep domain concepts aligned with the ubiquitous language in `docs/CONTEXT.md`. Propose new terms before introducing them.
* **`tdd`**: Strict test-driven development (Red ➔ Green ➔ Refactor). Write tests first for stats calculations, attendance rules R1–R9, and access controls.
* **`grilling`**: Stress-test architectural plans and challenge thin assumptions before writing code (paired with `/grill-me`).
* **`prototype`**: Build rapid, throwaway spikes when exploring state transitions or mobile UI ergonomics before committing to production files.
* **`research`**: Investigate upstream docs and specifications (Payload CMS 3, Next.js 15, Appwrite) against primary sources before writing complex integrations.
* **`pr`**: Generate clear, structured pull request descriptions summarizing intent, spec compliance, and phone verification steps.

---

## 3. Testing Rules

1. **Framework & Runner**:
   * Use **Vitest** for all unit and integration testing (fast ESM execution, TypeScript native).
2. **Database Isolation (No Live DB Requirement)**:
   * **Rule**: Unit and integration tests must run in isolated memory without requiring a live MongoDB Atlas connection.
   * Use mocked Local API adapters, in-memory fixtures, or pure function transforms. Tests must run fast locally and in offline environments.
3. **Core Test Priority Areas (Comprehensive Quality Gates)**:
   * **A. Privacy & Data Security Harness (Zero-Leak Guarantee)**:
     - Automated harness testing that every public Local API read (`lib/public/*`) strictly returns only 🌐 fields.
     - Verify that 📋 report-only fields (`excuseReason`, internal flags) return 404/403 outside `/prof/[token]`.
     - Confirm all public HTTP responses include `X-Robots-Tag: noindex, nofollow` and `<meta name="robots" content="noindex">`.
     - Ensure OpenGraph previews never include student names, and internal notes (🔒) are stripped before reaching Gemini AI.
   * **B. Attendance Business Rules State Machine (R1 to R9)**:
     - **R1**: Session publish blocked if any enrolled active student is "Not set". "Mark all Present" fills only "Not set" rows.
     - **R2**: Excused days never count as absences and are skipped in streaks (neither breaking nor extending them).
     - **R3**: Approving a classmate request is blocked while its target session has uncommitted/unpublished edits.
     - **R4**: Proofs and pending records expire and are deleted after 30 days.
     - **R5**: Approving an "I recited" request adds its delta to recitations without overwriting in-class taps.
     - **R6**: Absence limit is fixed at term setup and unaffected by "No Class" days.
     - **R7 & R8**: Enforce 1 meeting per weekday per subject; prevent duplicate sessions on the same date.
   * **C. Stats Calculations & Mathematical Precision**:
     - Pure in-memory unit tests for Attendance %, Absence limits, Dropped thresholds, and Recitation rankings.
     - Edge-case matrices: 0 held sessions, 100% attendance, dropping mid-term, enrolling mid-term.
   * **D. Temporal Rigor & Manila Timezone (`Asia/Manila`)**:
     - Calendar days must strictly serialize as `YYYY-MM-DD` and times as `HH:mm` (12-hour display).
     - Machine-independent tests: Assert date parsing evaluates identically whether running on UTC, UTC+8, or UTC-8 runners without midnight shift bugs.
     - Legacy UTC conversion: Verify v1 UTC timestamps (e.g. 23:30 UTC) map to the correct Manila class date.
   * **E. Roster Sync, Queue Idempotency & Network Resilience**:
     - Single-flight queue tests: Verify 20 rapid taps within 1 second batch cleanly with unique idempotency keys.
     - Auth interruption: Simulate 401 Unauthorized during sync; verify queue pauses, prompts for re-auth, and replays without dropped or duplicated taps.
     - Reconnection sync: Verify offline airplane-mode taps sync with zero duplicate records in MongoDB.
   * **F. Mobile UX, Viewport & Accessibility (WCAG 2.2 AA)**:
     - Touch targets: Playwright / DevTools assertions that all interactive controls maintain ≥ 44x44px hit areas.
     - Viewport integrity: Verify no horizontal overflow on 375px/390px mobile screens.
     - Contrast & Theme: Minimum 4.5:1 text contrast and 3:1 border contrast in Dark (default) and Light modes, with zero un-styled flash on reload.

4. **Testing-QA Quality Gates (`testing-qa`)**:
   * **Pyramid Balance**: 70% fast unit tests (pure transforms, stats, date rules) · 20% integration tests (Payload local API, access control) · 10% E2E tests (critical paths).
   * **Pre-Deploy Verification**: Run `pnpm test` and ensure 100% of privacy & stats tests pass before deployment.
   * **Mobile Viewport QA**: Use Playwright/DevTools to verify phone layouts (375px–430px) and touch targets (≥ 44px).

---

## 4. Deployment Rules & GitHub CI/CD

1. **GitHub Repository & Branch Strategy**:
   * **Active Development Branch**: `v2` is the primary working branch.
   * **Branch Hygiene**: Never commit broken builds or failing tests. Commit messages should clearly describe the milestone or PRD step completed.
2. **GitHub Actions CI Pipeline (`.github/workflows/ci.yml`)**:
   * **Trigger**: Automated on every push and pull request to `v2` and `main`.
   * **Pipeline Stages**:
     - **Checkout & Setup**: Node.js 20+ with `pnpm` cache.
     - **Lint & Typecheck**: `pnpm lint` and `tsc --noEmit`.
     - **Test Suite**: `pnpm test` (isolated Vitest run without live DB).
     - **Production Build**: `pnpm build` (ensuring zero SSR or Lexical bundle breakages).
   * **Branch Protection**: Merges and cutovers require passing GitHub Actions checks.
3. **Appwrite Sites Continuous Deployment (Git-Connected)**:
   * **Hosting Target**: Appwrite Site `supersec-v2` connected directly to the GitHub repository on branch `v2`.
   * **Automated Deploy Trigger**: Appwrite listens to GitHub webhook events on `push` to `v2`.
   * **Build Command**: Set to `pnpm test && pnpm build` in the Appwrite Site console.
   * **Safety Abort**: Any failing test or TypeScript error causes Appwrite to fail the deployment and keep the previous stable release live.
4. **Appwrite Functions (Background Tasks)**:
   * Deployed via Appwrite CLI (`appwrite client` / `appwrite push function`) or GitHub Action for background crons (e.g. daily proof cleanup at `/api/cron/cleanup`).
5. **Resource Sizing & Cold Starts**:
   * Provision **1 GB+ memory** spec for the Appwrite Site runtime to ensure smooth Next.js SSR and Payload admin compilation during cold starts.
6. **Environment Variables & Secrets Management**:
   * Stored securely in GitHub Actions Secrets and Appwrite Site Settings:
     - `DATABASE_URI`: MongoDB Atlas Flex connection string with pool tuning (`maxPoolSize: 10`).
     - `PAYLOAD_SECRET`: High-entropy 32+ character secret for JWT sessions and token encryption.
     - `NEXT_PUBLIC_APP_URL`: Production canonical domain (for redirects and OpenGraph cards).
     - `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`: Server-side Appwrite credentials.
     - `GEMINI_API_KEY`: Server-only key for Stage 3 AI features.
     - `CRON_SECRET`: Secret header token protecting cron endpoints from unauthorized external calls.
7. **Zero-Downtime Migration Safety**:
   * v1 remains fully operational on its domain/site until v2 completes Stage 2 verification.
   * Use idempotent upsert scripts for all historical data migration.
   * Wipe v2 practice/test records cleanly before running final production cutover.
8. **GitHub Project Board Integration**:
   * **Project Board URL**: [Current iteration · supersec](https://github.com/users/gyattosai/projects/2/views/1) (`PVT_kwHOAx9J9c4Blseq`).
   * **Active Iteration**: `Iteration 1` (Oct 3 – Oct 17, 2026).
   * **Card Lifecycle**: Track features/steps through `Ready` ➔ `In progress` ➔ `In review` ➔ `Done` with Priority (`P0`–`P2`) and Size (`XS`–`XL`).

---

## 5. Working Routine (Flexible Milestones)

1. **Step Focus**: Identify the PRD-1 feature or milestone being built.
2. **Concise Plan**: Briefly outline the approach in 3–5 bullets.
3. **Build & Iterate**: Implement the slice (Schema/Config -> UI/Component -> Route/Handler -> Test).
4. **Verify**: Ensure tests pass and the build succeeds (`pnpm test && pnpm build`).
5. **Review & Commit**: Confirm mobile usability and commit changes to the working branch.

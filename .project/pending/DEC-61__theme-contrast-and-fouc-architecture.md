# DEC-61 — Theme Contrast Architecture, Token Harmonization, and FOUC Prevention

- **Target file(s):** `.project/logs/decisions.md`
- **Operation:** append
- **Category:** DEC
- **Status:** pending

## Content

```markdown
## Session 2026-09-05 — Theme Contrast Architecture, Token Harmonization, and FOUC Prevention
- **Summary:** Established project-wide color contrast rules, dual-mode badge palettes, UI primitive background tiers, and FOUC prevention architecture.
- **Source task / Conversation:** `conversation://76387857-dee3-4dab-8861-4d7c4eab74aa`

### Strict Dual-Mode Contrast Tiers for Badges & Status Indicators
- **Context:** Hardcoded status tints like `text-emerald-400` or `text-amber-400` worked on dark canvases but failed WCAG AA (< 3.0:1) on light mode canvases (`#f7f5f2` / `#fffdf9`). Conversely, `text-*-700` failed on dark mode.
- **Decision:** Mandate dual-mode status color pairings across all badges, pills, and metrics:
  - Emerald: `text-emerald-700 dark:text-emerald-400` (or `dark:text-emerald-300`) — achieving 5.8:1 light / 9.2:1 dark.
  - Amber: `text-amber-800 dark:text-amber-300` (or `dark:text-amber-400`) — achieving 6.5:1 light / 8.4:1 dark.
  - Sky: `text-sky-700 dark:text-sky-400` (or `dark:text-sky-300`) — achieving 5.5:1 light / 8.7:1 dark.
  - Purple / Violet: `text-purple-700 dark:text-purple-300` — achieving 6.2:1 light / 7.6:1 dark.
  - Red / Rose: `text-red-700 dark:text-red-400` — achieving 5.9:1 light / 7.2:1 dark.
- **Rationale:** Ensures every status badge meets WCAG AA (>= 4.5:1) in both modes without compromising dark-mode glow aesthetics.
- **Impact:** Applied across `RecordStatusBadge`, `PublicPages`, `PremiumPublicSubjectHome`, `AttendancePage`, `ReportsPage`, `Home`, and `shared/notes.ts`.
- **Status:** final

### Eradication of Hardcoded Murky Grays in Tailwind v4
- **Context:** Radix primitives used `dark:bg-input/30`, which in Tailwind v4 computed against `--color-input: var(--input)` (`#70757d`), casting a muddy, low-contrast greenish-gray tint on dark form controls.
- **Decision:** Replace all `dark:bg-input/30` usages with semantic surface tokens: `bg-card` for interactive surfaces (`select`, `checkbox`, `input-group`, `input-otp`, `radio-group`) and `bg-secondary` for tracks and recessed items (`tabs`, `switch`).
- **Rationale:** Aligns form controls with the designated charcoal surface ladder (`#1c1e22` card, `#24262b` secondary) and ensures pure crisp contrast.
- **Impact:** 10 UI primitive components in `client/src/components/ui/` updated and protected by Vitest assertions.
- **Status:** final

### Zero-FOUC Synchronous Head Hydration
- **Context:** Client-side theme determination inside React's `useEffect` produced a noticeable flash of light content when a dark-mode user reloaded or navigated to the application.
- **Decision:**
  1. Insert a synchronous inline `<script>` into `<head>` before CSS/HTML rendering that checks `localStorage.getItem("theme")` or `matchMedia("(prefers-color-scheme: dark)")` and immediately adds or removes `.dark` from `document.documentElement`.
  2. Synchronize `<meta name="theme-color">` for both `prefers-color-scheme: dark` (`#151619`) and `light` (`#f7f5f2`).
  3. Initialize `ThemeContext` React state with a lazy initializer (`useState(() => ...)`) matching the exact value determined by the head script.
- **Rationale:** Eliminates flash of unstyled content and unnecessary React mount re-renders.
- **Impact:** Instantaneous, flicker-free page loads across desktop and mobile.
- **Status:** final
```

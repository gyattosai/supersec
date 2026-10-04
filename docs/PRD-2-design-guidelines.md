# PRD 2: Design Guidelines (Linear Design System)

> SuperSec v2 · **v1.5** · Updated Sun Oct 4, 2026 · Pure Linear look: indigo accent, Inter, dark by default + a manual Light toggle.
> **Source note:** Linear doesn't publish an official design system. Values marked **(L)** were measured from linear.app's public CSS (via designmd and designlang references, May 2026). Values marked **(D)** are derived by us in Linear's style, mainly the light mode, the status colors on light, and the mobile sizes. Contrast ratios were calculated against WCAG 2.2.

**TL;DR:** near-black layered surfaces, 1 px borders instead of shadows, Inter at weights 400/510/590, one indigo accent (`#5e6ad2`), a 4 px spacing grid, radii of 4/6/8/12, quick 100 to 150 ms motion, and a press scale of 0.97. On phones everything gets one size bigger, and touch targets are at least 44 px.

**v1.5 changes:** every image needs alt text (§11). UI words follow `CONTEXT.md`.

**v1.4 changes:** rich-text editor skin (§8.16) and rendered content styles (§8.17), both added to the component map (§0). No new tokens.

**v1.3 changes (audit):** our indigo token is renamed `--accent` → `--brand`, and the Tailwind mapping uses shadcn's variable names (C7) · dark by default, Light only through a manual toggle (C6) · `--text-input` token · the More tab unified (C11) · Session tab rule (R7) · prof reports at `/prof/:token` (C3)

**v1.1 changes:** a 2-line roster row on phones (1 line doesn't fit at 375 px) · the segmented control is now 44 px on mobile · built on shadcn/ui (Radix) with a component map (§0) · a complete `tokens.css` + Tailwind `@theme` (§13)

---

## 0. Implementation: shadcn/ui component map

Use shadcn/ui (Radix underneath) for behavior and accessibility, and **restyle it with our tokens**. Never keep shadcn's default look.

**Naming trap:** in shadcn, `primary` = the primary button fill and `accent` = the **hover background** of menu items, and `shadcn init` writes its own `--accent` variable. So our indigo token is **`--brand`**, never `--accent`. It maps to shadcn's `primary` and to Tailwind's `brand` (see §13).

| Our spec | shadcn/ui base | Notes |
|---|---|---|
| Button (§8.1) | `button` | Replace the variants with ours |
| Input, Textarea (§8.2) | `input`, `textarea` | 16 px on mobile |
| Select, Dropdown menu (§8.3) | `select`, `dropdown-menu` | Becomes a bottom sheet on mobile when there are more than 6 items |
| Segmented (§8.4) | `toggle-group` (single) | Status colors per item |
| Checkbox, Radio, Switch (§8.6) | `checkbox`, `radio-group`, `switch` | |
| Tabs (§8.9) | `tabs` | Underline style |
| Dialog, Sheet (§8.10) | `dialog`, `drawer` (vaul) | Drawer = bottom sheet on mobile |
| Toast (§8.11) | `sonner` | Position per §8.11 |
| Tooltip (§8.11) | `tooltip` | Desktop only |
| Skeleton (§8.14) | `skeleton` | |
| Stepper (§8.5), sync badge (§8.12), ListRow (§8.8) | custom | Small, built from Button + Badge |
| Rich text editor (§8.16) | Payload `RenderLexical` (not shadcn) | Only through `RichTextEditor`, themed with the §10 mapping |
| Rich text content (§8.17) | `RichText` from `@payloadcms/richtext-lexical/react` | Inside `.rich-text`, tokens only |

## 1. Principles

1. **Content over chrome.** Surfaces are quiet. Color means something (status, action, focus), never decoration.
2. **Depth through layers.** Each surface level is slightly lighter than the one below. Borders separate things, and shadows are only for floating layers.
3. **Dense on desktop, roomy on phones.** Linear's 13 px desktop density on laptops, and a 15 px base with 44 px targets on phones.
4. **Fast feels good.** Short transitions, instant feedback on press, no animation longer than 250 ms.
5. **Never color alone.** Every status also has a letter, icon, or label (P / A / E / –).

## 2. Color tokens

Implement these as CSS variables in `tokens.css`. **Dark is the default** on `:root`. Light applies only when the user picks it: `data-theme="light"` on `<html>`, saved in a cookie so the server renders the right theme with no flash. The system theme is ignored (same as v1). Components only use **semantic** tokens.

### 2.1 Surfaces and text: dark (default)

| Token | Hex | Use | Source |
|---|---|---|---|
| `--bg-canvas` | `#08090a` | Page background | L |
| `--bg-surface-1` | `#0f1011` | Sidebar, bottom tab bar, input fill | L |
| `--bg-surface-2` | `#141516` | Cards, list containers | L |
| `--bg-surface-3` | `#18191a` | Raised rows, segmented track | L |
| `--bg-elevated` | `#1c1c1f` | Menus, dialogs, sheets, toasts | L |
| `--bg-hover` | `#232326` | Hover on rows and ghost buttons | L |
| `--bg-active` | `#28282c` | Pressed or selected row | L |
| `--border-subtle` | `#1d1e21` | Row dividers | D |
| `--border` | `#23252a` | Default 1 px border (cards, inputs) | L |
| `--border-strong` | `#34343a` | Hovered input, secondary button | L |
| `--border-stronger` | `#3e3e44` | Dividers inside dialogs | L |
| `--text-primary` | `#f7f8f8` | Headings, body (18.7:1) | L |
| `--text-secondary` | `#d0d6e0` | Body secondary (13.6:1) | L |
| `--text-tertiary` | `#8a8f98` | Meta, icons, placeholders (6.1:1) | L |
| `--text-quaternary` | `#62666d` | **Disabled only** (3.5:1) | L |

### 2.2 Surfaces and text: light

| Token | Hex | Contrast on canvas | Source |
|---|---|---|---|
| `--bg-canvas` | `#fbfbfc` | n/a | D |
| `--bg-surface-1` | `#f4f5f6` | n/a | D |
| `--bg-surface-2` | `#ffffff` | n/a | D |
| `--bg-surface-3` | `#eef0f2` | n/a | D |
| `--bg-elevated` | `#ffffff` (+ shadow) | n/a | D |
| `--bg-hover` | `#eceef1` | n/a | D |
| `--bg-active` | `#e4e6ea` | n/a | D |
| `--border-subtle` | `#ebedf0` | n/a | D |
| `--border` | `#e0e2e6` | n/a | D |
| `--border-strong` | `#c9ccd2` | n/a | D |
| `--border-stronger` | `#b4b8bf` | n/a | D |
| `--text-primary` | `#1a1b1e` | 16.7:1 | D |
| `--text-secondary` | `#3c4149` | 9.9:1 | D |
| `--text-tertiary` | `#6b6f76` | 4.9:1 | D |
| `--text-quaternary` | `#9a9da3` | 2.6:1, **disabled only** | D |

### 2.3 Brand accent (indigo): token `--brand`

| Token | Dark | Light | Use |
|---|---|---|---|
| `--brand` | `#5e6ad2` (L) | `#5e6ad2` | Primary button fill, selected tab bar, focus ring |
| `--brand-hover` | `#6b77e0` (D) | `#4f5bc4` (D) | Primary button hover |
| `--brand-text` | `#828fff` (L, 7.0:1) | `#4a55c2` (D, 6.0:1) | Links, accent text, active icons |
| `--brand-tint` | `rgba(94,106,210,0.16)` | `rgba(94,106,210,0.10)` | Selected row, active nav item |
| `--on-brand` | `#ffffff` (4.7:1 on `#5e6ad2`) | `#ffffff` | Text on accent fill |

### 2.4 Status colors

Use them as **text/icon color + 15% tint background** (badges, chips). Never as large filled areas.

| Token | Dark (on canvas) | Light (on white) | Meaning in SuperSec |
|---|---|---|---|
| `--success` | `#4cb782` (8.0:1) | `#18794e` (D) | **Present**, Approved, Saved |
| `--danger` | `#eb5757` (5.7:1) | `#c93b3b` (5.0:1) | **Absent**, Exceeded, No Attendance, Declined, errors |
| `--info` | `#4ea7fc` (7.8:1) | `#1f6fbf` (5.1:1) | **Excused**, info notices |
| `--warning` | `#f2c94c` (12.6:1) | `#8a6400` (5.4:1) | **Watch** flag, Offline badge, Draft |
| `--orange` | `#fc7840` (7.5:1) | `#b5501a` (5.1:1) | **At Risk** flag, Streak, Priority |
| `--neutral` | `--text-tertiary` | `--text-tertiary` | **Not set**, Archived, No Class |
| `--recitation` | `--brand-text` | `--brand-text` | Recitation counts |

Tint formula: `color-mix(in srgb, var(--success) 15%, transparent)`.

### 2.5 Overlay

`--overlay`: dark `rgba(0,0,0,0.6)`, light `rgba(15,16,17,0.32)`. A backdrop blur of 2 px is optional and turns off with `prefers-reduced-transparency`.

## 3. Typography

**Family:** `Inter Variable` (self-hosted with `next/font`), with fallbacks `-apple-system, "Segoe UI", Roboto, sans-serif`. Turn on `font-feature-settings: "cv11", "ss01"` and `tabular-nums` for numbers in tables and counters.
**Mono:** `ui-monospace, "JetBrains Mono", Menlo, monospace` (Linear uses Berkeley Mono, which is paid, so we skip it). Mono is only for IDs and CSV previews.
**Weights:** 400 regular · **510 medium** · **590 semibold** (L). No 700.

| Token | Desktop (≥1024) | Mobile (<768) | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `--text-display` | 32/38 | 28/34 | 590 | -0.02em | Public subject header |
| `--text-title-1` | 24/32 | 22/28 | 590 | -0.015em | Page titles |
| `--text-title-2` | 20/28 | 18/26 | 590 | -0.012em | Section titles, dialog titles |
| `--text-title-3` | 15/22 | 17/24 | 590 | -0.01em | Card titles, student names on the roster |
| `--text-body` | 14/20 | 15/22 | 400 | -0.005em | Default text |
| `--text-small` | 13/18 | 14/20 | 400 | 0 | Meta, list secondary lines |
| `--text-label` | 13/16 | 14/18 | 510 | 0 | Buttons, inputs, tabs, form labels |
| `--text-caption` | 12/16 | 12/16 | 400 | 0.01em | Timestamps, helper text, history notes |
| `--text-micro` | 11/14 | 11/14 | 510 | 0.02em | Badge counts, keyboard hints |

Rules: sentence case everywhere. Inputs use **`--text-input` (16 px on mobile)** so iOS doesn't zoom. Long-form text (announcements, notes) is capped at 68ch.

## 4. Spacing, layout, grid

**Base unit 4 px.** `--space-0: 0 · -1: 4 · -2: 8 · -3: 12 · -4: 16 · -5: 20 · -6: 24 · -8: 32 · -10: 40 · -12: 48 · -16: 64` (also allowed: 2 and 6 for icon nudges).

| Layout token | Value |
|---|---|
| Page padding | 16 mobile · 24 tablet · 32 desktop |
| Card padding | 16 mobile · 16 to 20 desktop |
| Stack gap (between sections) | 24 mobile · 32 desktop |
| Sidebar width | 240 (desktop ≥1024), collapses to 56 icons at 768 to 1023 |
| Bottom tab bar | 56 + safe-area inset, mobile only |
| Top bar | 48 desktop · 52 mobile |
| Content max width | 960 secretary pages · 720 public pages · 68ch long text |
| Breakpoints | `sm 640 · md 768 · lg 1024 · xl 1280` (mobile-first) |

## 5. Radius, borders, elevation

| Token | Value | Use (L-based) |
|---|---|---|
| `--radius-xs` | 4 | Badges, checkboxes, menu items, tooltips |
| `--radius-sm` | 6 | Buttons, inputs, selects, segmented control |
| `--radius-md` | 8 | Cards, menus, popovers, toasts |
| `--radius-lg` | 12 | Dialogs, bottom sheets (top corners) |
| `--radius-full` | 9999 | Pills, avatars, the status dot |

**Borders:** always 1 px. Cards use `1px solid var(--border)`. Dark mode cards can use an inset ring instead: `box-shadow: inset 0 0 0 1px var(--border)`.

| Elevation | Dark | Light |
|---|---|---|
| `--shadow-0` (flat) | none, border only | none, border only |
| `--shadow-1` (cards on hover) | none | `0 1px 2px rgba(16,17,19,0.06)` |
| `--shadow-2` (menus, popovers, toasts) | `0 4px 24px rgba(0,0,0,0.40)` + border | `0 8px 24px rgba(16,17,19,0.12)` + border |
| `--shadow-3` (dialogs, sheets) | `0 16px 48px rgba(0,0,0,0.55)` + border | `0 16px 48px rgba(16,17,19,0.18)` + border |

**Z-index:** base 0 · sticky 10 · tab bar 20 · dropdown 30 · sheet/dialog 40 · toast 50 · tooltip 60.

## 6. Motion

| Token | Value | Use |
|---|---|---|
| `--dur-instant` | 80 ms | Press feedback, color changes |
| `--dur-fast` | 120 ms | Hover, toggles, the segmented control |
| `--dur-base` | 180 ms | Menus, popovers, tabs |
| `--dur-slow` | 240 ms | Sheets, dialogs (enter). Exit at 160 ms |
| `--ease-out` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Most transitions |
| `--ease-in-out` | `cubic-bezier(0.645, 0.045, 0.355, 1)` | Sheet slide |

1. **Press:** `transform: scale(0.97)` on `:active` for buttons and tappable rows (L).
2. **Menus:** fade + 4 px translate + scale from 0.98. **Sheets:** slide up from 100%.
3. **Counter +1:** the number ticks up 4 px with a 120 ms fade. A 10 ms haptic plays where it's supported.
4. **Only transform and opacity** get animated. Never width or height.
5. **`prefers-reduced-motion`:** remove movement and keep 80 ms opacity fades.

## 7. Interaction states (apply to every interactive element)

| State | Treatment |
|---|---|
| Default | As specified per component |
| Hover (pointer devices only, `@media (hover:hover)`) | Background goes to `--bg-hover` **or** the border goes to `--border-strong`, over 120 ms. Text tertiary goes to secondary |
| Focus-visible | `outline: 2px solid var(--brand); outline-offset: 2px` (keyboard only) |
| Active / pressed | `scale(0.97)` + `--bg-active` |
| Selected | `--brand-tint` background + `--brand-text` icon/text |
| Disabled | `opacity: 0.5`, `cursor: not-allowed`, no hover. Text uses `--text-quaternary` |
| Loading | Spinner replaces the leading icon, the width stays the same, `aria-busy="true"` |
| Error | `--danger` border + caption helper text in `--danger` + icon |

## 8. Components

### 8.1 Buttons

| Size | Height | Padding X | Font | Icon | Use |
|---|---|---|---|---|---|
| `sm` | 28 | 10 | label 13/510 | 14 | Dense toolbars (desktop) |
| `md` | 32 | 12 | label 13/510 | 16 | Default desktop |
| `lg` | 44 | 16 | label 15/510 | 18 | **Default mobile**, primary CTAs |
| `xl` | 52 | 20 | 16/590 | 20 | "Start Class Session" only |

| Variant | Default | Hover | Active |
|---|---|---|---|
| **Primary** | bg `--brand`, text `--on-brand`, no border | bg `--brand-hover` | scale 0.97 |
| **Secondary** | bg `--bg-surface-3`, 1 px `--border-strong`, text `--text-primary` | bg `--bg-hover` | scale 0.97, bg `--bg-active` |
| **Ghost** | transparent, text `--text-secondary` | bg `--bg-hover`, text `--text-primary` | `--bg-active` |
| **Danger** | bg danger tint 15%, text `--danger`, 1 px danger at 30% | tint 22% | scale 0.97 |
| **Icon** | square (28/32/44), ghost style, `aria-label` required | as ghost | as ghost |
| **Link** | text `--brand-text`, no padding | underline 1 px, offset 2 | n/a |

Radius 6 (pill 9999 for the floating "Start Class Session" on mobile). Gap between icon and label: 6. One primary button per view.

### 8.2 Inputs (text, textarea, search)

1. Height 32 desktop / 44 mobile, padding 0 10 (desktop) / 0 12 (mobile), radius 6.
2. Fill `--bg-surface-1`, border 1 px `--border`, text `--text-primary`, placeholder `--text-tertiary`.
3. Hover: `--border-strong`. Focus: border `--brand` + `box-shadow: 0 0 0 3px var(--brand-tint)`.
4. Label above the field (label 13/510, `--text-secondary`, gap 6). Helper/error text below (caption, gap 6).
5. Search has a leading 16 px magnifier icon (`--text-tertiary`) and a clear (×) button once there's text. `/` focuses search on desktop.
6. Textarea: min height 96, grows automatically up to 320.

### 8.3 Select and dropdown menu

1. **Trigger:** looks like an input, with a trailing 16 px chevron-down (`--text-tertiary`). The chevron rotates 180° when open (120 ms).
2. **Panel:** bg `--bg-elevated`, 1 px `--border`, radius 8, `--shadow-2`, padding 4, min width = trigger, max height 320 (scrolls), offset 4 px from the trigger.
3. **Item:** height 32 desktop / 44 mobile, padding 0 8, radius 4, label 13/400 (14 on mobile), optional leading 16 icon, trailing check (`--brand-text`) on the selected item.
4. **Item hover/keyboard-active:** `--bg-hover`. **Destructive item:** `--danger` text. **Section label:** micro 11/510 uppercase in `--text-tertiary`, padding 8 8 4. **Divider:** 1 px `--border-subtle`, margin 4 0.
5. **Keyboard:** ↑/↓ moves, Enter selects, Esc closes, type-ahead jumps. Focus returns to the trigger.
6. **Mobile (<768):** menus with more than 6 items open as a **bottom sheet** instead of a popover.

### 8.4 Segmented control: attendance (P / A / E / –)

1. Track: `--bg-surface-3`, radius 6, padding 2, height 32 desktop / **44 mobile**. Each segment is at least 44 px wide on mobile (4 segments = 176 px).
2. Segments are letters (P, A, E, –) with `aria-label`s (Present, Absent, Excused, Not set).
3. **Selected segment:** that status's tint at 15% + the status color for the text + a 1 px status border at 30%. **Unselected:** `--text-tertiary`.
4. Switches with a 120 ms background slide. One tap = saved (see 8.12 for the sync badge).

### 8.5 Stepper: recitation (− count +)

1. Buttons are 32 desktop / 44 mobile squares, ghost style, radius 6. The **−** button is disabled at 0.
2. The count is title-3, 590, tabular-nums, in `--recitation`, at least 24 px wide, centered.
3. Long-press on the count opens the "topic" field (Sheet on mobile, Popover on desktop).

### 8.6 Checkbox, radio, switch

1. Checkbox: 16 px, radius 4, border 1 px `--border-strong`. When checked: fill `--brand` + white check. Hit area is 44 px on mobile.
2. Radio: 16 px circle. Checked: 6 px `--brand` dot.
3. Switch: 32×18 track (`--bg-active`, on = `--brand`), 14 px white thumb, 120 ms slide.

### 8.7 Badges, chips, status dot

1. **Badge:** height 20, padding 0 6, radius 4, micro/caption 12/510, tint bg 15% + status text. Optional 12 px leading icon.
2. **Chip (filters):** height 28 / 36 mobile, radius 9999, 1 px `--border`, label 13/510. Selected: `--brand-tint` + `--brand-text`.
3. **Status dot:** 8 px circle in the status color. Always paired with a text label.
4. **Flag badges:** Watch (warning) · At Risk (orange) · Exceeded (danger) · No Attendance (danger, solid icon) · Streak (orange, text like "3 in a row").

### 8.8 Cards and list rows

1. **Card:** `--bg-surface-2`, 1 px `--border`, radius 8, padding 16. Hover (only if clickable): `--border-strong`.
2. **List row:** height 44 desktop / 56 mobile, padding 0 12 / 0 16, divider 1 px `--border-subtle`. Hover: `--bg-hover`. Selected: `--brand-tint`.
3. **Roster row, desktop (≥768):** 1 line, 48 px: name (title-3) · secondary text (small, tertiary) · P/A/E/– · stepper on the right.
4. **Roster row, mobile (<768): 2 lines, about 104 px.** Line 1: name (title-3) + recitation count badge. Line 2: P/A/E/– on the left (176 px) and the stepper on the right (112 px), with 8 px between them. *Why: name + 176 + 112 + gaps doesn't fit in 343 px (375 minus padding).*
5. **Absent/Excused rows** get a 2 px left edge in the status color, so you can spot the exceptions while scrolling.
6. **Subject card:** code + section (label, tertiary) · name (title-3) · "Next class: Thu 1:00 PM" (small) · shortcut row (icon buttons) · "Start Class Session" button when it's a class day.

### 8.9 Tabs

Underline tabs: height 40, label 13/510 (14 mobile), gap 20. Inactive: `--text-tertiary`, hover `--text-secondary`. Active: `--text-primary` + a 2 px `--brand` bar at the bottom (radius 2). They scroll sideways on mobile, with no wrapping.

### 8.10 Dialogs and bottom sheets

1. **Dialog (≥768):** width 480 (confirm) / 640 (forms), radius 12, padding 20, bg `--bg-elevated`, `--shadow-3`, `--overlay` behind. Title (title-2) · body (body) · footer actions on the right, gap 8, primary last.
2. **Bottom sheet (<768):** full width, top radius 12, 36×4 grab handle (`--border-stronger`) at the top, padding 16 + safe area, max height 90vh. Swipe down or tap the overlay to close (unless there's unsaved text).
3. Focus is trapped while open. Esc closes it. Focus returns to the trigger.
4. **Destructive confirms** name the thing ("Archive OLCA113?") and use a Danger button.

### 8.11 Toasts, tooltips, banners

1. **Toast:** bottom center above the tab bar on mobile, bottom right on desktop. `--bg-elevated`, 1 px `--border`, radius 8, `--shadow-2`, padding 12 14, body 14. Auto-dismisses after 4 s (6 s if it has an **Undo** action). `role="status"`.
2. **Tooltip:** desktop only, 500 ms delay, bg `--bg-elevated`, caption 12, padding 4 8, radius 4, max width 240.
3. **Banner (inline notice):** the full width of the content, radius 8, tint bg 10% + 1 px tint border at 25%, a 16 px icon, and body text. Used for "No Class today: Holiday" and "Archived subject".

### 8.12 Sync / offline badge (Class Session)

| State | Look | Text |
|---|---|---|
| Saved | `--text-tertiary` check icon | "Saved" (fades out after 1.5 s) |
| Saving | 12 px spinner | "Saving…" |
| Offline | warning tint badge | "Offline · 3 unsaved" |
| Failed | danger tint badge + Retry button | "Couldn't sync · Retry" |

It sits in the session's top bar, uses `aria-live="polite"`, and is never hidden behind a menu.

### 8.13 Navigation

1. **Mobile bottom tab bar (secretary):** Home · Subjects · **Session** (center, accent) · Requests (badge count) · More (Notes · Compiled report · Settings). **Session** opens the class happening now. Otherwise it opens the next class today, and if that's unclear, a picker sheet (R7). Icons 22 px. The label sits under the icon in micro 11/510. Active item: `--text-primary` + accent icon. Inactive: `--text-tertiary`.
2. **Desktop sidebar:** 240 px, `--bg-surface-1`, item height 30, radius 6, padding 0 8, icon 16 + label 13/510. Active item: `--bg-active` + `--text-primary`. Group labels in micro uppercase.
3. **Public top bar:** subject code + name (left), theme toggle + share (right). No secretary chrome at all.

### 8.14 Empty, loading, error

1. **Empty:** a 32 px tertiary icon, title-3, one sentence, one primary action ("Paste roster"). Centered, with 48 px vertical padding.
2. **Skeleton:** blocks in `--bg-surface-3`, radius 4, with a 1.2 s opacity pulse that turns off when reduced motion is on. Match the real layout.
3. **Error:** a danger icon, a plain-language message, a Retry button, and no stack traces.

### 8.15 Icons

Lucide, stroke 1.75. 16 px on desktop / 20 px on mobile (22 in the tab bar). Default color `--text-tertiary`, and `currentColor` inside buttons. Every icon-only button has an `aria-label`.

### 8.16 Rich text: editor (posts and notes)

Payload's Lexical editor, used only through `RichTextEditor` (PRD 1 §4.2). **Skin it, don't rebuild it.**

1. **Frame:** same as Input (§8.2): fill `--bg-surface-1`, 1 px `--border`, radius 6, focus = `--brand` border + 3 px `--brand-tint` ring. Min height 160, grows with the content (the page scrolls, not the editor).
2. **Text:** `--text-input` (16 px on mobile, so iOS doesn't zoom), `--text-primary`. Placeholder "Write something…" in `--text-tertiary`. Content capped at 68ch.
3. **Toolbar:** Payload's fixed toolbar, sticky at the top of the frame. **Not** the floating selection toolbar: on phones it fights the native copy/paste bubble. Show only the trimmed features from PRD 1 §4.2. Buttons 32 px desktop / 44 px mobile, active = `--brand-tint` fill + `--brand-text` icon. Keep Payload's icons and link drawer, recolored through tokens.
4. **Skin source:** wrap the editor in the same variable mapping as `/admin` (§10). Step 0.7 checks it in both themes on a phone.

### 8.17 Rich text: rendered content (public pages, post pages)

Rendered with `RichText` inside a `.rich-text` wrapper. Existing tokens only, no new ones.

| Element | Style |
|---|---|
| Paragraph | `--text-body`, `--text-primary`, 12 px between paragraphs |
| H2 / H3 | `--text-title-2` / `--text-title-3`, 20 px above, 8 px below. Never H1 (the page title is the H1) |
| Bold / italic | Weight **590** (we have no 700) / Inter's real italic loaded with `next/font`, no fake slant |
| Lists | 20 px indent, 4 px between items, markers in `--text-tertiary` |
| Link | Same as the Link button (§8.1): `--brand-text`, 1 px underline, offset 2. Long URLs wrap (`overflow-wrap: anywhere`). External links open in a new tab with `rel="noopener noreferrer"` |
| Quote | 2 px left border `--border-strong`, 12 px left padding, `--text-secondary` |

Rules: max width 68ch · the first element has no top margin · previews (cards, list rows, Messenger/OG text) use the **plain-text** version of the body (Payload's plaintext converter), clamped to 2 lines, never formatted.

## 9. Page patterns

1. **Secretary page:** top bar (title-1 + 1 primary action) → filters/tabs → content list → empty state when needed.
2. **Class Session (live):** a sticky header (subject, date, sync badge, Mark all Present, overflow menu) → search + filter chips (All · Absent · Excused · Not set · Recited) → roster rows (2-line on mobile) → a sticky footer on mobile with "Finish session" (primary, lg).
3. **Public subject page:** display header (code, name, prof, schedule) → No Class banner (if any) → pinned priority posts → latest posts → sessions list.
4. **Prof report (`/prof/:token`):** report title + version/date stamp → summary stats (4 cards) → flagged students table → full table. The print stylesheet removes the chrome, uses black on white, and keeps the table borders.

## 10. Payload admin (`/admin`) theming

Colors and font only. Map our tokens to Payload's CSS variables (`--theme-bg`, `--theme-text`, `--theme-elevation-0` through `-1000`, `--theme-success-*`, `--theme-error-*`) in `custom.scss`, using Inter. Don't rebuild admin components. The same mapping also wraps `RichTextEditor` on `/app` screens (§8.16).

## 11. Accessibility checklist

1. Text contrast is at least 4.5:1 (all text tokens above pass, except `--text-quaternary`, which is only for disabled states).
2. Touch targets are at least 44×44 on mobile. 8 px minimum between adjacent targets.
3. Visible focus on every interactive element (keyboard).
4. Status is never shown by color alone (letters, labels, icons).
5. `aria-live` for the sync badge, toasts, and counters. `aria-pressed`/`aria-checked` on segmented and stepper controls.
6. Respect `prefers-reduced-motion` and `prefers-reduced-transparency`. Theme: dark by default, with a manual Light toggle in the public top bar and in Settings (the choice is saved in a cookie).
7. Every image has alt text. It's a required field on upload (`SCHEMA.md` → `media.alt`).

## 12. Voice (UI copy)

Short, plain, and sentence case. Use the words in `CONTEXT.md` (Session, Entry, Request, Report link). Buttons are verbs ("Publish session", "Paste roster"). Dates look like "Thu, Oct 8 · 1:00 PM". Never blame the user: "Couldn't save. Retry?"

## 13. Complete `tokens.css` + Tailwind `@theme`

```css
/* tokens.css: dark is the default */
:root {
  /* surfaces */
  --bg-canvas:#08090a; --bg-surface-1:#0f1011; --bg-surface-2:#141516; --bg-surface-3:#18191a;
  --bg-elevated:#1c1c1f; --bg-hover:#232326; --bg-active:#28282c;
  /* borders */
  --border-subtle:#1d1e21; --border:#23252a; --border-strong:#34343a; --border-stronger:#3e3e44;
  /* text */
  --text-primary:#f7f8f8; --text-secondary:#d0d6e0; --text-tertiary:#8a8f98; --text-quaternary:#62666d;
  /* accent */
  --brand:#5e6ad2; --brand-hover:#6b77e0; --brand-text:#828fff; --brand-tint:rgba(94,106,210,.16); --on-brand:#fff;
  /* status */
  --success:#4cb782; --danger:#eb5757; --info:#4ea7fc; --warning:#f2c94c; --orange:#fc7840;
  --overlay:rgba(0,0,0,.6);
  /* elevation */
  --shadow-1:none; --shadow-2:0 4px 24px rgba(0,0,0,.40); --shadow-3:0 16px 48px rgba(0,0,0,.55);
  /* radius */
  --radius-xs:4px; --radius-sm:6px; --radius-md:8px; --radius-lg:12px; --radius-full:9999px;
  /* spacing (4 px grid) */
  --space-0:0; --space-0-5:2px; --space-1:4px; --space-1-5:6px; --space-2:8px; --space-3:12px; --space-4:16px;
  --space-5:20px; --space-6:24px; --space-8:32px; --space-10:40px; --space-12:48px; --space-16:64px;
  /* type: mobile-first sizes, desktop overrides below */
  --font-sans:"Inter Variable",-apple-system,"Segoe UI",Roboto,sans-serif;
  --font-mono:ui-monospace,"JetBrains Mono",Menlo,monospace;
  --fw-regular:400; --fw-medium:510; --fw-semibold:590;
  --text-display:28px/34px; --text-title-1:22px/28px; --text-title-2:18px/26px; --text-title-3:17px/24px;
  --text-body:15px/22px; --text-small:14px/20px; --text-label:14px/18px; --text-input:16px/24px; --text-caption:12px/16px; --text-micro:11px/14px;
  /* layout */
  --page-pad:16px; --topbar-h:52px; --tabbar-h:56px; --sidebar-w:240px; --content-max:960px; --public-max:720px;
  /* motion */
  --dur-instant:80ms; --dur-fast:120ms; --dur-base:180ms; --dur-slow:240ms;
  --ease-out:cubic-bezier(.25,.46,.45,.94); --ease-in-out:cubic-bezier(.645,.045,.355,1);
  /* z-index */
  --z-sticky:10; --z-tabbar:20; --z-dropdown:30; --z-dialog:40; --z-toast:50; --z-tooltip:60;
  color-scheme:dark;
}
@media (min-width:768px){ :root{ --page-pad:24px; } }
@media (min-width:1024px){
  :root{
    --page-pad:32px; --topbar-h:48px;
    --text-display:32px/38px; --text-title-1:24px/32px; --text-title-2:20px/28px; --text-title-3:15px/22px;
    --text-body:14px/20px; --text-small:13px/18px; --text-label:13px/16px; --text-input:13px/20px;
  }
}
[data-theme="light"] {
  --bg-canvas:#fbfbfc; --bg-surface-1:#f4f5f6; --bg-surface-2:#fff; --bg-surface-3:#eef0f2;
  --bg-elevated:#fff; --bg-hover:#eceef1; --bg-active:#e4e6ea;
  --border-subtle:#ebedf0; --border:#e0e2e6; --border-strong:#c9ccd2; --border-stronger:#b4b8bf;
  --text-primary:#1a1b1e; --text-secondary:#3c4149; --text-tertiary:#6b6f76; --text-quaternary:#9a9da3;
  --brand-hover:#4f5bc4; --brand-text:#4a55c2; --brand-tint:rgba(94,106,210,.10);
  --success:#18794e; --danger:#c93b3b; --info:#1f6fbf; --warning:#8a6400; --orange:#b5501a;
  --overlay:rgba(15,16,17,.32);
  --shadow-1:0 1px 2px rgba(16,17,19,.06); --shadow-2:0 8px 24px rgba(16,17,19,.12); --shadow-3:0 16px 48px rgba(16,17,19,.18);
  color-scheme:light;
}
@media (prefers-reduced-motion:reduce){ :root{ --dur-fast:0ms; --dur-base:80ms; --dur-slow:80ms; } }
```

```css
/* globals.css: Tailwind v4 + shadcn/ui mapping (uses shadcn's variable names) */
@import "tailwindcss";
@import "./tokens.css";

/* shadcn's expected variables, pointed at our tokens */
:root, [data-theme="light"] {
  --background: var(--bg-canvas);        --foreground: var(--text-primary);
  --card: var(--bg-surface-2);           --card-foreground: var(--text-primary);
  --popover: var(--bg-elevated);         --popover-foreground: var(--text-primary);
  --primary: var(--brand);              --primary-foreground: var(--on-brand);   /* primary button = indigo */
  --secondary: var(--bg-surface-3);      --secondary-foreground: var(--text-primary);
  --muted: var(--bg-surface-3);          --muted-foreground: var(--text-tertiary);
  --accent: var(--bg-hover);             --accent-foreground: var(--text-primary);  /* shadcn "accent" = hover background */
  --destructive: var(--danger);
  --input: var(--border);                --ring: var(--brand);
  --radius: var(--radius-sm);
}

@theme inline {
  /* shadcn names (used inside the generated components) */
  --color-background: var(--background);   --color-foreground: var(--foreground);
  --color-card: var(--card);               --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);         --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);         --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);     --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);             --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);          --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);           --color-input: var(--input);   --color-ring: var(--ring);

  /* our names (used in our own components) */
  --color-canvas: var(--bg-canvas);  --color-surface-1: var(--bg-surface-1);
  --color-surface-2: var(--bg-surface-2); --color-surface-3: var(--bg-surface-3);
  --color-elevated: var(--bg-elevated); --color-hover: var(--bg-hover); --color-active: var(--bg-active);
  --color-border-subtle: var(--border-subtle); --color-border-strong: var(--border-strong);
  --color-text-primary: var(--text-primary); --color-text-secondary: var(--text-secondary);
  --color-text-tertiary: var(--text-tertiary); --color-text-quaternary: var(--text-quaternary);
  --color-brand: var(--brand); --color-brand-hover: var(--brand-hover); --color-brand-text: var(--brand-text);
  --color-brand-tint: var(--brand-tint);
  --color-success: var(--success); --color-danger: var(--danger); --color-info: var(--info);
  --color-warning: var(--warning); --color-orange: var(--orange);

  --radius-xs: var(--radius-xs); --radius-sm: var(--radius-sm); --radius-md: var(--radius-md); --radius-lg: var(--radius-lg);
  --font-sans: var(--font-sans); --font-mono: var(--font-mono);
}
```

**After `npx shadcn init`:** delete the variables block it generates in `globals.css` and use the one above, so shadcn can't overwrite `--border` or add its own colors.

**Rules for Google Antigravity:** Use design tokens (`tokens.css`) as the foundation for the Linear dark aesthetic. Use `bg-brand` / `text-brand-text` for our indigo, and `text-text-tertiary` style classes for our text levels. **Never** use `bg-accent` for indigo (in shadcn it means hover). Standard Tailwind layout utilities (`p-4`, `flex`, `gap-2`) are welcome alongside tokens.

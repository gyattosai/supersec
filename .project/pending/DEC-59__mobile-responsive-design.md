# DEC-59 — Mobile Responsive Architecture & Safe-Area Defense

- **Target file(s):** `.project/logs/decisions.md`
- **Operation:** append
- **Category:** DEC
- **Status:** pending

## Content

```markdown
## Session 2026-09-05 — Mobile Responsive Architecture & Safe-Area Defense
- **Summary:** Established project-wide responsive design guidelines, safe-area inset standards, touch target constraints, and mobile navigation ergonomics.
- **Source task / Conversation:** `conversation://76387857-dee3-4dab-8861-4d7c4eab74aa`

### Mobile-First Navigation & Floating Controls Positioning
- **Context:** Mobile users on viewports < 768px suffered from cramped desktop sidebars, unreachable desktop action bars, and overlapping bottom action elements.
- **Decision:** Implement a dual-layer mobile navigation model in `DashboardLayout`:
  1. Bottom navigation bar pinned with safe-area padding (`pb-[calc(env(safe-area-inset-bottom,0px))]`), exposing 4 core desks and a "More" drawer trigger.
  2. Fixed/sticky action bars (e.g. `BulkActionBar`) dynamically float above the bottom nav on mobile viewports (`bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]`) and return to `bottom-0` on larger screens (`sm:bottom-0` / `lg:bottom-0`).
- **Rationale:** Ensures key navigation is reachable with one thumb while preventing modal/bulk actions from obscuring navigation or falling under iOS home indicators.
- **Impact:** Complete elimination of layout collisions between fixed bars and navigation controls across all mobile screens.
- **Status:** final

### 5-Item Grid Mobile Orphan Prevention
- **Context:** 5-item metric and summary grids on 2-column mobile displays left the 5th item as an unbalanced, orphaned single card.
- **Decision:** Standardize 5-item grids across Attendance and Reports desks to use `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` with `col-span-2 sm:col-span-1` on the final item.
- **Rationale:** The final card spans the full width of the mobile viewport, providing visual balance and room for secondary actions.
- **Impact:** Applied across `AttendancePage`, `PublicPages`, and `ReportsPage`.
- **Status:** final
```

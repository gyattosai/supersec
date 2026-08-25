# Design-System Alignment Brief

**Product:** Class Management System  
**Focus:** Secretary dashboard and the shared visual system it establishes  
**Direction:** Dark-first academic operations workspace

## Design diagnosis

The dashboard uses appropriate dark surfaces, clear labels, and accessible state colors, but its four equal metric cards and three equal feature cards compete for the same visual weight. On desktop this produces a generic control-panel rhythm; on mobile it produces a long sequence of similarly framed blocks. The redesign should make the next secretary action unmistakable while retaining fast access to Subjects, Attendance, Reports, Archive, and Settings.

## Design contract

| Design-system decision | Application in the dashboard |
|---|---|
| **Hierarchy over repetition** | Use one featured class-control surface, a quieter records summary, and a separately labeled workflow section instead of two consecutive grids of equal cards. |
| **Academic operations material** | Preserve the calm near-black canvas, soft document-like surfaces, precise blue action color, and state-only green/amber/red accents. Avoid decorative gradients or generic startup motifs. |
| **Measured breathing room** | Expand the dashboard content width on desktop, increase section separation, and keep the mobile layout spacious without oversized empty cards. |
| **Action clarity** | Give each workflow a clear operational verb—Manage Subjects, Review Attendance, and Prepare Reports—rather than repeating generic “Open” labels. |
| **State meaning** | Use blue for intentional navigation and primary action; green only for shared/published counts; muted gray for archived records; amber or red only when operational attention is required. |
| **Mobile ergonomics** | Preserve 44px controls, two-column compact record metrics, and single-column workflow cards that retain a clear title, explanation, and action. |

## Dashboard implementation plan

The upper dashboard becomes an editorial header paired with an at-a-glance records strip. Below it, a distinct **Class control** card anchors the primary Subject workflow, while three operational cards become an explicitly labeled **Next actions** section. The status message and Archive action move into a quieter records-and-retention section. This creates a visible reading order: understand the class state, choose the next task, then review retention or privacy guidance.

The refinement should use existing semantic CSS tokens and shadcn primitives, so the visual treatment remains consistent with the Subject, Content, Attendance, Reports, Archive, and Settings workspaces. It should not change data, routes, permissions, or public sharing behavior.

## Prioritized alignment backlog

| Priority | Shared surface or screen | Refinement | Product reach |
|---|---|---|---|
| **P0** | Secretary dashboard | Replace equal-weight metric and feature grids with a featured class-control surface, a compact records summary, and a clearly separated next-actions area. | Dashboard; establishes the visual hierarchy for the product. |
| **P1** | Surface and section shells | Standardize the relationship between an elevated workspace card, a quiet records card, and an operational callout using semantic backgrounds, border contrast, radius, and spacing. | Dashboard, Subjects, Attendance, Content, Reports, Archive, and Settings. |
| **P1** | Section headers and action groups | Use a consistent eyebrow, title, short operational description, and right-aligned contextual action pattern. | All private workspace pages. |
| **P1** | Status badges | Reserve accent color for semantic states—published/shared, private, attention, archived, and official—while keeping neutral workflow labels quiet. | Subjects, Attendance, Content, Reports, Archive, Settings, and public Q&A. |
| **P2** | Form shells and dialogs | Keep inputs grouped by task, give primary submit actions a clear footer position, and use concise helper text that distinguishes private preparation from public publication. | Subjects, Content, Attendance intake, No Class dialogs, and Settings. |
| **P2** | List rows and navigation cards | Make list rows scan as records first and actions second; align icon, label, state, and destination consistently; preserve 44px touch targets. | Subject roster and sessions, saved content, reports, Archive, and dashboard actions. |
| **P2** | Public share pages | Retain a more editorial, reading-focused rhythm with smaller metadata, stable content width, clear official/private boundaries, and low-noise History treatment. | Public Subject, Announcement, Resource, Q&A, Attendance, and report routes. |

## Representative screen refinements

The **Subjects** workspace already acts as the class control center, so its next design pass should prioritize separating the selected Subject identity from its operation modules while preserving the current direct management flow. **Attendance** should retain the stronger review-before-publish emphasis introduced by the PRD work, with statuses and unresolved suggestions using a single consistent operational alert treatment. **Content** should keep authoring controls visually subordinate to the draft, preview, media, and publication state, rather than allowing every card to read as equally important.

The **Reports** and **Archive** screens should emphasize durable records: summary first, record context second, and restore or share controls last. The **Settings** route should remain a lightweight management index rather than becoming a duplicate configuration surface. Public share pages should use the design system’s reading treatment and never inherit private management-card density.

## Implementation sequence

The first implementation increment is the dashboard because it has the broadest visibility and currently exposes the strongest density problem. The next increment should extract the improved dashboard shell patterns into reusable, token-driven section and action-card treatments before applying them to the Subjects, Content, Attendance, Reports, Archive, and Settings workspaces. Public pages follow as a deliberately separate reader-oriented surface rather than a copy of the private dashboard system.

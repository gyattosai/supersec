# Class Management System — Design Foundation

**Milestone:** 1 — Product design  
**Status:** Draft design foundation for the approved product-design package  
**Scope:** Visual and interaction direction only; no product implementation

## 1. Design intent

The Class Management System should feel **calm, clear, and dependable**. It is a practical tool for a class secretary working with details that need care—Attendance, class updates, shared links, and Reports. The design should feel polished without becoming decorative, and should make the current Subject, current class status, and next action obvious on a phone.

The app will be **dark mode first**. It will use Apple-inspired visual principles—system typography, clear hierarchy, restrained materials, direct feedback, and deliberate spacing—while remaining a web app rather than an imitation of a native iOS screen. Apple’s guidance favors semantic colors, system text styles, readable Dynamic Type scaling, and careful use of materials.[1] [2]

## 2. Visual principles

| Principle | Design rule |
|---|---|
| **Make the important thing clear** | One main action per screen. Show the current Subject, Schedule, and No Class notice before secondary details. |
| **Use familiar words** | Keep the approved labels: Dashboard, Subjects, Reports, Archive, Home, Attendance, Announcements, Resources, Questions & Answers, Schedule, Sharing, Settings, No Class, History, and Students. |
| **Keep people in control** | Every **LLM suggestion** is clearly labeled “Suggestion — review before publishing.” Use clear review states and never make a public Attendance update look automatic. |
| **Use calm hierarchy** | Reserve strong color and bright surfaces for actions, status, and urgent notices. Let content remain visually quiet. |
| **Design for Messenger entry** | A shared link must immediately show which Subject it belongs to and offer a clear route back to Home. |
| **Respect attention and privacy** | Keep private secretary information structurally separate from public pages. Do not expose raw Zoom names or private notes in public content or previews. |

## 3. Dark-mode-first color roles

The production app will apply semantic role names rather than scattered raw values. The reference values below define the initial dark-mode direction and must be checked again against the final material/background pair before implementation. Normal text requires at least 4.5:1 contrast; large text requires at least 3:1.[3]

| Role | Reference value | Intended use |
|---|---:|---|
| **Page background** | `#0B0D12` | Main app background |
| **Base surface** | `#151820` | Main cards and content panels |
| **Raised surface** | `#1D2029` | Menus, sheets, selected cards, and grouped controls |
| **Strong surface** | `#272B36` | High-emphasis information blocks and input fields |
| **Primary text** | `#F5F5F7` | Headings and core body text |
| **Secondary text** | `#B8BBC4` | Supporting information and labels |
| **Muted text** | `#8B8F99` | Metadata only; never the sole carrier of important meaning |
| **Action** | `#0A84FF` | Main actions, active controls, and interactive links |
| **Success** | `#30D158` | Confirmed and published states; always paired with text or an icon |
| **Warning** | `#FF9F0A` | No Class notices, review-required states, and caution |
| **Error** | `#FF453A` | Failed actions and blocking problems |
| **Info** | `#5E9CFF` | Helpful information and neutral status |

### Material rules

The main reading surfaces remain solid enough for dependable contrast. A dark translucent material may be used only for structural chrome such as the mobile bottom navigation, top bar, or a temporary sheet. It must not be layered over another translucent card. When reduced transparency is enabled, the material becomes a solid raised surface with a visible edge. This follows the HIG caution that translucent layers need additional care for legibility.[2] [3]

## 4. Typography

The app will use a system-font-first stack so it feels natural on Apple devices and remains readable on other platforms:

```text
-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", sans-serif
```

San Francisco is Apple’s standard system family; a system-first stack keeps the intended optical sizing and legibility where it is available, while using an appropriate platform fallback elsewhere.[1] The product will not rely on a proprietary font download.

| Style | Size / line height | Weight | Tracking | Use |
|---|---|---:|---:|---|
| **Display** | 34 / 40 | 700 | `-0.02em` | Subject title on Home and major empty states |
| **Heading 1** | 28 / 34 | 700 | `-0.018em` | Page titles |
| **Heading 2** | 22 / 28 | 650 | `-0.012em` | Section titles and important card headings |
| **Title** | 17 / 22 | 600 | `0` | Card and list titles |
| **Body** | 17 / 25 | 400 | `0` | Main reading text |
| **Body small** | 15 / 21 | 400 | `0` | Supporting descriptions |
| **Label** | 13 / 18 | 600 | `0.01em` | Category, status, and form labels |
| **Caption** | 12 / 16 | 500 | `0.012em` | Dates, source/domain, and History notes |

Large text uses tighter tracking and leading; body and smaller text use comfortable spacing for reading. Layout spacing will use relative units where possible so larger user text settings do not break cards, sheets, or actions.[4]

## 5. Layout, spacing, and responsive rules

The design uses an 8-point rhythm for major spacing: `8, 16, 24, 32, 40, 48`. A standard mobile page uses 16-pixel side padding, 24 pixels between major blocks, and 16 pixels inside cards. Interactive controls keep a minimum 44 by 44 CSS-pixel touch area.[3]

| Viewport | Layout rule |
|---|---|
| **Mobile, under 640 px** | One-column content, bottom navigation for the most-used public destinations, full-width primary actions, sheets for secondary actions, and sticky page context. |
| **Medium, 640–1023 px** | One-column main flow with two-column card groups where reading order remains clear. |
| **Desktop, 1024 px and above** | Persistent sidebar for secretary pages, wider content column, and side-by-side details only when they do not split a single task. Public pages retain the same simple structure rather than becoming a separate experience. |

## 6. Navigation direction

### Secretary area

The secretary sees a responsive app shell. On mobile, the main actions are reachable through a bottom navigation with **Dashboard, Subjects, Reports**, and a **More** destination containing Archive and Settings. On desktop, the same destinations appear in a sidebar. This follows the touch-first and thumb-reach preference for mobile while supporting precision navigation on desktop.[5]

### Public Subject pages

Public pages begin with the Subject identity block and expose **Home, Attendance, Announcements, Resources, Questions & Answers, and Schedule**. A deep link always has a labeled route back to **Home**. **Sharing** and **Settings** are never shown in public navigation.

## 7. Subject Home hierarchy

Subject Home is the design anchor for public links from Messenger. Its mobile order is fixed:

1. Subject name, subject code, professor name, and fixed weekday Schedule.
2. A prominent **No Class** notice when active; otherwise the next class session.
3. The primary destinations: Attendance, Announcements, Resources, and Questions & Answers.
4. The latest Announcement, useful Resources, and current Questions & Answers.
5. A clear “updated” line with links to History where relevant.

The design will test this order against the PRD target: a classmate should find the Subject details and any No Class notice within 30 seconds, and reach a recent Announcement, Resource, or Question & Answer from Home in two navigation steps or fewer.

## 8. Components and status language

| Pattern | Use | Key states |
|---|---|---|
| **Subject identity block** | Top of Home and secretary Subject pages | Default; No Class active; archived; public view |
| **Status badge** | Attendance, publication, and review state | PRESENT, ABSENT, NOT SET, Draft, Published, Updated, No Class, Review required |
| **Resource card** | External links and saved class materials | Preview available; fallback image; pinned; unavailable link |
| **Question & Answer item** | Shareable saved answer from Messenger | Published; Official; Updated; archived |
| **History row** | Public change context | First version; updated version; unavailable archived item |
| **Review row** | Secretary-only Zoom-name suggestion | Clear match; unclear match; unmatched; confirmed |
| **Notice** | Important information above content | No Class; warning; error; success; helpful information |

Status must use both text and a visual cue. Color alone is never sufficient.[3]

## 9. Motion and feedback

Motion supports understanding rather than decoration. Button press feedback appears immediately. Menus, sheets, and content transitions use short, interruptible opacity and transform transitions. Default interactions use a critically damped, no-bounce motion character; a stronger bounce is reserved only for a user-driven drag or flick.[4]

| Interaction | Default behavior | Reduced-motion behavior |
|---|---|---|
| Button press | Immediate 0.97 scale and color feedback | Color/opacity feedback only |
| Bottom sheet | Short upward sheet transition from its trigger | Short opacity cross-fade |
| Menu or filter | 180–220 ms origin-aware transition | Immediate or opacity-only change |
| Publish confirmation | Status change with a small check and clear text | Status text and color change without movement |
| Loading | Quiet skeleton or progress state | Static placeholder with progress text |

No long looping animations, parallax, or motion-heavy background effects are allowed. Focused keyboard actions are immediate.

## 10. Icon direction

The app uses simple outline icons with labels in navigation and important actions. A single class-workspace mark will be selected after the design foundation is reviewed. The initial direction is a familiar **books or stacked documents plus checkmark** idea, chosen for class information and confirmed records. It must remain clear at small sizes and work in a single color before any accent treatment.

The final icon search will favor an Apple-native visual weight and will be checked against the surrounding icon set before creating production assets. Icon-only controls must always have a visible tooltip where relevant and an accessible label.[3]

## 11. Accessibility baseline

The design package will include these non-negotiable checks:

| Check | Requirement |
|---|---|
| Touch targets | Minimum 44 by 44 CSS pixels for all interactive controls. |
| Contrast | 4.5:1 or higher for normal text; 3:1 or higher for large text. |
| Focus | Keyboard focus is always visible on interactive elements. |
| Labels | Every icon-only control has an accessible name; warnings and status do not rely on color alone. |
| Text size | Main flows remain usable at larger system text sizes without clipping essential content. |
| Reduced motion | Motion becomes a cross-fade or static state when reduced motion is preferred. |
| Reduced transparency | Glass materials become more opaque or solid; text contrast is rechecked. |
| Public safety | Private Zoom names, unclear suggestions, notes, and unpublished changes are structurally absent from public-page designs. |

## 12. References

[1]: [Apple Human Interface Guidelines — Typography](https://developer.apple.com/design/human-interface-guidelines/typography)

[2]: [Apple Human Interface Guidelines — Materials](https://developer.apple.com/design/human-interface-guidelines/materials)

[3]: [Apple Human Interface Guidelines — Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)

[4]: [Apple Design — Typography and design foundations](file:///home/ubuntu/skills/apple-design/SKILL.md)

[5]: [Apple Human Interface Guidelines — Designing for iOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios)

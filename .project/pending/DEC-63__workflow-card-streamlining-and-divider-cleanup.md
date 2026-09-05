# DEC-63 — Workflow Card Streamlining, Divider Cleanup, and Q&A Standardization

- **Target file(s):** `.project/logs/decisions.md`
- **Operation:** append
- **Category:** DEC
- **Status:** pending

## Content

```markdown
## Decision 2026-09-05 — Workflow Card Streamlining, Divider Cleanup, and Q&A Standardization
- **Context:** Workflow cards had redundant step/action prefix text ("SET UP", "RUN CLASS", "POST", "SHARE") that duplicated visual cognitive load next to step numbers. Arbitrary divider lines cluttered card bodies and toolbars. Top action buttons for Notes and Snippets duplicated actions already available in the workflow and tabs. Labels inconsistently used "Questions & Answers" versus "Q&A". Mobile views suffered from horizontal scroll bleed on toolbar filter strips and text clipping on "No Class" suspension pills.
- **Options Considered:**
  1. Keep prefix tags and add more badges for Notes/Snippets; retain horizontal overflow scrolling with custom scrollbars.
  2. Strip redundant step tags entirely, eliminate unnecessary divider splitters, standardize copy strictly to "Q&A", seamlessly integrate Notes (08) and Snippets (09) into Subject Workflows, convert sliders to responsive wrapping flex layouts, and expand view-mode switchers to >= 44px touch targets.
- **Decision:** Option 2. Removing artificial dividers and tag badges modernizes the card aesthetic, eliminates UI visual noise, prevents horizontal scroll bleed on phones, and elevates Notes and Snippets into first-class workflow citizens.
- **Rationale:**
  - High-density information design prioritizes clear typographic hierarchy over nested borders and repetitive badge tags.
  - Converting horizontal overflow strips to responsive flex-wrap layouts guarantees zero horizontal scrollbars on narrow mobile viewports (< 768px).
  - Standardizing "Q&A" prevents inconsistent terminology and reduces label truncation on constrained mobile screens.
- **Consequences:**
  - 100% of workflow cards display clean numeric index and title.
  - Zero horizontal scroll bleed on mobile filter/toolbar areas.
  - All 224 unit and feature tests pass with 0 regressions.
```

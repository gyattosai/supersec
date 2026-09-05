# Change ART-06 — Funnel card design system

- **Operation:** add
- **Target file(s):** `.project/artifacts.md`
- **Summary:** Register the reusable visual-system primitives and Subject funnel implementations.
- **Content:**
  ```markdown
  ## ART-012 — Funnel and premium record-card primitives
  - **Path/URL:** `client/src/index.css`
  - **Type:** code
  - **Purpose:** Defines the accessible white-on-orange action token and reusable `signal-card-shell`, `signal-record-card`, and `signal-funnel-step` visual primitives.
  - **Created:** 2026-08-27 | **Last updated:** 2026-08-27
  - **Format:** `.css`
  - **Notes:** `#c95000` is selected to support white primary labels at 4.53:1; the token rule is covered by `server/design-tokens.test.ts`.

  ## ART-011 — Subject-to-share funnel homes
  - **Path/URL:** `client/src/pages/IndependentSubjectWorkspacePage.tsx` and `client/src/pages/PremiumPublicSubjectHome.tsx`
  - **Type:** code
  - **Purpose:** Provides private and view-only Subject home flows organized around setup, class operation, publishing, and sharing.
  - **Created:** 2026-08-27 | **Last updated:** 2026-08-27
  - **Format:** `.tsx`
  - **Notes:** Both views use one-column card flows; the public implementation consumes only existing safe public data.
  ```
- **Reason:** Make the new reusable visual and interaction conventions discoverable for future design work.
- **Source task:** Current supersec funnel and card-system redesign.
- **Follow-up:** Apply after ART-01 creates the artifact registry.
- **Status:** applied

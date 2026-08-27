# Change ART-07 — Typography and theme system

- **Operation:** artifact-registration
- **Target file(s):** `.project/artifacts.md`
- **Summary:** Register the source files that define supersec’s active font roles and persistent light/dark behavior.
- **Content:**
  ```markdown
  ## ART-07 — Typography and theme system
  - **Path/URL:** `client/index.html`, `client/src/index.css`, `client/src/contexts/ThemeContext.tsx`, `client/src/components/ThemeToggle.tsx`
  - **Type:** code
  - **Purpose:** Defines the restored Manrope/Inter font loading and roles, dark-default and soft-white light tokens, SSR-safe persisted theme state, and the shared accessible mode switch.
  - **Created:** 2026-08-27 | **Last updated:** 2026-08-27
  - **Format:** `.html`, `.css`, `.tsx`
  - **Notes:** The selection persists at the `theme` local-storage key after hydration. Public and private headers use the same toggle; dark remains the default. Apply after the registry’s initial artifact card creates `.project/artifacts.md`.
  ```
- **Reason:** Makes the cross-cutting theme system findable without registering transient test scripts or captures.
- **Source task:** Current supersec typography and soft-white theme task.
- **Follow-up:** Apply after ART-01 creates the artifact registry.
- **Status:** pending

# Change ART-10 — Cross-page copy rules

- **Operation:** artifact-registration
- **Target file(s):** `.project/artifacts.md`
- **Summary:** Register the shared duplicate-heading and public-frame copy behavior.
- **Content:**
  ```markdown
  ## ART-10 — Cross-page copy rules
  - **Path/URL:** `client/src/components/WorkspacePageHeader.tsx`, `client/src/pages/PublicPages.tsx`, `client/src/pages/PremiumPublicSubjectHome.tsx`, `server/copy-redundancy.test.ts`, `server/public-shell.test.ts`
  - **Type:** code
  - **Purpose:** Suppresses an exact repeated workspace eyebrow/title pair and removes redundant generic public-frame footer wording while retaining view-only status and actionable content guidance.
  - **Created:** 2026-08-27 | **Last updated:** 2026-08-27
  - **Format:** `.tsx`, `.ts`
  - **Notes:** The comparison is case-insensitive and only removes an exact duplicate. It does not alter adjacent labels that distinguish a task or data type. Apply after ART-01 creates the artifact registry.
  ```
- **Reason:** Make the cross-page copy rule and its safety boundary discoverable across sessions.
- **Source task:** Cross-page copy-redundancy audit.
- **Follow-up:** Apply after ART-01 creates the artifact registry.
- **Status:** applied

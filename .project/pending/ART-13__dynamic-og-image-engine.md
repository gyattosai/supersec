# ART-13 — Dynamic OpenGraph & Social Preview Engine

- **Target file(s):** `.project/artifacts.md`
- **Operation:** append
- **Category:** ART
- **Status:** pending

## Content

```markdown
## Session 2026-09-01 — SEO & Dynamic OpenGraph Engine
- **Source task / Conversation:** `conversation://92f79904-62dd-4af2-b3b8-931d7c0a3ca1`
- **Summary:** Registered shared dynamic OpenGraph image cover engine and in-app social card previewer.

### Added — Dynamic OpenGraph Image Engine
- **Path:** `shared/ogImageEngine.ts`
- **Type:** code
- **Purpose:** Vector 1200x630 SVG generator supporting multiline wrapping, glowing color themes, and custom layout badges per public page type.
- **Owner / Consumer:** `server/_core/ogImage.ts` and `client/src/components/SocialPreviewCard.tsx`.
- **Notes:** Supports both standalone SVG via `/api/og` and client-side data URIs via `generateOgDataUrl()`.

### Added — In-App Social Preview Component
- **Path:** `client/src/components/SocialPreviewCard.tsx`
- **Type:** code
- **Purpose:** Interactive live preview console for Facebook Messenger, Discord/Telegram, Twitter/X, and Google Search results.
- **Owner / Consumer:** `SubjectSharingPage` (`client/src/pages/SubjectPages.tsx`).
- **Notes:** Includes 1-click Messenger link and formatted announcement copy buttons.

### Updated — Client Page Meta & Structured Data
- **Path:** `client/src/lib/meta.ts`
- **Type:** code
- **Purpose:** Real-time `<title>`, OpenGraph, Twitter card, Canonical, and Schema.org JSON-LD structured data injector.
- **Owner / Consumer:** All public routes (`/`, `/s/:id`, `/attendance/:id`, `/a/:id`, `/r/:id`, `/q/:id`, `/reports/:id`).
- **Notes:** Full coverage for Google Rich Results and Messenger link crawlers.
```

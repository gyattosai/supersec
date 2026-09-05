# MASTER-INSTRUCTION — supersec

## 1. Project Overview
- **Goal:** Provide a resilient, high-productivity class secretary management system hosted on Appwrite Cloud and Appwrite Sites.
- **Success criteria:** Zero runtime errors on Appwrite Sites, 100% test pass rate, reliable Appwrite Cloud Auth, Databases, and Storage synchronization.
- **Out of scope:** Third-party OAuth dependencies (Google OAuth removed per user mandate), legacy Manus server proxies.

## 2. Project State Index
| File / Directory | Purpose | Status |
|------------------|---------|--------|
| `.project/plan.md` | Milestones and tasks | exists |
| `.project/project-brief.md` | Accuracy-verified project brief | exists |
| `.project/logs/*.md` | All 11 logs maintained by `log-engine` | exists |
| `.project/logs/taxonomy.md` | Vocabulary changes maintained by `taxonomy-manager` | exists |
| `.project/artifacts.md` | Artifact registry (per-session block convention) | exists |
| `.project/memory.md` | Cross-session memory | exists |
| `.project/pending/` | `update-project`'s review queue | exists |
| `.project/changes-archive/` | Applied/rejected change history | exists |
| `.project/briefs/` | Approved project brief history | exists |
| `.project/drafts/` | Work-in-progress drafts | exists |
| `.agents/skills/` | Project skills catalog (224 specialized agent skills) | exists |

## 3. Mandatory Workflows
Every session MUST follow these rules when performing work:

| When you... | You MUST use skill | And then... |
|-------------|--------------------|-------------|
| Make a consequential decision | `log-engine` | append entry to `.project/logs/decisions.md` |
| Discover an insight | `log-engine` | append to `.project/logs/insights.md` |
| Hit a challenge/blocker | `log-engine` | append to `.project/logs/challenges.md` |
| Generate an idea | `log-engine` | append to `.project/logs/ideas.md` |
| Find a useful reference | `log-engine` | append to `.project/logs/references.md` |
| Try an approach that fails | `log-engine` | append to `.project/logs/failed-approaches.md` |
| Encounter an error | `log-engine` | append to `.project/logs/errors.md` |
| Attempt a fix | `log-engine` | append to `.project/logs/attempts.md` |
| Form a hypothesis | `log-engine` | append to `.project/logs/hypotheses.md` |
| Reach meaningful progress | `log-engine` | append to `.project/logs/progress.md` |
| Change a tag, topic, or grouping | `taxonomy-manager` | append/update/remove entry in `.project/logs/taxonomy.md` |
| Change milestones/tasks | `update-project` | stage a `PLN-*` card; applied only after approval |
| Submit any project file change | `update-project` | stage via `.project/pending/`; applied only after approval |
| Create a file worth remembering | `update-project` | register in `.project/artifacts.md` (`ART-*` card) |
| Change a shared convention/output | `update-project` | update `.project/artifacts.md` + affected files via Propagation Protocol |
| Validate deliverables / deployments | `quality-gate` | execute full test suites and typecheck validations |
| Optimize task prompts or few-shots | `prompt-optimizer` | stage `OPT-*` or `FSP-*` review card before execution |
| Build / edit Appwrite integrations | `appwrite-typescript` & `appwrite-cli` | adhere to Appwrite Cloud Web and Server SDK patterns |
| Modify UI, styling, or components | `shadcn`, `tailwind`, `frontend-design` | maintain high-contrast dark theme and component hierarchy |
| Pause mid-session | `session-lifecycle` | persist state to `.project/drafts/` |

## 4. Conventions
- **Naming:** PascalCase for React components (`AuthPage.tsx`), camelCase for utilities/adapters (`appwriteAdapter.ts`).
- **Structure:** `client/` for Vite frontend, `server/` for core routers/types, `.project/` for project knowledge ecosystem.
- **Quality bar:** All vitest tests must pass before deployment. Zero unresolved TypeScript errors.
- **Hosting Strategy:** Vite static adapter on Appwrite Sites CDN using client-side Appwrite SDK with CORS.

## 5. Session Rules
On resume, a fresh session MUST:
1. Read `.project/MASTER-INSTRUCTION.md` first.
2. Read `.project/memory.md` and `.project/plan.md`.
3. Skim the most recent entries of each active log in `.project/logs/`.
4. Continue from the last recorded progress point — never repeat work already logged as done.

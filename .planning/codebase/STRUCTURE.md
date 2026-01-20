# Codebase Structure

**Analysis Date:** 2026-01-20

## Directory Layout

```
meeseeks/
├── src/                    # Source code (TypeScript)
│   ├── components/         # Reusable UI components
│   ├── context/            # React context providers
│   ├── screens/            # Feature screen components
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Business logic utilities
│   ├── index.tsx           # App entry point
│   └── ascii.ts            # ASCII art constant
├── dist/                   # Compiled JavaScript (generated)
├── bin/                    # Compiled binaries (bun build)
├── .planning/              # Planning documents
│   └── codebase/           # Architecture analysis docs
├── .agents/                # Agent configuration
│   └── plans/              # Agent plans
├── .claude/                # Claude commands
│   └── commands/           # Custom slash commands
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── README.md               # Project documentation
```

## Directory Purposes

**`src/`:**
- Purpose: All TypeScript source code
- Contains: Components, contexts, screens, types, utilities
- Key files: `index.tsx` (entry point)

**`src/components/`:**
- Purpose: Reusable UI components shared across screens
- Contains: `Menu.tsx`
- Key files: `Menu.tsx` - main navigation menu

**`src/context/`:**
- Purpose: React context providers for global state
- Contains: `CopilotContext.tsx`, `KnowledgeBaseContext.tsx`
- Key files: Both provide hooks for consuming state

**`src/screens/`:**
- Purpose: Feature-specific screen components (full-page views)
- Contains: 6 screen components for different features
- Key files: `QAPlan.tsx`, `TestWatcher.tsx`, `KnowledgeBase.tsx`

**`src/types/`:**
- Purpose: Shared TypeScript type definitions
- Contains: `index.ts` with all types/interfaces
- Key files: `index.ts` - single source of truth for types

**`src/utils/`:**
- Purpose: All business logic, external integrations, data operations
- Contains: 11 utility modules
- Key files: `copilot.ts`, `git.ts`, `knowledgeBase.ts`, `rag.ts`

**`dist/`:**
- Purpose: Compiled JavaScript output from TypeScript
- Contains: Compiled .js files mirroring src structure
- Generated: Yes (via `npm run build`)
- Committed: Yes

**`bin/`:**
- Purpose: Compiled standalone binaries (bun)
- Contains: `meeseeks` executable
- Generated: Yes (via `npm run package`)
- Committed: Yes

## Key File Locations

**Entry Points:**
- `src/index.tsx`: Main application entry point, renders Ink app
- `dist/index.js`: Compiled entry point, npm bin target

**Configuration:**
- `package.json`: Dependencies, scripts, npm metadata
- `tsconfig.json`: TypeScript compiler options

**Core Logic:**
- `src/utils/copilot.ts`: GitHub Copilot API integration
- `src/utils/git.ts`: Git CLI operations wrapper
- `src/utils/knowledgeBase.ts`: KB CRUD operations
- `src/utils/rag.ts`: RAG embeddings and search
- `src/utils/tokenizer.ts`: Token counting and context condensing
- `src/utils/crawler.ts`: Web page crawler
- `src/utils/testGenerator.ts`: AI test generation
- `src/utils/fileWatcher.ts`: File system watcher
- `src/utils/settings.ts`: Config persistence
- `src/utils/rulesLoader.ts`: Testing rules loader
- `src/utils/qaPlan.ts`: QA plan file saving

**Screens:**
- `src/screens/QAPlan.tsx`: QA plan generation workflow
- `src/screens/TestWatcher.tsx`: File watcher for auto-test generation
- `src/screens/KnowledgeBase.tsx`: KB management UI
- `src/screens/CopilotConnect.tsx`: Copilot connection management
- `src/screens/GitChanges.tsx`: Git status viewer
- `src/screens/ModelSelect.tsx`: AI model selection

**Testing:**
- No test files present in codebase

## Naming Conventions

**Files:**
- Components/Screens: PascalCase (`QAPlan.tsx`, `Menu.tsx`)
- Utilities: camelCase (`copilot.ts`, `knowledgeBase.ts`)
- Types: camelCase (`index.ts`)
- Constants: camelCase (`ascii.ts`)

**Directories:**
- All lowercase, plural for collections (`screens/`, `utils/`, `components/`)
- Singular for specific purpose (`context/`, `types/`)

**Exports:**
- React components: Named exports with PascalCase
- Utility functions: Named exports with camelCase
- Types: Named exports with PascalCase (interfaces, types)
- Constants: Named exports with SCREAMING_SNAKE_CASE or camelCase

## Where to Add New Code

**New Feature Screen:**
- Primary code: `src/screens/NewFeature.tsx`
- Add route in: `src/index.tsx` (add to `renderScreen()` switch)
- Add menu item in: `src/components/Menu.tsx` (add to `menuItems`)
- Add screen type in: `src/types/index.ts` (extend `Screen` union)

**New Context Provider:**
- Implementation: `src/context/NewContext.tsx`
- Wrap in: `src/index.tsx` (add to provider hierarchy)
- Export hook: `useNewContext` in context file

**New Utility Module:**
- Implementation: `src/utils/newUtil.ts`
- Import from: Consuming screens or context providers

**New Type Definitions:**
- Add to: `src/types/index.ts`

**New Shared Component:**
- Implementation: `src/components/NewComponent.tsx`
- Import from: Consuming screens

**New AI/LLM Feature:**
- Use existing: `src/utils/copilot.ts` (`chatWithCopilot`)
- Token handling: `src/utils/tokenizer.ts`

## Special Directories

**`~/.meeseeks/` (User Home):**
- Purpose: Runtime data storage (not in repo)
- Contains: `config.json`, `knowledge/` directory
- Generated: Yes (at runtime)
- Committed: No

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (`npm install`)
- Committed: No

**`.auto-claude/`:**
- Purpose: Auto-claude project metadata (legacy)
- Contains: Project index, specs, ideation
- Generated: Yes (by external tooling)
- Committed: Yes

**`.claude/commands/`:**
- Purpose: Custom Claude slash commands
- Contains: Markdown command files
- Generated: Manual
- Committed: Yes

**`.opencode/`:**
- Purpose: OpenCode configuration
- Contains: Command definitions
- Generated: Manual
- Committed: Yes

## File Extension Patterns

| Extension | Purpose | Location |
|-----------|---------|----------|
| `.tsx` | React components with JSX | `src/`, `src/screens/`, `src/components/`, `src/context/` |
| `.ts` | TypeScript modules (no JSX) | `src/utils/`, `src/types/` |
| `.js` | Compiled JavaScript | `dist/` |
| `.json` | Configuration, manifests | Root, `~/.meeseeks/` |
| `.md` | Documentation | Root, `.planning/` |

---

*Structure analysis: 2026-01-20*

# Technology Stack

**Analysis Date:** 2026-01-20

## Languages

**Primary:**
- TypeScript 5.5.4 - All source code (`src/**/*.ts`, `src/**/*.tsx`)

**Secondary:**
- None

## Runtime

**Environment:**
- Node.js >= 18.0.0 (specified in `package.json` engines)
- ES2020 target with NodeNext module resolution (`tsconfig.json`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

**Alternative Runtimes:**
- Bun (optional) - Used for native binary compilation via `bun build --compile`

## Frameworks

**Core:**
- React 18.3.1 - UI framework for terminal interface
- Ink 5.0.0 - React renderer for CLI/terminal interfaces

**Build/Dev:**
- TypeScript 5.5.4 - Type checking and compilation
- tsx 4.19.1 - TypeScript execution (dev mode)
- esbuild 0.27.2 - Bundling (alternative build)

## Key Dependencies

**Critical:**
- `ink` ^5.0.0 - Terminal UI rendering (React-based CLI framework)
- `react` ^18.3.1 - Component framework (required by Ink)
- `@xenova/transformers` ^2.17.2 - ML embeddings for RAG (transformer models)
- `gpt-tokenizer` ^3.4.0 - Token counting for context management

**UI Components:**
- `ink-text-input` ^6.0.0 - Text input components for Ink
- `ink-select-input` ^6.2.0 - Selection input components for Ink

**Utilities:**
- `chokidar` ^4.0.3 - File system watching
- `fast-glob` ^3.3.3 - Fast file globbing
- `html-to-text` ^9.0.5 - HTML parsing for web crawler

**Development Only:**
- `@types/node` ^20.14.11 - Node.js type definitions
- `@types/react` ^18.3.3 - React type definitions
- `@types/html-to-text` ^9.0.4 - HTML-to-text type definitions
- `@yao-pkg/pkg` ^6.12.0 - Node binary packaging
- `react-devtools-core` ^4.28.5 - React debugging (dev only)

## Configuration

**TypeScript:**
- Config: `tsconfig.json`
- Target: ES2020
- Module: NodeNext
- JSX: react-jsx
- Strict mode: enabled
- Output: `dist/`

**Build Scripts:**
```bash
npm run start      # tsx src/index.tsx (development)
npm run build      # tsc (TypeScript compilation)
npm run bundle     # esbuild bundling
npm run package    # bun compile to native binary
```

**Environment:**
- No `.env` file required for core functionality
- Copilot tokens are auto-detected from system locations:
  - `~/.copilot-cli-access-token` (CLI)
  - `~/.config/github-copilot/apps.json` (VS Code macOS/Linux)
  - `~/.config/github-copilot/hosts.json` (VS Code fallback)
  - `~/AppData/Local/github-copilot/` (Windows)

**Local Storage:**
- Config directory: `~/.meeseeks/`
  - `config.json` - Application settings
  - `knowledge/` - Knowledge base data and indexes

## Build Output

**Distribution:**
- `dist/` - Compiled JavaScript (ES modules)
- `bin/` - Native binaries (when using bun compile)

**Package Publishing:**
- npm package: `@piyushimraw/meeseeks`
- Entry point: `dist/index.js`
- Binary name: `meeseeks`

## Platform Requirements

**Development:**
- Node.js >= 18.0.0
- npm or compatible package manager
- Git (for git-related features)

**Production:**
- Node.js >= 18.0.0 (npm install)
- OR standalone binary (bun-compiled, no Node required)

**Supported Platforms:**
- macOS (darwin) - Primary development platform
- Linux (x64) - Via `npm run package:linux`
- Windows (x64) - Via `npm run package:win`

## Module System

**Type:** ES Modules (`"type": "module"` in package.json)

**Import Style:**
- Named imports with `.js` extension for local modules
- Example: `import {foo} from './utils/bar.js'`

---

*Stack analysis: 2026-01-20*

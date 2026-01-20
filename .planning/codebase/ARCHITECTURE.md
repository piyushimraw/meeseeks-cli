# Architecture

**Analysis Date:** 2026-01-20

## Pattern Overview

**Overall:** Component-Based React Terminal UI with Provider Pattern

**Key Characteristics:**
- React-based terminal UI using Ink framework
- Context providers for global state management (Copilot auth, Knowledge Base)
- Screen-based navigation with state machine patterns per screen
- Utility layer for all business logic (AI, Git, RAG, file operations)
- Local filesystem persistence for configuration and knowledge bases

## Layers

**Entry Point / Shell:**
- Purpose: Application bootstrap and provider wrapping
- Location: `src/index.tsx`
- Contains: App component, provider hierarchy, ASCII art rendering
- Depends on: All screens, context providers
- Used by: CLI execution

**Context Providers:**
- Purpose: Global state management and shared functionality
- Location: `src/context/`
- Contains: `CopilotContext.tsx`, `KnowledgeBaseContext.tsx`
- Depends on: Utility layer (settings, copilot, knowledgeBase utils)
- Used by: All screen components

**Screen Components:**
- Purpose: Feature-specific UI and user interaction flows
- Location: `src/screens/`
- Contains: `QAPlan.tsx`, `TestWatcher.tsx`, `CopilotConnect.tsx`, `GitChanges.tsx`, `KnowledgeBase.tsx`, `ModelSelect.tsx`
- Depends on: Context hooks, utility functions, Ink components
- Used by: Main App router

**Shared Components:**
- Purpose: Reusable UI components
- Location: `src/components/`
- Contains: `Menu.tsx`
- Depends on: Ink, context hooks
- Used by: Main App

**Utility Layer:**
- Purpose: All business logic, external integrations, data processing
- Location: `src/utils/`
- Contains: AI integration, Git operations, RAG/embeddings, file watching, crawling
- Depends on: Node.js APIs, external packages
- Used by: Context providers, screen components

**Types:**
- Purpose: TypeScript type definitions shared across the app
- Location: `src/types/index.ts`
- Contains: All interfaces and type aliases
- Depends on: Nothing
- Used by: All layers

## Data Flow

**QA Plan Generation:**

1. User selects diff source (branch comparison or uncommitted changes) via `QAPlan.tsx`
2. Git diff retrieved via `src/utils/git.ts` (`getBranchDiff` or `getUncommittedDiff`)
3. Optional: Knowledge base searched via `src/utils/knowledgeBase.ts` -> `src/utils/rag.ts`
4. Context condensed if exceeding model limits via `src/utils/tokenizer.ts`
5. Copilot API called via `src/utils/copilot.ts` (`chatWithCopilot`)
6. Response displayed and optionally saved via `src/utils/qaPlan.ts`

**Test Watcher Flow:**

1. User configures glob pattern and output location via `TestWatcher.tsx`
2. File watcher started via `src/utils/fileWatcher.ts` (uses chokidar)
3. On file change, test generator invoked via `src/utils/testGenerator.ts`
4. Testing rules loaded via `src/utils/rulesLoader.ts`
5. Copilot API called to generate tests
6. Test file written to configured location

**Knowledge Base Flow:**

1. User creates KB and adds URL sources via `KnowledgeBase.tsx`
2. Web crawler fetches pages via `src/utils/crawler.ts`
3. Pages stored in `~/.meeseeks/knowledge/{kbId}/pages/`
4. Indexing creates chunks and embeddings via `src/utils/rag.ts`
5. Search uses cosine similarity on embeddings for semantic retrieval

**State Management:**
- Global auth state managed in `CopilotContext` with auto-detection on mount
- Knowledge base list managed in `KnowledgeBaseContext` with filesystem sync
- Per-screen state uses local `useState` with state machine patterns
- Copilot token kept in memory (not persisted) for security

## Key Abstractions

**CopilotContext:**
- Purpose: Manages Copilot authentication, token handling, model selection
- Examples: `src/context/CopilotContext.tsx`
- Pattern: React Context + Provider with hooks (`useCopilot`)

**KnowledgeBaseContext:**
- Purpose: Manages knowledge bases, crawling state, indexing state
- Examples: `src/context/KnowledgeBaseContext.tsx`
- Pattern: React Context + Provider with hooks (`useKnowledgeBase`)

**Screen State Machines:**
- Purpose: Manage complex multi-step UI flows
- Examples: `QAPlanState` in `src/screens/QAPlan.tsx`, `WatcherState` in `src/screens/TestWatcher.tsx`
- Pattern: TypeScript union types for states, switch-based rendering

**Embedding System (RAG):**
- Purpose: Semantic search over knowledge base content
- Examples: `src/utils/rag.ts`
- Pattern: TF-IDF fallback with optional transformer embeddings

## Entry Points

**CLI Entry:**
- Location: `src/index.tsx`
- Triggers: `npm start`, `meeseeks` command
- Responsibilities: Render React app with Ink, wrap in providers

**Copilot API:**
- Location: `src/utils/copilot.ts`
- Triggers: Called by screens needing AI responses
- Responsibilities: Token exchange, API calls, response handling

**Git Operations:**
- Location: `src/utils/git.ts`
- Triggers: Called by QAPlan and GitChanges screens
- Responsibilities: Shell out to git CLI, parse responses

**Knowledge Base Storage:**
- Location: `src/utils/knowledgeBase.ts`
- Triggers: Called by KnowledgeBaseContext
- Responsibilities: CRUD operations on `~/.meeseeks/knowledge/`

## Error Handling

**Strategy:** Graceful degradation with user-visible errors

**Patterns:**
- Try-catch in async operations with error state propagation
- Error states in screen state machines (`'error'` state)
- Fallback behaviors (e.g., TF-IDF when transformers unavailable)
- API errors shown to user with retry options
- Git operations fail silently with default values when not in repo

## Cross-Cutting Concerns

**Logging:** Console-based via Ink's Text components (no logging framework)

**Validation:** URL validation in crawler, config validation in contexts

**Authentication:** Token detection from known Copilot locations, OAuth token exchange for API calls

**Token Management:** Context condensing in `src/utils/tokenizer.ts` to fit model limits

**Persistence:** JSON files in `~/.meeseeks/` for config and knowledge bases

---

*Architecture analysis: 2026-01-20*

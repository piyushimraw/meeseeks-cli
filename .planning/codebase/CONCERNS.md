# Codebase Concerns

**Analysis Date:** 2026-01-20

## Tech Debt

**No Unit Test Coverage:**
- Issue: The codebase has zero unit tests. No test files exist in `src/`.
- Files: All files in `src/utils/`, `src/screens/`, `src/context/`, `src/components/`
- Impact: No automated verification of behavior. Refactoring is risky. Bugs can be introduced undetected.
- Fix approach: Add Jest or Vitest configuration. Start with utility functions (`src/utils/copilot.ts`, `src/utils/git.ts`, `src/utils/tokenizer.ts`) which are pure logic and easier to test. Mock external APIs and file system.

**Hardcoded Model List:**
- Issue: `FALLBACK_MODELS` in `src/utils/copilot.ts` (lines 374-384) hardcodes model IDs. List will become stale as models are added/deprecated.
- Files: `src/utils/copilot.ts`
- Impact: New models from Copilot API won't be available without code update. User confusion when hardcoded models fail.
- Fix approach: Rely more heavily on API `/models` endpoint. Only use fallback for offline/error scenarios. Add a "refresh models" action.

**Magic Numbers and Strings:**
- Issue: Configuration values scattered throughout codebase without centralization.
- Files:
  - `src/utils/rag.ts` (lines 10-11): `MAX_CHUNK_SIZE = 500`, `CHUNK_OVERLAP = 50`
  - `src/utils/knowledgeBase.ts` (line 18): `MAX_CONTENT_SIZE = 100 * 1024`
  - `src/utils/crawler.ts` (line 10): `RATE_LIMIT_DELAY = 500`
  - `src/utils/git.ts` (line 171): `MAX_DIFF_LINES = 500`
  - `src/utils/tokenizer.ts` (lines 7-18): Model token limits object
- Impact: Hard to adjust settings. Risk of inconsistency when values should be related.
- Fix approach: Create a centralized `config.ts` with all tunable parameters. Consider making some user-configurable via settings.

**Large Screen Components:**
- Issue: Screen components combine UI, state management, and business logic in single files.
- Files:
  - `src/screens/QAPlan.tsx` (725 lines)
  - `src/screens/KnowledgeBase.tsx` (602 lines)
  - `src/screens/TestWatcher.tsx` (494 lines)
- Impact: Hard to test, hard to maintain, hard to understand. State management mixed with rendering.
- Fix approach: Extract business logic into custom hooks. Split large render functions into smaller components. Create separate state machines for complex flows.

**Inconsistent Error Handling:**
- Issue: Many `catch` blocks silently ignore errors with empty handlers or `// Ignore errors` comments.
- Files:
  - `src/utils/copilot.ts` (lines 68-70, 96-98)
  - `src/utils/rag.ts` (lines 186-188, 466-467, 645-646, 772-773)
  - `src/utils/knowledgeBase.ts` (lines 62-63, 67-68, 84-85, 188-189, 317-318, 321-322)
  - `src/utils/fileWatcher.ts` (lines 27-28, 152-153, 169-170, 189-190)
  - `src/utils/settings.ts` (lines 30-32)
- Impact: Silent failures make debugging difficult. Users don't know when operations fail.
- Fix approach: Implement proper error logging. Return explicit error results instead of null/undefined. Add user-facing error messages for recoverable errors.

## Known Bugs

**Git Status Memory Issue with Large Repos:**
- Symptoms: The `-uall` flag in `git status --porcelain=v1 -uall` (line 106 of `src/utils/git.ts`) can cause memory issues with large repositories containing many untracked files.
- Files: `src/utils/git.ts`
- Trigger: Running git status on repos with thousands of untracked files in node_modules or build directories.
- Workaround: None currently. The `maxBuffer` is set to 10MB but large output can still cause issues.

**Transformer Model Download Blocks UI:**
- Symptoms: First-time indexing with transformer embeddings causes the UI to freeze during model download.
- Files: `src/utils/rag.ts` (lines 198-216)
- Trigger: First time running index on a knowledge base when `@xenova/transformers` needs to download the model.
- Workaround: Falls back to TF-IDF mode if transformer init fails, but initial freeze still occurs.

**Refresh After Crawl Uses Stale State:**
- Symptoms: After crawling, the UI may show stale page counts until manually refreshing.
- Files: `src/screens/KnowledgeBase.tsx` (lines 121-131, 145-156, 196-210)
- Trigger: Complete a crawl operation and the state may not reflect new page counts.
- Workaround: Navigate back and re-enter the KB detail view.

## Security Considerations

**Token Storage in Memory:**
- Risk: Copilot OAuth token stored in module-level variable `memoryToken` persists for process lifetime.
- Files: `src/context/CopilotContext.tsx` (line 46)
- Current mitigation: Token not persisted to disk. Only kept in memory during session.
- Recommendations: Consider token refresh on each operation instead of caching. Clear token from memory on error states.

**Copilot Token Cache:**
- Risk: Exchanged Copilot API token cached with expiry at module level (`cachedCopilotToken`).
- Files: `src/utils/copilot.ts` (line 20)
- Current mitigation: Token has expiry check before use.
- Recommendations: Ensure cache is cleared on process exit. Add max-age validation.

**Config File Permissions:**
- Risk: Config stored in `~/.meeseeks/config.json` may have permissive file permissions.
- Files: `src/utils/settings.ts`
- Current mitigation: None - uses default file permissions.
- Recommendations: Set restrictive permissions (0600) when writing config. Validate file permissions on read.

**Web Crawler User-Agent:**
- Risk: Crawler identifies as `Meeseeks-CLI/1.0` which may be blocked by some sites.
- Files: `src/utils/crawler.ts` (line 20)
- Current mitigation: None.
- Recommendations: Allow user-configurable User-Agent. Respect robots.txt.

**No Input Sanitization for KB Names:**
- Risk: KB names used in file paths without full sanitization.
- Files: `src/utils/qaPlan.ts` (function `sanitizeFilename`)
- Current mitigation: Basic sanitization in qaPlan but not used for KB creation.
- Recommendations: Apply consistent sanitization to all user inputs used in file operations.

## Performance Bottlenecks

**Synchronous File Operations:**
- Problem: Most file operations use synchronous Node.js APIs (`fs.readFileSync`, `fs.writeFileSync`).
- Files: `src/utils/knowledgeBase.ts`, `src/utils/rag.ts`, `src/utils/settings.ts`, `src/utils/git.ts`
- Cause: Synchronous I/O blocks the event loop, can cause UI stuttering.
- Improvement path: Convert to async/await with `fs.promises`. Use async iterators for directory reading.

**Full File Content Loading:**
- Problem: `loadKnowledgeBaseContent` loads all pages into memory (up to 100KB truncation limit).
- Files: `src/utils/knowledgeBase.ts` (lines 275-326)
- Cause: No streaming, entire content assembled in memory.
- Improvement path: Use RAG search instead of full content. Stream content in chunks if full load needed.

**TF-IDF Vocabulary in Memory:**
- Problem: TF-IDF vocabulary (up to 5000 terms) kept in memory per knowledge base during indexing.
- Files: `src/utils/rag.ts` (lines 23-28, 79-113)
- Cause: Design choice for fast lookup, but scales poorly with multiple KBs.
- Improvement path: Lazy load vocabulary per KB. Consider persistent index structures like SQLite.

**Git Diff Unbounded:**
- Problem: `getBranchDiff` can return very large diffs without token limits applied at source.
- Files: `src/utils/git.ts` (lines 304-342)
- Cause: Diff only truncated later in `src/utils/tokenizer.ts`.
- Improvement path: Apply token limits directly in git utilities. Stream diff content.

## Fragile Areas

**RAG Embedding Mode Detection:**
- Files: `src/utils/rag.ts` (lines 14-21, 198-216, 254-270)
- Why fragile: Global mutable state (`currentMode`, `transformerEmbedder`, `tfidfState`) shared across operations. Race conditions possible if multiple indexing operations run.
- Safe modification: Add mutex/lock for embedding operations. Pass state explicitly instead of using globals.
- Test coverage: Zero - no tests for embedding logic.

**State Machine in Screen Components:**
- Files: `src/screens/QAPlan.tsx`, `src/screens/KnowledgeBase.tsx`
- Why fragile: Complex state transitions managed via string unions and nested conditionals. Easy to miss state transitions or create invalid states.
- Safe modification: Extract to XState or similar state machine library. Add explicit state transition guards.
- Test coverage: Zero - no component tests.

**Git Command Execution:**
- Files: `src/utils/git.ts`
- Why fragile: Relies on specific git CLI output formats. Different git versions may produce different output.
- Safe modification: Add git version detection. Use porcelain formats consistently. Add integration tests against known git versions.
- Test coverage: Zero - no tests.

## Scaling Limits

**Knowledge Base Size:**
- Current capacity: Designed for ~50 pages per source (hardcoded in crawler).
- Limit: Memory usage scales linearly with page count. TF-IDF vocabulary limited to 5000 terms.
- Scaling path: Implement pagination for KB browsing. Use streaming for large KB operations. Consider database storage.

**Concurrent Operations:**
- Current capacity: Single operation at a time (crawling, indexing).
- Limit: UI blocks during long operations.
- Scaling path: Move heavy operations to worker threads. Add operation queue with progress tracking.

**Context Window Management:**
- Current capacity: Truncation based on model limits.
- Limit: Large diffs or KBs get heavily truncated, losing context.
- Scaling path: Implement smarter context selection (prioritize recent/relevant changes). Add multi-turn conversation support.

## Dependencies at Risk

**@xenova/transformers:**
- Risk: Heavy dependency (~100MB+ model downloads) for optional feature. Package maintenance status uncertain.
- Impact: First-time index very slow. Users may not have network access.
- Migration plan: Make transformer optional at install time. Consider lighter embedding alternatives or API-based embeddings.

**ink and ink-* packages:**
- Risk: Terminal UI framework with complex React-like lifecycle. Version 5 has breaking changes from v4.
- Impact: UI bugs hard to debug. Limited community support for edge cases.
- Migration plan: Pin versions carefully. Consider simpler TUI alternatives for CLI-only operations.

## Missing Critical Features

**No Offline Mode:**
- Problem: Requires Copilot API access for core functionality.
- Blocks: Using the tool without network access or Copilot subscription.

**No Configuration Management:**
- Problem: No user-facing way to configure behavior (chunk sizes, token limits, etc.).
- Blocks: Customizing tool behavior for different use cases.

**No Export/Import:**
- Problem: Knowledge bases stored only locally with no export capability.
- Blocks: Sharing KBs across machines or teams.

## Test Coverage Gaps

**All Utility Functions:**
- What's not tested: Every function in `src/utils/` (copilot, git, rag, knowledgeBase, crawler, tokenizer, settings, fileWatcher, testGenerator, qaPlan, rulesLoader)
- Files: `src/utils/*.ts`
- Risk: Core business logic unverified. Regressions undetectable.
- Priority: High - start with pure functions in `tokenizer.ts`, `git.ts`

**React Components/Screens:**
- What's not tested: All screen components, contexts, and hooks
- Files: `src/screens/*.tsx`, `src/context/*.tsx`, `src/components/*.tsx`
- Risk: UI behavior unverified. State management bugs.
- Priority: Medium - after utility coverage

**Integration Points:**
- What's not tested: Copilot API integration, git command execution, file system operations
- Files: All files interfacing with external systems
- Risk: Breaking changes in dependencies undetected.
- Priority: Medium - add integration tests with mocks

---

*Concerns audit: 2026-01-20*

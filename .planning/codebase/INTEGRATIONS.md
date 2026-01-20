# External Integrations

**Analysis Date:** 2026-01-20

## APIs & External Services

**GitHub Copilot API:**
- Primary AI backend for all LLM functionality
- SDK/Client: Native `fetch` API (no SDK)
- Auth: OAuth token from VS Code/CLI installations
- Endpoints:
  - Token exchange: `https://api.github.com/copilot_internal/v2/token`
  - Chat completions: `{apiEndpoint}/chat/completions`
  - Models list: `{apiEndpoint}/models`
- Implementation: `src/utils/copilot.ts`

**Supported Models (via Copilot):**
- GPT-4o, GPT-4o Mini, GPT-4, GPT-4 Turbo, GPT-3.5 Turbo (OpenAI)
- Claude 3.5 Sonnet, Claude 3.5 Haiku (Anthropic)
- o1-preview, o1-mini (OpenAI)
- Gemini 3 Flash Preview (Google) - Defined in token limits

## Data Storage

**Local File Storage:**
- Configuration: `~/.meeseeks/config.json`
  - Stores: Copilot connection info, selected model
- Knowledge Bases: `~/.meeseeks/knowledge/{kbId}/`
  - `manifest.json` - KB metadata
  - `pages/` - Crawled page content (JSON files)
  - `index/` - RAG index files
    - `chunks.json` - Text chunks with metadata
    - `embeddings.bin` - Binary embedding vectors
    - `vocabulary.json` - TF-IDF vocabulary (when using TF-IDF mode)
- QA Plans: `{project}/plans/qa/*.md` - Saved QA plan markdown files

**Databases:**
- None (all data stored in local filesystem)

**File Storage:**
- Local filesystem only
- Binary embeddings stored in custom format

**Caching:**
- In-memory token cache for Copilot API tokens
- Cached until expiration (~30 minutes)
- Implementation: `cachedCopilotToken` in `src/utils/copilot.ts`

## Authentication & Identity

**Auth Provider:**
- GitHub Copilot (piggybacks on existing installation)
- No separate authentication required

**Token Detection:**
- Auto-detects from known locations (see `src/utils/copilot.ts`)
- CLI token: `~/.copilot-cli-access-token`
- VS Code (macOS/Linux): `~/.config/github-copilot/apps.json` or `hosts.json`
- VS Code (Windows): `~/AppData/Local/github-copilot/`

**Token Flow:**
1. Detect OAuth token from local files
2. Exchange OAuth token for Copilot API token via GitHub API
3. Cache exchanged token with expiration
4. Use Copilot API token for chat completions

## Machine Learning / Embeddings

**Local ML (RAG System):**
- Primary: `@xenova/transformers` - Transformer-based embeddings
  - Model: `Xenova/all-MiniLM-L6-v2`
  - Dimensions: 384
  - Runs in Node.js (no external service)
- Fallback: TF-IDF (custom implementation)
  - Used when transformer model fails to load
  - Implementation: `src/utils/rag.ts`

**Token Counting:**
- Package: `gpt-tokenizer`
- Used for context window management
- Model-specific token limits in `src/utils/tokenizer.ts`

## Web Crawling

**Web Crawler (Knowledge Base):**
- Native `fetch` API for HTTP requests
- HTML parsing: `html-to-text` package
- Features:
  - Depth-limited crawling (1-3 levels)
  - Same-domain restriction
  - Rate limiting (500ms between requests)
  - Timeout handling (10s default)
- Implementation: `src/utils/crawler.ts`

## Git Integration

**Git CLI:**
- Spawns `git` subprocess via `child_process.spawnSync`
- No external service required
- Features used:
  - `git status --porcelain` - File change detection
  - `git diff` / `git diff --cached` - Diff generation
  - `git branch` - Branch listing
  - `git rev-parse` - Repository detection
- Implementation: `src/utils/git.ts`

## Monitoring & Observability

**Error Tracking:**
- None (errors displayed in terminal UI)

**Logs:**
- No persistent logging
- User feedback via terminal UI

## CI/CD & Deployment

**Hosting:**
- npm registry (`@piyushimraw/meeseeks`)
- Self-contained CLI tool (no server deployment)

**CI Pipeline:**
- Not detected (no CI configuration files)

**Build Targets:**
- npm package (default)
- Standalone binaries via Bun:
  - macOS: `npm run package`
  - Linux x64: `npm run package:linux`
  - Windows x64: `npm run package:win`

## Environment Configuration

**Required Environment Variables:**
- None (all configuration auto-detected or stored locally)

**Optional Configuration:**
- `~/.meeseeks/config.json`:
  ```json
  {
    "copilot": {
      "tokenSource": "cli" | "vscode" | "unknown",
      "selectedModel": "gpt-4o",
      "lastVerified": "ISO-8601 timestamp"
    }
  }
  ```

**Secrets Location:**
- Copilot tokens: Read from system locations (VS Code/CLI installations)
- No separate secrets file required

## Webhooks & Callbacks

**Incoming:**
- None (CLI application)

**Outgoing:**
- None (CLI application)

## File System Watching

**Chokidar Integration:**
- Package: `chokidar` ^4.0.3
- Used for: Test watcher feature (auto-generate tests on file changes)
- Configuration: Polling mode with 500ms interval
- Implementation: `src/utils/fileWatcher.ts`

**Fast-Glob Integration:**
- Package: `fast-glob` ^3.3.3
- Used for: Resolving file patterns in test watcher
- Ignores: `node_modules/`, `dist/`, test files

## Testing Rules Integration

**External Rule Files:**
- `.meeseeks/rules/test.md` - Project-specific testing rules
- `AGENTS.md` - Agent configuration (testing sections extracted)
- `CLAUDE.md` - Claude configuration (testing sections extracted)
- Implementation: `src/utils/rulesLoader.ts`

---

*Integration audit: 2026-01-20*

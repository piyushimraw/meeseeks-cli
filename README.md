# Meeseeks CLI

```
#==============================================================#
  | ▄▄▄     ▄▄▄                                                 |
  |    ███▄ ▄███                                                |
  |    ██ ▀█▀ ██                                 ▄▄             |
  |    ██     ██   ▄█▀█▄ ▄█▀█▄ ▄██▀█ ▄█▀█▄ ▄█▀█▄ ██ ▄█▀ ▄██▀█   |
  |    ██     ██   ██▄█▀ ██▄█▀ ▀███▄ ██▄█▀ ██▄█▀ ████   ▀███▄   |
  |  ▀██▀     ▀██▄▄▀█▄▄▄▄▀█▄▄▄█▄▄██▀▄▀█▄▄▄▄▀█▄▄▄▄██ ▀█▄█▄▄██▀   |
  |                                                             |
#==============================================================#
```

An AI-powered, terminal-first CLI that integrates with GitHub Copilot for automated testing, QA planning, and documentation management.

## Features

- **Copilot Integration** - Auto-detects GitHub Copilot tokens (CLI or VS Code)
- **QA Plan Generation** - Creates test plans from git diffs or branch comparisons
- **Test Watcher** - Auto-generates tests when source files change
- **Knowledge Base** - Build searchable docs for enhanced AI context (RAG)
- **Git Changes Viewer** - View staged, unstaged, and untracked changes

## Requirements

- Node.js 18+
- npm or bun
- git
- GitHub Copilot access (CLI or VS Code extension)

## Installation

### Global Install (Recommended)

```bash
npm install -g @piyushimraw/meeseeks
```

Or with bun:

```bash
bun install -g @piyushimraw/meeseeks
```

### From Source

```bash
git clone https://github.com/piyushimraw/meeseeks.git
cd meeseeks
npm install
npm run build
npm link
```

## Quick Start

Launch the CLI:

```bash
meeseeks
```

You'll see the main menu with options:

```
> Connect to Copilot
  Select Model
  Create QA Plan
  Test Watcher
  View Git Changes
  Knowledge Base
  Exit
```

Use arrow keys to navigate and Enter to select.

## Usage Examples

### 1. Connect to GitHub Copilot

Meeseeks automatically detects your Copilot token from:
- GitHub Copilot CLI (`~/.copilot-cli-access-token`)
- VS Code extension (`~/.config/github-copilot/hosts.json`)

```bash
meeseeks
# Select "Connect to Copilot"
# Token is auto-detected and verified
```

**Expected output:**
```
Copilot Connection
──────────────────
Status: Connected
Source: VS Code
Last verified: 2024-01-15T10:30:00Z
```

### 2. Select an AI Model

Choose which model to use for generations:

```bash
meeseeks
# Select "Select Model"
```

**Available models:**
- GPT-4o (default)
- GPT-4o Mini
- GPT-4 Turbo
- Claude 3.5 Sonnet
- Claude 3.5 Haiku
- o1 Preview / o1 Mini

Your selection persists across sessions.

### 3. Generate a QA Test Plan

#### From Uncommitted Changes

```bash
meeseeks
# Select "Create QA Plan"
# Choose "Uncommitted changes"
```

**Example output:**
```markdown
## Summary
Analysis of changes to src/utils/parser.ts

## Affected Areas
- String parsing logic
- Error handling

## Test Cases

### TC-1: Valid Input Parsing
- **Preconditions:** Parser is initialized
- **Steps:**
  1. Call parse() with valid JSON string
  2. Verify returned object
- **Expected Result:** Object matches input structure

### TC-2: Invalid Input Handling
- **Preconditions:** Parser is initialized
- **Steps:**
  1. Call parse() with malformed JSON
  2. Check error handling
- **Expected Result:** Throws ParseError with descriptive message

## Edge Cases
- Empty string input
- Deeply nested objects (>10 levels)
- Unicode characters in keys
```

#### From Branch Comparison

```bash
meeseeks
# Select "Create QA Plan"
# Choose "Branch comparison"
# Enter base branch: main
# Enter compare branch: feature/new-parser
```

### 4. Auto-Generate Tests with Test Watcher

Set up automatic test generation when files change:

```bash
meeseeks
# Select "Test Watcher"
```

**Configuration options:**

| Setting | Description | Example |
|---------|-------------|---------|
| Glob Pattern | Files to watch | `src/**/*.ts` |
| Output Pattern | Where to put tests | `colocated` or `separate` |
| Output Directory | For separate tests | `tests/` |

**Example session:**
```
Test Watcher Configuration
──────────────────────────
Glob pattern: src/**/*.ts
Output: colocated (*.test.ts next to source)

[s] Start watching
[b] Back to menu

> Watching 24 files...

[10:30:15] Changed: src/utils/parser.ts
[10:30:18] Generated: src/utils/parser.test.ts
```

#### Project Testing Rules

Create `.meeseeks/rules.md` in your project root to customize test generation:

```markdown
# Testing Rules

## Framework
- Use Jest for all tests
- Use @testing-library/react for React components

## Naming
- Test files: `*.test.ts` or `*.test.tsx`
- Describe blocks: Match function/component name
- Test names: "should [expected behavior]"

## Patterns
- Mock external dependencies
- Use factories for test data
- Prefer integration tests for API routes
```

### 5. View Git Changes

Quickly review your repository status:

```bash
meeseeks
# Select "View Git Changes"
```

**Example output:**
```
Git Changes
───────────

Staged (2 files):
  M src/utils/parser.ts
  A src/utils/validator.ts

Unstaged (1 file):
  M src/index.tsx

Untracked (1 file):
  ? README.md

[d] View diff  [r] Refresh  [b] Back
```

### 6. Create a Knowledge Base

Build a searchable documentation store for enhanced AI context:

```bash
meeseeks
# Select "Knowledge Base"
# Choose "Create new"
# Enter name: "API Docs"
```

**Add documentation sources:**
```
Knowledge Base: API Docs
────────────────────────

Sources: (none)

[a] Add URL
[c] Crawl & index
[s] Search
[d] Delete
[b] Back

> Add URL: https://docs.example.com/api
> Crawl depth: 2

Crawling...
  [1/15] https://docs.example.com/api
  [2/15] https://docs.example.com/api/auth
  ...
  [15/15] https://docs.example.com/api/errors

Indexing 15 pages...
Done! Knowledge base ready.
```

**Search your knowledge base:**
```
Search: authentication flow

Results:
1. [0.92] Authentication - docs.example.com/api/auth
   "OAuth 2.0 flow with PKCE for secure authentication..."

2. [0.78] Tokens - docs.example.com/api/tokens
   "Access tokens expire after 1 hour. Refresh tokens..."
```

When generating QA plans, relevant knowledge is automatically included as context.

## Configuration

### Settings Location

| Platform | Path |
|----------|------|
| macOS/Linux | `~/.config/meeseeks/` |
| Windows | `%LOCALAPPDATA%\meeseeks\` |

### Knowledge Base Storage

| Platform | Path |
|----------|------|
| macOS/Linux | `~/.meeseeks/knowledge/` |
| Windows | `%USERPROFILE%\.meeseeks\knowledge\` |

### Copilot Token Locations

Meeseeks checks these locations for tokens:

| Source | Path |
|--------|------|
| Copilot CLI | `~/.copilot-cli-access-token` |
| VS Code (macOS/Linux) | `~/.config/github-copilot/hosts.json` |
| VS Code (Windows) | `%LOCALAPPDATA%\github-copilot\hosts.json` |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate menu |
| `Enter` | Select option |
| `b` | Back to previous screen |
| `q` | Quit application |
| `Esc` | Cancel current operation |

## Development

### Setup

```bash
git clone https://github.com/your-username/meeseeks.git
cd meeseeks
npm install
```

### Run in Development Mode

```bash
npm run dev
# or
npm start
```

### Build

```bash
npm run build
```

### Create Standalone Binary

```bash
# macOS (current platform)
npm run package

# Linux
npm run package:linux

# Windows
npm run package:win
```

### Project Structure

```
src/
├── index.tsx              # Entry point & routing
├── ascii.ts               # ASCII art banner
├── screens/               # Feature screens
│   ├── CopilotConnect.tsx # Copilot auth
│   ├── ModelSelect.tsx    # Model picker
│   ├── QAPlan.tsx         # QA plan generator
│   ├── TestWatcher.tsx    # File watcher
│   ├── GitChanges.tsx     # Git status viewer
│   └── KnowledgeBase.tsx  # KB manager
├── components/
│   └── Menu.tsx           # Main navigation
├── context/
│   ├── CopilotContext.tsx # Auth state
│   └── KnowledgeBaseContext.tsx
├── utils/
│   ├── copilot.ts         # Copilot API client
│   ├── git.ts             # Git operations
│   ├── qaPlan.ts          # QA generation logic
│   ├── testGenerator.ts   # Test file creation
│   ├── fileWatcher.ts     # chokidar wrapper
│   ├── knowledgeBase.ts   # KB CRUD
│   ├── rag.ts             # Semantic search
│   ├── crawler.ts         # Web scraper
│   ├── rulesLoader.ts     # Project rules
│   └── settings.ts        # Config persistence
└── types/
    └── index.ts           # TypeScript definitions
```

## Troubleshooting

### "No Copilot token found"

1. Ensure you have GitHub Copilot access
2. Log in via VS Code Copilot extension or Copilot CLI
3. Check token file exists:
   ```bash
   ls -la ~/.config/github-copilot/
   # or
   cat ~/.copilot-cli-access-token
   ```

### "Token expired or invalid"

Re-authenticate with Copilot:
```bash
# If using Copilot CLI
gh auth login
gh copilot

# If using VS Code
# Open VS Code and sign in to Copilot extension
```

### Build Errors

Clear cache and reinstall:
```bash
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

### Knowledge Base Issues

Reset a corrupted knowledge base:
```bash
rm -rf ~/.meeseeks/knowledge/<kb-name>
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

Keep changes focused and include context in PRs.

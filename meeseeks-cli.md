# Meeseeks CLI - Product Requirements Document

## 1. Executive Summary

**Meeseeks** is an AI-powered command-line interface (CLI) that serves as a developer assistant, seamlessly integrating with GitHub Copilot to automate testing, documentation management, and code analysis workflows. Built with React and Ink for a rich terminal UI experience, Meeseeks transforms complex development tasks into simple, interactive menu-driven operations.

The tool addresses the growing need for developers to leverage AI capabilities directly from their terminal without context-switching to browser-based tools. By combining GitHub Copilot's AI intelligence with local file watching, git integration, and semantic search capabilities, Meeseeks provides a cohesive development experience that accelerates test planning, automates test generation, and enhances AI context with project-specific documentation.

**MVP Goal:** Deliver a fully functional CLI tool that enables developers to connect to GitHub Copilot, generate comprehensive QA test plans from code changes, automatically create tests when files change, and manage knowledge bases for enhanced AI context - all from the terminal.

---

## 2. Mission

### Mission Statement
Empower developers to harness AI capabilities directly from the command line, streamlining testing workflows and documentation management without disrupting their terminal-centric development flow.

### Core Principles

1. **Terminal-First Experience** - All interactions happen in the terminal with a clean, intuitive TUI (Text User Interface)
2. **AI-Augmented Workflows** - Leverage GitHub Copilot's intelligence to automate repetitive testing tasks
3. **Zero Configuration** - Work out-of-the-box with sensible defaults while supporting customization
4. **Context-Aware Intelligence** - Use semantic search and RAG to provide AI with relevant project documentation
5. **Non-Intrusive Integration** - Detect existing tools (Copilot CLI, VS Code) without requiring manual setup

---

## 3. Target Users

### Primary Persona: The Terminal-Centric Developer

**Profile:**
- Software developers who prefer CLI tools over GUI applications
- Users of GitHub Copilot (CLI or VS Code extension)
- Developers working on codebases with regular testing requirements
- Engineers who value automation and efficiency

**Technical Comfort Level:**
- Comfortable with command-line interfaces
- Familiar with git workflows
- Has GitHub Copilot access (individual or enterprise)
- Basic understanding of testing concepts

**Key Needs & Pain Points:**
- **Pain:** Context-switching between terminal and browser for AI tools
- **Pain:** Manually writing repetitive test plans for code changes
- **Pain:** Lack of project-specific context in generic AI responses
- **Pain:** No automated test generation integrated into development workflow
- **Need:** Quick QA coverage analysis for pull requests
- **Need:** Automated test file creation when source files change
- **Need:** Searchable documentation that enhances AI responses

---

## 4. MVP Scope

### In Scope (Core Functionality)

**Provider Integration:**
- ✅ GitHub Copilot token detection and authentication
- ✅ Support for Copilot CLI tokens
- ✅ Support for VS Code Copilot extension tokens
- ✅ Model selection from available Copilot models
- ✅ Token validation and error handling

**AI Agents:**
- ✅ QA Plan generation from git diffs
- ✅ Branch-to-branch comparison for QA plans
- ✅ Uncommitted changes analysis
- ✅ Test Watcher with file pattern monitoring
- ✅ Automatic test file generation on source changes
- ✅ Project-specific testing rules support

**Developer Tools:**
- ✅ Git changes viewer (staged, unstaged, untracked)
- ✅ File diff display
- ✅ Knowledge base creation and management
- ✅ Web crawling for documentation sources
- ✅ Semantic indexing (TF-IDF)
- ✅ RAG-enhanced QA plan generation

**Technical:**
- ✅ React/Ink terminal UI
- ✅ Keyboard navigation
- ✅ Persistent settings storage
- ✅ Cross-platform support (macOS, Linux, Windows)

### Out of Scope (Future Phases)

**Features Deferred:**
- ❌ Multiple AI provider support (OpenAI API direct, Anthropic, etc.)
- ❌ Code review automation
- ❌ Pull request integration (auto-comment test plans)
- ❌ Test execution and reporting
- ❌ CI/CD pipeline integration
- ❌ Team collaboration features
- ❌ Cloud-synced knowledge bases
- ❌ Custom AI prompt templates
- ❌ IDE plugins (beyond VS Code token detection)

**Technical Deferrals:**
- ❌ Neural embeddings as default (optional via Xenova)
- ❌ Distributed knowledge base storage
- ❌ Real-time collaboration
- ❌ Offline AI model support

---

## 5. User Stories

### Primary User Stories

**US-1: Connect to AI Provider**
> As a developer, I want to connect Meeseeks to my GitHub Copilot account, so that I can use AI features without additional authentication setup.

*Example:* Developer launches Meeseeks, selects "Connect to Copilot", and the tool automatically detects their existing Copilot CLI token from `~/.config/github-copilot/`.

**US-2: Generate QA Test Plan**
> As a developer, I want to generate a comprehensive test plan from my code changes, so that I can ensure thorough test coverage before merging.

*Example:* Developer selects "Create a QA Plan", chooses to compare their feature branch against main, and receives a detailed test plan including affected areas, test cases with steps, and edge cases to consider.

**US-3: Auto-Generate Tests**
> As a developer, I want tests to be automatically generated when I modify source files, so that I can maintain test coverage without manual effort.

*Example:* Developer configures Test Watcher with pattern `src/**/*.ts`, starts watching, and when they save changes to `src/utils/parser.ts`, a corresponding test file is automatically created/updated.

**US-4: Manage Documentation Knowledge**
> As a developer, I want to add project documentation to a searchable knowledge base, so that AI responses are informed by my project's specific context.

*Example:* Developer creates a "API Docs" knowledge base, adds their API documentation URL, crawls the site to depth 2, and indexes it. When generating QA plans, relevant documentation is automatically included as context.

**US-5: Review Git Changes**
> As a developer, I want to quickly view all my git changes in a readable format, so that I can understand the scope of my modifications before generating test plans.

*Example:* Developer selects "View Git Changes" and sees a categorized list of modified, staged, and untracked files with expandable diffs.

**US-6: Select AI Model**
> As a developer, I want to choose which AI model to use for generations, so that I can balance between speed and quality based on my needs.

*Example:* Developer selects "Select Model", browses available models grouped by vendor (OpenAI, Anthropic), and selects GPT-4o for complex test plan generation.

**US-7: Use Project Testing Rules**
> As a developer, I want Meeseeks to respect my project's testing conventions, so that generated tests match our coding standards.

*Example:* Developer has a `.meeseeks/rules.md` file defining Jest patterns and naming conventions. Test Watcher uses these rules when generating test files.

### Technical User Stories

**US-8: Persistent Configuration**
> As a developer, I want my settings to persist between sessions, so that I don't have to reconfigure the tool each time.

**US-9: Offline Fallback**
> As a developer, I want the tool to gracefully handle network issues, so that I can still use local features when disconnected.

---

## 6. Core Architecture & Patterns

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Meeseeks CLI Application                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Screens   │  │  Components │  │   Context Providers │  │
│  │  (React)    │  │   (Ink)     │  │   (State Mgmt)      │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                   │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │                    Utilities Layer                     │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────┐ ┌──────┐ ┌────────┐  │  │
│  │  │ Copilot │ │   Git   │ │ RAG │ │ File │ │Settings│  │  │
│  │  │   API   │ │  Utils  │ │     │ │Watch │ │        │  │  │
│  │  └────┬────┘ └────┬────┘ └──┬──┘ └──┬───┘ └───┬────┘  │  │
│  └───────┼──────────┼─────────┼───────┼─────────┼────────┘  │
│          │          │         │       │         │           │
└──────────┼──────────┼─────────┼───────┼─────────┼───────────┘
           │          │         │       │         │
     ┌─────┴──────┐   │    ┌────┴───┐   │    ┌────┴────┐
     │  GitHub    │   │    │ Local  │   │    │  ~/.config/
     │  Copilot   │   │    │ Files  │   │    │  meeseeks/
     │   API      │   │    │        │   │    │         │
     └────────────┘   │    └────────┘   │    └─────────┘
                      │                 │
                ┌─────┴─────┐    ┌──────┴──────┐
                │    Git    │    │  chokidar   │
                │Repository │    │  (watcher)  │
                └───────────┘    └─────────────┘
```

### Directory Structure

```
src/
├── index.tsx                    # Application entry point & routing
├── screens/                     # Full-screen feature components
│   ├── CopilotConnect.tsx       # Copilot authentication
│   ├── ModelSelect.tsx          # AI model selection
│   ├── QAPlan.tsx               # QA test plan generator
│   ├── TestWatcher.tsx          # File watcher for auto-tests
│   ├── KnowledgeBase.tsx        # KB management interface
│   └── GitChanges.tsx           # Git diff viewer
├── components/
│   └── Menu.tsx                 # Main menu navigation
├── context/                     # React Context providers
│   ├── CopilotContext.tsx       # Auth state management
│   └── KnowledgeBaseContext.tsx # KB operations
├── utils/                       # Core business logic
│   ├── copilot.ts               # Copilot API client
│   ├── git.ts                   # Git operations
│   ├── knowledgeBase.ts         # KB CRUD operations
│   ├── rag.ts                   # Semantic search & indexing
│   ├── crawler.ts               # Web crawling
│   ├── fileWatcher.ts           # File system monitoring
│   ├── testGenerator.ts         # AI test generation
│   ├── rulesLoader.ts           # Project rules loading
│   └── settings.ts              # Persistent config
└── types/
    └── index.ts                 # TypeScript definitions
```

### Key Design Patterns

1. **Component-Based Architecture** - React components for modular UI
2. **Context API for State** - Shared state via React Context (Copilot, Knowledge Base)
3. **Utility Separation** - Business logic extracted to `/utils` for testability
4. **Screen-Based Navigation** - Each feature is a self-contained screen
5. **Provider Pattern** - Context providers wrap app for dependency injection

### React/Ink Patterns

- **useInput Hook** - Keyboard event handling
- **Box/Text Components** - Terminal UI primitives
- **Controlled Components** - Form inputs with state management
- **Effect Hooks** - Side effects for API calls and file operations

---

## 7. Tools/Features

### Feature 1: Copilot Connection

**Purpose:** Authenticate with GitHub Copilot to enable AI features

**Operations:**
- Auto-detect Copilot CLI token from `~/.config/github-copilot/`
- Auto-detect VS Code Copilot extension token
- Validate token against Copilot API
- Store connection status in memory (not persisted for security)

**Key Features:**
- Multiple token source detection
- Real-time connection status display
- Graceful error handling with user feedback

---

### Feature 2: Model Selection

**Purpose:** Allow users to choose their preferred AI model

**Operations:**
- Fetch available models from Copilot API
- Display models grouped by vendor
- Persist selected model preference
- Fallback to cached model list if offline

**Key Features:**
- Vendor-grouped model display (OpenAI, Anthropic, etc.)
- Selection persistence across sessions
- Offline fallback support

---

### Feature 3: QA Plan Generator

**Purpose:** Generate comprehensive test plans from code changes

**Operations:**
- Fetch git diff (branch comparison or uncommitted changes)
- Query Knowledge Base for relevant context (RAG)
- Send diff + context to Copilot API
- Stream and display generated test plan

**Key Features:**
- Branch-to-branch comparison
- Uncommitted changes analysis
- Knowledge Base context integration
- Streaming response display
- Token usage tracking

**Output Format:**
```markdown
## Summary
Brief description of changes analyzed

## Affected Areas
- List of impacted components/modules

## Test Cases
### TC-1: [Test Case Name]
- **Preconditions:** ...
- **Steps:** 1. ... 2. ... 3. ...
- **Expected Result:** ...

## Edge Cases
- Edge case considerations

## Regression Testing
- Areas requiring regression testing
```

---

### Feature 4: Test Watcher

**Purpose:** Automatically generate tests when source files change

**Operations:**
- Configure file watch pattern (glob)
- Monitor file system for changes
- Load project testing rules
- Generate test files via Copilot API
- Write tests to configured location

**Key Features:**
- Glob pattern configuration (e.g., `src/**/*.ts`)
- Co-located or separate test directory support
- Project rules integration (`.meeseeks/rules.md`)
- Activity log display
- Start/stop controls

---

### Feature 5: Git Changes Viewer

**Purpose:** Display git repository status and diffs

**Operations:**
- Fetch staged, unstaged, and untracked files
- Generate diffs for modified files
- Display file content for untracked files

**Key Features:**
- Categorized file display
- Expandable diffs
- Refresh capability
- Color-coded status indicators

---

### Feature 6: Knowledge Base Manager

**Purpose:** Manage documentation sources for AI context enhancement

**Operations:**
- Create/delete knowledge bases
- Add/remove documentation URLs
- Crawl web pages with configurable depth
- Index content for semantic search
- Search knowledge base with RAG queries

**Key Features:**
- Multiple knowledge base support
- Web crawler with depth control (1-3 levels)
- TF-IDF indexing (default)
- Optional neural embeddings (Xenova transformers)
- Crawl progress tracking
- Semantic search capabilities

---

## 8. Technology Stack

### Runtime & Build

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime environment |
| Bun | 1.0+ | Package management & bundling |
| TypeScript | 5.x | Type safety |
| esbuild | 0.24+ | Fast bundling |

### UI Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | Component framework |
| Ink | 5.0+ | Terminal UI renderer |
| ink-select-input | 6.0+ | Dropdown selections |
| ink-text-input | 6.0+ | Text input fields |

### Core Dependencies

| Technology | Version | Purpose |
|------------|---------|---------|
| chokidar | 4.0+ | File system watching |
| fast-glob | 3.3+ | File pattern matching |
| simple-git | (via exec) | Git operations |

### Optional Dependencies

| Technology | Version | Purpose |
|------------|---------|---------|
| @xenova/transformers | 2.x | Neural embeddings (optional) |

### Third-Party Integrations

| Integration | Purpose |
|-------------|---------|
| GitHub Copilot API | AI completions and chat |
| GitHub Copilot CLI | Token detection |
| VS Code Copilot Extension | Token detection |

---

## 9. Security & Configuration

### Authentication

- **Token Storage:** In-memory only (never persisted to disk)
- **Token Sources:**
  - Copilot CLI: `~/.config/github-copilot/hosts.json`
  - VS Code: Platform-specific config locations
- **Token Validation:** Verified against Copilot API before use

### Configuration Management

**Environment Variables:**
- None required for basic operation

**Settings Storage:**
- Location: `~/.config/meeseeks/` (XDG-compliant)
- Format: JSON
- Contents:
  - Selected model preference
  - Copilot connection metadata

**Knowledge Base Storage:**
- Location: `~/.meeseeks/knowledge/`
- Structure:
  ```
  knowledge/
  ├── [kb-name]/
  │   ├── manifest.json      # KB metadata
  │   ├── pages/             # Crawled content
  │   └── index/             # Semantic index
  ```

### Security Scope

**In Scope:**
- ✅ Secure token handling (memory-only)
- ✅ No credential persistence
- ✅ Local-only knowledge base storage
- ✅ User-controlled data sources

**Out of Scope (MVP):**
- ❌ Encrypted storage
- ❌ Multi-user access control
- ❌ Audit logging
- ❌ Network request logging

### Deployment

- **Distribution:** npm package (global install)
- **Install Command:** `npm install -g meeseeks-cli` or `bun install -g meeseeks-cli`
- **Execution:** `meeseeks` command

---

## 10. API Specification

### Copilot API Integration

**Authentication:**
```
POST https://api.github.com/copilot_internal/v2/token
Authorization: Bearer <github_token>
```

**Chat Completions:**
```
POST https://api.githubcopilot.com/chat/completions
Authorization: Bearer <copilot_token>
Content-Type: application/json

{
  "model": "gpt-4o",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "stream": true
}
```

**Models List:**
```
GET https://api.githubcopilot.com/models
Authorization: Bearer <copilot_token>
```

### Internal Data Structures

**Knowledge Base Manifest:**
```json
{
  "name": "API Documentation",
  "created": "2024-01-15T10:30:00Z",
  "sources": [
    {
      "url": "https://docs.example.com",
      "crawledAt": "2024-01-15T10:35:00Z",
      "depth": 2,
      "pageCount": 15
    }
  ],
  "indexed": true,
  "indexType": "tfidf"
}
```

**RAG Query Response:**
```json
{
  "results": [
    {
      "content": "Relevant documentation chunk...",
      "source": "https://docs.example.com/api",
      "score": 0.85
    }
  ],
  "totalResults": 5
}
```

---

## 11. Success Criteria

### MVP Success Definition

The MVP is successful when a developer can:
1. Install Meeseeks globally with a single command
2. Connect to their existing GitHub Copilot account without manual token entry
3. Generate a useful QA test plan from their code changes
4. Have tests automatically created when they modify source files
5. Build a searchable knowledge base from project documentation

### Functional Requirements

**Provider Integration:**
- ✅ Successfully detect Copilot token from CLI or VS Code
- ✅ Validate token and display connection status
- ✅ List and select from available AI models
- ✅ Persist model selection across sessions

**QA Plan Generation:**
- ✅ Generate test plans from branch comparisons
- ✅ Generate test plans from uncommitted changes
- ✅ Include Knowledge Base context when available
- ✅ Display streaming responses in real-time

**Test Watcher:**
- ✅ Monitor files matching user-defined glob patterns
- ✅ Generate test files when source files change
- ✅ Respect project testing rules
- ✅ Support configurable test file locations

**Knowledge Base:**
- ✅ Create and manage multiple knowledge bases
- ✅ Crawl web pages with depth configuration
- ✅ Index content for semantic search
- ✅ Return relevant results for RAG queries

### Quality Indicators

- **Performance:** UI remains responsive during API calls (streaming)
- **Reliability:** Graceful handling of network failures
- **Usability:** All features accessible via keyboard navigation
- **Compatibility:** Works on macOS, Linux, and Windows

### User Experience Goals

- Time to first QA plan: < 2 minutes from install
- Zero configuration required for basic usage
- Clear feedback for all operations (progress, errors, success)
- Intuitive keyboard shortcuts consistent across screens

---

## 12. Implementation Phases

### Phase 1: Foundation

**Goal:** Establish core infrastructure and basic Copilot integration

**Deliverables:**
- ✅ React/Ink application scaffold
- ✅ Main menu navigation
- ✅ Copilot token detection (CLI + VS Code)
- ✅ Token validation
- ✅ Model listing and selection
- ✅ Settings persistence

**Validation:**
- User can launch app, connect to Copilot, and select a model

---

### Phase 2: AI Agents

**Goal:** Implement core AI-powered features

**Deliverables:**
- ✅ Git integration (diff, status, branches)
- ✅ QA Plan generation with streaming
- ✅ Test Watcher file monitoring
- ✅ Test generation from file changes
- ✅ Project rules loader

**Validation:**
- User can generate a QA plan from code changes
- User can have tests auto-generated when files change

---

### Phase 3: Knowledge Base & RAG

**Goal:** Add documentation management and semantic search

**Deliverables:**
- ✅ Knowledge Base CRUD operations
- ✅ Web crawler implementation
- ✅ TF-IDF indexing
- ✅ Semantic search (RAG)
- ✅ Integration with QA Plan generation

**Validation:**
- User can create KB, add docs, crawl, index, and use for enhanced QA plans

---

### Phase 4: Polish & Release

**Goal:** Production-ready release

**Deliverables:**
- ✅ Error handling improvements
- ✅ Performance optimization
- ✅ Cross-platform testing
- ✅ Documentation
- ✅ npm package publication

**Validation:**
- Clean install and full workflow on macOS, Linux, Windows
- Published to npm registry

---

## 13. Future Considerations

### Post-MVP Enhancements

**AI Capabilities:**
- Code review agent (security, performance, style analysis)
- Documentation generator from code
- Commit message generator
- PR description generator

**Integration Opportunities:**
- GitHub Actions integration (CI/CD test plan comments)
- Jira/Linear ticket creation from test plans
- Slack notifications for test generation
- IDE extensions (VS Code, JetBrains)

**Advanced Features:**
- Multi-provider AI support (OpenAI API, Anthropic, local models)
- Custom prompt templates
- Team-shared knowledge bases
- Test execution and reporting
- Coverage analysis integration

### Technical Evolution

- Neural embeddings as default (with graceful fallback)
- Plugin architecture for extensibility
- Real-time collaboration features
- Cloud-synced settings and KBs

---

## 14. Risks & Mitigations

### Risk 1: GitHub Copilot API Changes

**Risk:** Copilot API endpoints or authentication may change without notice

**Mitigation:**
- Abstract API calls behind interface layer
- Implement version detection
- Monitor GitHub changelog for API updates
- Graceful degradation when API unavailable

### Risk 2: Token Detection Reliability

**Risk:** Token locations may vary across OS versions and Copilot versions

**Mitigation:**
- Support multiple token source locations
- Implement manual token entry fallback
- Clear error messages guiding users to solutions
- Regular testing across platforms

### Risk 3: Large Repository Performance

**Risk:** Git diff operations may be slow on large repositories

**Mitigation:**
- Implement pagination for large diffs
- Allow user to limit diff scope
- Async operations with progress indicators
- Consider file/line limits for AI context

### Risk 4: Knowledge Base Storage Growth

**Risk:** Crawled content may consume significant disk space

**Mitigation:**
- Display storage usage in UI
- Implement content deduplication
- Allow selective page removal
- Set reasonable depth limits (max 3)

### Risk 5: Cross-Platform Compatibility

**Risk:** Terminal UI behavior may differ across operating systems

**Mitigation:**
- Use Ink's cross-platform abstractions
- Test on macOS, Linux, Windows
- Document known platform-specific issues
- Provide fallback rendering modes

---

## 15. Appendix

### Related Documents

- [Ink Documentation](https://github.com/vadimdemedes/ink)
- [GitHub Copilot API](https://docs.github.com/en/copilot)
- [Chokidar Documentation](https://github.com/paulmillr/chokidar)

### Key Dependencies

| Package | Repository |
|---------|------------|
| ink | https://github.com/vadimdemedes/ink |
| ink-select-input | https://github.com/vadimdemedes/ink-select-input |
| ink-text-input | https://github.com/vadimdemedes/ink-text-input |
| chokidar | https://github.com/paulmillr/chokidar |
| fast-glob | https://github.com/mrmlnc/fast-glob |
| @xenova/transformers | https://github.com/xenova/transformers.js |

### Repository Structure

```
meeseeks/
├── src/                    # Source code
├── dist/                   # Compiled output
├── package.json            # Package configuration
├── tsconfig.json           # TypeScript configuration
├── .meeseeks/              # Project-specific rules
└── README.md               # User documentation
```

---

*Document Version: 1.0*
*Created: January 2026*
*Last Updated: January 2026*

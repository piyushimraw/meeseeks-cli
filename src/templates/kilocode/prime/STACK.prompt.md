---
agent: codebase-analyzer
model: claude-sonnet-4-20250514
tools:
  - Read
  - Glob
  - Grep
  - Bash
description: Analyze technology stack and generate STACK.md context file
output: .roo/STACK.md
---

# Technology Stack Analysis Task

You are analyzing the technology stack of this codebase to generate a comprehensive STACK.md file.

## Your Task

Explore the codebase and document:

1. **Runtime & Language**
   - Runtime version (Node.js version, Python version, etc.)
   - Language version (TypeScript/JavaScript, Python 3.x, Go version, Rust edition)
   - Version constraints and compatibility

2. **Package Management**
   - Package manager(s) used
   - Lock file strategy
   - Workspace/monorepo setup (if any)

3. **Frameworks & Libraries**
   - Web frameworks (Express, FastAPI, Axum, etc.)
   - UI frameworks (React, Vue, Ink, etc.)
   - Key libraries by category:
     - HTTP clients
     - Database clients
     - Testing frameworks
     - Build tools
     - CLI frameworks

4. **Build & Bundling**
   - Build tool (Webpack, Vite, esbuild, tsc, cargo, go build)
   - Bundling strategy
   - Output formats

5. **Development Tools**
   - Linters (ESLint, Pylint, Clippy, golangci-lint)
   - Formatters (Prettier, Black, rustfmt, gofmt)
   - Type checkers (TypeScript, mypy, etc.)

6. **Testing Stack**
   - Test framework
   - Test runner
   - Mocking libraries
   - Coverage tools

7. **DevOps & Infrastructure**
   - Container setup (Docker, Docker Compose)
   - CI/CD configuration
   - Deployment targets

## Exploration Strategy

1. Read manifest files:
   - package.json (Node.js)
   - requirements.txt / pyproject.toml (Python)
   - Cargo.toml (Rust)
   - go.mod (Go)
2. Check lock files for exact versions
3. Read build configs (tsconfig.json, webpack.config.js, etc.)
4. Check .tool-versions, .nvmrc, .python-version
5. Read CI config (.github/workflows, .gitlab-ci.yml)
6. Check Docker files

## Output Format

Generate a markdown file with this structure:

```markdown
# Technology Stack

## Overview
[One-paragraph summary of the tech stack]

## Runtime Environment
- **Runtime:** [Runtime and version]
- **Language:** [Language and version]
- **Package Manager:** [Tool and version]

## Core Frameworks
[Main frameworks that define the project's structure]

## Key Dependencies
[Organized by category: HTTP, Database, Testing, CLI, etc.]

### Category Name
- **Library Name** (version): Purpose and why it's used

## Development Tools
[Linters, formatters, type checkers]

## Build & Bundling
[How the project is built and packaged]

## Testing Stack
[Test framework, runners, assertion libraries, mocking tools]

## Infrastructure
[Containerization, deployment, CI/CD]

## Version Requirements
[Minimum or required versions for runtime/tools]

## Stack Decision Rationale
[Why these technologies were chosen - if evident]
```

## Important Notes

- Include **version numbers** from lock files where critical
- Note if versions are pinned vs. flexible (^, ~, >=)
- Highlight any legacy or deprecated dependencies
- Flag security-sensitive dependencies
- Note if stack is up-to-date or outdated

## Tech Stack Context

{{#if techStack}}
**Detected Runtime:** {{techStack.runtime}}
**Detected Package Manager:** {{techStack.packageManager}}
**Detected Frameworks:** {{techStack.frameworks}}
{{#if techStack.testFramework}}**Test Framework:** {{techStack.testFramework}}{{/if}}
{{#if techStack.buildTool}}**Build Tool:** {{techStack.buildTool}}{{/if}}
{{/if}}

Start your exploration and generate the STACK.md file.

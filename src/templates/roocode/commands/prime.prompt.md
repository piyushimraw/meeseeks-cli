---
agent: codebase-analyst
model: claude-sonnet-4-20250514
tools:
  - file_search
  - read_file
  - write_file
  - list_dir
description: Analyze codebase and generate/update prime context files
---

# /prime - Codebase Analysis Command

## Purpose

Analyze the codebase structure, conventions, integrations, tech stack, and organization to generate or update the 5 prime context files that inform AI-assisted development.

## Workflow

### 1. Check Existing State

Read `.prime-meta.json` if it exists to determine:
- Last analysis timestamp
- Previous tech stack hash
- Files that were generated

### 2. Detect Tech Stack

Scan project root for manifest files:
- `package.json` -> Node.js runtime, npm/yarn/pnpm, dependencies
- `requirements.txt` / `pyproject.toml` -> Python runtime, pip/poetry
- `Cargo.toml` -> Rust runtime, cargo
- `go.mod` -> Go runtime
- `tsconfig.json` -> TypeScript language
- Test framework from devDependencies or test config files

### 3. Run Analysis Prompts

For each prime file, use the corresponding analysis prompt:

1. **ARCHITECTURE.md** - Analyze module boundaries, layer patterns, dependency flow
2. **CONVENTION.md** - Analyze naming conventions, code style, error handling patterns
3. **INTEGRATION.md** - Analyze external services, APIs, databases, third-party dependencies
4. **STACK.md** - Analyze runtime, language, frameworks, build tools, test frameworks
5. **STRUCTURE.md** - Analyze directory layout, file organization, entry points

### 4. Generate Prime Files

Write each analysis result to the corresponding .md file in `.roo/`:
- `.roo/ARCHITECTURE.md`
- `.roo/CONVENTION.md`
- `.roo/INTEGRATION.md`
- `.roo/STACK.md`
- `.roo/STRUCTURE.md`

### 5. Update Metadata

Write `.prime-meta.json` with:
```json
{
  "lastCommit": "<current git HEAD>",
  "lastRun": "<ISO timestamp>",
  "filesGenerated": ["ARCHITECTURE.md", "CONVENTION.md", "INTEGRATION.md", "STACK.md", "STRUCTURE.md"],
  "techStackHash": "<hash of detected stack>"
}
```

## Incremental Updates

On subsequent runs:
1. Compare current tech stack hash with stored hash
2. Use `git diff <lastCommit>..HEAD` to find changed files
3. Map changed files to affected prime types (see changeDetector logic)
4. Only regenerate prime files that are affected by changes

**File Change Mappings:**
- Source code changes (`.ts`, `.tsx`, `.js`, `.py`, `.rs`, `.go`) -> ARCHITECTURE, CONVENTION, STRUCTURE
- Config changes (`package.json`, `.env`, `.yml`, `docker`) -> STACK, INTEGRATION
- Test changes (`.test.`, `.spec.`, `/tests/`) -> CONVENTION, STRUCTURE
- Directory structure changes -> STRUCTURE

## Output

After completion, display:
- Number of files generated/updated
- Tech stack summary
- List of prime files created
- Suggestion to run `/plan` next

## Error Handling

- If git not available: Run full analysis (skip incremental)
- If file write fails: Report error, continue with other files
- If manifest not found: Use "unknown" for that detection
- If analysis prompt fails: Generate stub file with placeholder content

## Example Usage

```
> /prime

Analyzing codebase...

Tech Stack Detected:
- Runtime: Node.js 20.x
- Language: TypeScript 5.x
- Framework: React, Ink
- Package Manager: npm
- Test Framework: Jest

Generated Prime Files:
✓ ARCHITECTURE.md (12 KB)
✓ CONVENTION.md (8 KB)
✓ INTEGRATION.md (5 KB)
✓ STACK.md (6 KB)
✓ STRUCTURE.md (10 KB)

Metadata saved to .prime-meta.json

Next: Run /plan <feature-description> to generate an implementation plan
```

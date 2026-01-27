<!--
Sync Impact Report
==================
Version change: N/A → 1.0.0 (initial adoption)
Modified principles: N/A (initial version)
Added sections:
  - 8 Core Principles (I-VIII)
  - Development Workflow section
  - Quality Gates section
  - Governance section
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md: ✅ Compatible (Constitution Check section exists)
  - .specify/templates/spec-template.md: ✅ Compatible (user stories with priorities)
  - .specify/templates/tasks-template.md: ✅ Compatible (TDD workflow supported)
Follow-up TODOs: None
-->

# Meeseeks CLI Constitution

## Core Principles

### I. Test-First (NON-NEGOTIABLE)

Test-Driven Development is mandatory for all features and bug fixes in the Meeseeks CLI.

- Tests MUST be written before implementation code
- Tests MUST fail before implementation begins (Red phase)
- Implementation MUST make tests pass with minimal code (Green phase)
- Code MUST be refactored only after tests pass (Refactor phase)
- No PR may be merged without corresponding test coverage
- Coverage threshold: 80% minimum for all new code

**Rationale**: As a CLI that generates tests for others, Meeseeks must exemplify testing best practices. TDD ensures reliability, documents behavior, and prevents regressions in a tool users depend on for their own testing workflows.

### II. Modular Architecture

Features MUST be implemented as independent, self-contained modules.

- Each screen (CopilotConnect, ModelSelect, QAPlan, TestWatcher, GitChanges, KnowledgeBase) MUST be independently testable
- Shared logic MUST reside in `src/utils/` with clear single-responsibility
- Context providers (CopilotContext, KnowledgeBaseContext) MUST have minimal coupling
- New features MUST be implemented as new screens or utilities, not by expanding existing modules
- Dependencies between modules MUST be explicit through props or context, never implicit

**Rationale**: Modular architecture enables parallel development, simplifies testing, and allows features to evolve independently without cascading changes.

### III. TypeScript Strict Mode

All code MUST adhere to strict TypeScript standards.

- `strict: true` MUST be enabled in tsconfig.json
- `any` type is PROHIBITED except in type guards or external library boundaries
- All function parameters and return types MUST be explicitly typed
- All props interfaces MUST be defined in `src/types/` or co-located with components
- Generic types MUST be used for reusable utilities
- Type assertions (`as`) MUST include a comment explaining why they are safe

**Rationale**: Strict typing catches errors at compile time, improves IDE support, and serves as documentation. A CLI tool that integrates with AI models must handle data safely.

### IV. Documentation

All public interfaces, utilities, and non-obvious logic MUST be documented.

- README.md MUST be updated when user-facing behavior changes
- All exported functions MUST have JSDoc comments with `@param`, `@returns`, and `@example`
- Complex algorithms or business logic MUST have inline comments explaining "why"
- Configuration options MUST be documented in README and in code
- Error messages MUST be descriptive and actionable for users

**Rationale**: Meeseeks is a developer tool. Clear documentation reduces support burden and enables users to contribute effectively.

### V. Cross-Platform Compatibility

All features MUST work on macOS, Linux, and Windows.

- File paths MUST use `path.join()` or `path.resolve()`, never string concatenation
- Line endings MUST be handled (CRLF vs LF) when processing files
- Home directory MUST be resolved via `os.homedir()`, not hardcoded paths
- Environment variables for config paths MUST respect platform conventions (XDG on Linux, LOCALAPPDATA on Windows)
- Terminal escape codes MUST be tested across platforms or use Ink abstractions
- Package scripts for platform-specific builds MUST be maintained

**Rationale**: Developers use diverse systems. A CLI that only works on one platform alienates a significant portion of potential users.

### VI. Copilot Integration First

GitHub Copilot integration is the core value proposition and MUST be prioritized.

- Token detection MUST support multiple sources (CLI, VS Code, manual)
- API interactions MUST handle rate limits, token expiration, and network errors gracefully
- Model selection MUST reflect currently available Copilot models
- All AI-powered features (QA plans, test generation) MUST work consistently across supported models
- Copilot connection status MUST be clearly visible in the UI

**Rationale**: Meeseeks exists to leverage GitHub Copilot for developer productivity. Copilot integration quality directly determines product value.

### VII. Terminal-First User Experience

The CLI/TUI interface MUST provide an excellent terminal experience.

- Navigation MUST use intuitive keyboard controls (arrows, Enter, Escape, single-letter shortcuts)
- Feedback MUST be immediate (spinners for async operations, status indicators)
- Output MUST be readable in terminals of varying widths (handle 80-column minimum)
- Colors MUST be optional and respect NO_COLOR environment variable
- Error states MUST provide clear recovery paths
- Ink components MUST be used consistently for UI patterns

**Rationale**: Terminal users expect responsive, keyboard-driven interfaces. Poor UX in the terminal drives users to alternatives.

### VIII. Simplicity (YAGNI)

Code MUST solve present requirements without anticipating hypothetical futures.

- No feature flags for unreleased functionality
- No abstraction layers without at least two concrete use cases
- No configuration options without user demand
- Prefer inline code over premature extraction into utilities
- Delete commented-out code; version control preserves history
- Three similar lines of code are acceptable; wait for a pattern before abstracting

**Rationale**: Over-engineering increases maintenance burden and obscures intent. Ship what's needed now; refactor when patterns emerge.

## Development Workflow

### Branch Strategy

- Feature branches: `feature/<description>`
- Bug fix branches: `fix/<description>`
- Main branch: `main` (protected, requires PR review)

### Commit Standards

- Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`
- Each commit SHOULD be atomic and independently buildable
- Commit messages MUST describe "what" and "why", not "how"

### Code Review Requirements

- All PRs require at least one approval
- PR descriptions MUST include: summary, testing performed, screenshots (for UI changes)
- Reviewers MUST verify TDD was followed (tests exist and are meaningful)
- Reviewers MUST check cross-platform implications

## Quality Gates

### Pre-Commit

- TypeScript compilation MUST pass (`npm run typecheck`)
- Linting MUST pass (when configured)
- Unit tests MUST pass (`npm run test`)

### Pre-Merge

- Coverage threshold MUST be met (80%)
- All CI checks MUST pass
- At least one approval required

### Pre-Release

- Full test suite MUST pass on all supported platforms
- README MUST reflect current functionality
- CHANGELOG MUST be updated
- Version MUST be bumped according to semver

## Governance

This constitution governs all development on the Meeseeks CLI. All contributors, reviewers, and maintainers MUST adhere to these principles.

### Amendment Process

1. Propose amendment via GitHub issue with `constitution` label
2. Discussion period: minimum 7 days
3. Approval: maintainer consensus required
4. Implementation: update this document, bump version, update dependent templates

### Versioning Policy

- **MAJOR**: Principle removed or fundamentally redefined
- **MINOR**: New principle added or significant guidance expanded
- **PATCH**: Clarifications, typo fixes, non-semantic changes

### Compliance Review

- PRs MUST be reviewed against applicable principles
- Violations MUST be documented with justification if exceptions are granted
- Repeated violations warrant process review

### Guidance Files

- Development guidance: `README.md`
- Testing rules: `.meeseeks/rules.md` (project-specific)
- Specification templates: `.specify/templates/`

**Version**: 1.0.0 | **Ratified**: 2026-01-27 | **Last Amended**: 2026-01-27

# PRD: Unit Tests with 80% Coverage for Meeseeks

## Overview
Add comprehensive unit testing to the meeseeks project using Vitest, achieving at least 80% test coverage. The project is a TypeScript CLI application built with Ink (React for CLI). Testing will focus on utilities, services, hooks, and state logic, while skipping functions that directly call external APIs (Copilot, JIRA, Git commands). React components will be tested using React Testing Library patterns, with screens tested primarily through their hooks and state logic.

## Goals
- Achieve minimum 80% test coverage across the codebase
- Establish Vitest as the testing framework with proper TypeScript configuration
- Create maintainable, behavior-focused tests using React Testing Library
- Set up coverage reporting with warnings (not build failures) below 80%
- Skip external API calls in unit tests (mock-free approach for integrations)

## Quality Gates

These commands must pass for every user story:
- `npm run test` - All tests pass
- `npm run typecheck` - TypeScript type checking (tsc --noEmit)

Coverage reporting:
- `npm run test:coverage` - Generate coverage report, warn if below 80%

## User Stories

### US-001: Configure Vitest with TypeScript Support
As a developer, I want Vitest properly configured so that I can write and run TypeScript tests.

**Acceptance Criteria:**
- [ ] Vitest installed as dev dependency
- [ ] `vitest.config.ts` created with TypeScript support
- [ ] Test script added to package.json: `"test": "vitest run"`
- [ ] Watch mode script added: `"test:watch": "vitest"`
- [ ] Coverage script added: `"test:coverage": "vitest run --coverage"`
- [ ] Coverage provider configured (v8 or istanbul)
- [ ] Coverage thresholds set to warn at 80% (not fail)

### US-002: Test Tokenizer Utility
As a developer, I want the tokenizer utility tested so that token counting is reliable.

**Acceptance Criteria:**
- [ ] `src/utils/tokenizer.test.ts` created (co-located)
- [ ] Tests cover token counting for various string inputs
- [ ] Tests cover edge cases (empty string, special characters, unicode)
- [ ] Tests cover any exported helper functions

### US-003: Test Git Utilities
As a developer, I want git utilities tested so that git-related logic is reliable.

**Acceptance Criteria:**
- [ ] `src/utils/git.test.ts` created
- [ ] Tests cover pure logic functions (not actual git commands)
- [ ] Functions that shell out to git are skipped or have logic extracted
- [ ] Branch name parsing/validation tested if applicable

### US-004: Test BranchName Utility
As a developer, I want branch name utilities tested so that naming conventions are enforced.

**Acceptance Criteria:**
- [ ] `src/utils/branchName.test.ts` created
- [ ] Tests cover branch name generation logic
- [ ] Tests cover validation rules
- [ ] Tests cover edge cases (special characters, length limits)

### US-005: Test Copilot Utility (Logic Only)
As a developer, I want copilot utility logic tested without calling external APIs.

**Acceptance Criteria:**
- [ ] `src/utils/copilot.test.ts` created
- [ ] Tests cover request/response formatting logic
- [ ] Tests cover error handling logic
- [ ] Actual API calls are not tested (skipped)

### US-006: Test MetaPrompt Utilities
As a developer, I want metaPrompt utilities tested so that prompt generation is reliable.

**Acceptance Criteria:**
- [ ] Tests created for files in `src/utils/metaPrompt/`
- [ ] Template generation logic tested
- [ ] Variable substitution tested
- [ ] Edge cases covered

### US-007: Test JiraService (Logic Only)
As a developer, I want JiraService logic tested without calling JIRA API.

**Acceptance Criteria:**
- [ ] `src/services/JiraService.test.ts` created
- [ ] Tests cover data transformation logic
- [ ] Tests cover input validation
- [ ] Actual JIRA API calls are skipped

### US-008: Test Custom Hooks
As a developer, I want custom hooks tested so that state management logic is reliable.

**Acceptance Criteria:**
- [ ] Install `@testing-library/react-hooks` or use Vitest's hook testing
- [ ] Tests created for hooks in `src/hooks/`
- [ ] State transitions tested
- [ ] Side effect triggers tested (without actual side effects)

### US-009: Test Screen Logic (Hooks/State)
As a developer, I want screen logic tested through extracted hooks and state.

**Acceptance Criteria:**
- [ ] Logic extracted from screens into testable hooks where needed
- [ ] Screen state management tested
- [ ] User interaction handlers tested (logic only)
- [ ] Full render tests not required for screens

### US-010: Test UI Components with React Testing Library
As a developer, I want UI components tested for correct behavior.

**Acceptance Criteria:**
- [ ] `@testing-library/react` installed
- [ ] Component tests focus on user behavior, not implementation
- [ ] Accessibility queries used (getByRole, getByLabelText)
- [ ] Components in `src/components/` have corresponding test files

### US-011: Test Ink CLI Components
As a developer, I want Ink-specific components tested appropriately.

**Acceptance Criteria:**
- [ ] `ink-testing-library` installed for CLI component testing
- [ ] CLI-specific rendering tested
- [ ] Keyboard input handling tested where applicable
- [ ] Output formatting tested

### US-012: Achieve 80% Coverage Threshold
As a developer, I want coverage reporting to warn when below 80%.

**Acceptance Criteria:**
- [ ] Coverage report generates for all source files
- [ ] Vitest configured with coverage thresholds (warn mode)
- [ ] Coverage report shows lines, branches, functions, statements
- [ ] CI/npm script outputs warning if coverage < 80%
- [ ] Coverage excludes test files and type definitions

## Functional Requirements
- FR-1: All test files must be co-located with source files (`*.test.ts` pattern)
- FR-2: Tests must not call external APIs (Copilot, JIRA, Git shell commands)
- FR-3: Tests must use TypeScript with full type checking
- FR-4: Coverage must include all `src/` files except explicitly excluded patterns
- FR-5: React components must be tested with React Testing Library queries
- FR-6: Ink components must be tested with ink-testing-library
- FR-7: Hooks must be tested in isolation using testing utilities

## Non-Goals
- Integration tests with real external APIs
- End-to-end testing of the full CLI application
- Visual regression testing
- Performance/benchmark testing
- Mocking external dependencies (we skip those functions instead)
- Build failures on coverage drop (warn only)

## Technical Considerations
- Vitest is chosen for its native TypeScript support and Jest compatibility
- ink-testing-library provides utilities for testing Ink CLI components
- @testing-library/react provides user-centric testing patterns
- Coverage provider should be v8 (faster) or istanbul (more compatible)
- Some functions may need refactoring to extract testable logic from API calls

## Success Metrics
- Minimum 80% line coverage achieved
- All tests pass in CI
- No external API calls in test suite
- Test execution time under 30 seconds

## Open Questions
- Are there any files/folders that should be explicitly excluded from coverage?
- Should we set up a CI workflow for running tests, or is local sufficient for now?
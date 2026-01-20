# Testing Patterns

**Analysis Date:** 2026-01-20

## Test Framework

**Runner:**
- No test framework configured
- No test scripts in `package.json`
- No test configuration files found (jest.config.*, vitest.config.*, etc.)

**Assertion Library:**
- Not applicable (no tests present)

**Run Commands:**
```bash
# No test commands available
# Recommended setup based on project stack:
npm test              # Would run all tests
npm run test:watch    # Would run in watch mode
npm run test:coverage # Would generate coverage report
```

## Test File Organization

**Location:**
- No test files present in the codebase
- No `__tests__` directories
- No `*.test.ts` or `*.spec.ts` files in `src/`

**Recommended Pattern (based on project structure):**
- Co-located tests: `src/utils/copilot.test.ts` alongside `src/utils/copilot.ts`
- Or separate directory: `tests/utils/copilot.test.ts`

**Naming:**
- Suggested: `{filename}.test.ts` or `{filename}.spec.ts`

**Structure:**
```
src/
├── utils/
│   ├── copilot.ts
│   ├── copilot.test.ts    # Co-located test (recommended)
│   ├── knowledgeBase.ts
│   └── knowledgeBase.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
// Recommended pattern based on codebase conventions
import { describe, it, expect, vi } from 'vitest';
import { functionName } from './module.js';

describe('functionName', () => {
  it('should handle normal case', () => {
    const result = functionName(input);
    expect(result).toBe(expected);
  });

  it('should handle edge case', () => {
    // ...
  });
});
```

**Patterns:**
- Group related tests with `describe` blocks
- Use descriptive test names: `'should return null when file not found'`
- Follow Arrange-Act-Assert pattern

## Mocking

**Framework:** Vitest or Jest recommended (both support ESM)

**Patterns:**
```typescript
// Mock file system operations
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock fetch for API calls
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ token: 'test-token' }),
});

// Mock child_process for git operations
vi.mock('child_process', () => ({
  spawnSync: vi.fn().mockReturnValue({
    stdout: 'mock output',
    stderr: '',
    status: 0,
  }),
}));
```

**What to Mock:**
- File system operations (`fs` module)
- Network requests (`fetch`)
- Child processes (`child_process.spawnSync`)
- External services (GitHub Copilot API)
- Date/time for predictable tests

**What NOT to Mock:**
- Pure utility functions (tokenizer, text processing)
- Type definitions
- Internal helper functions in same module

## Fixtures and Factories

**Test Data:**
```typescript
// Recommended factory pattern
const createMockKnowledgeBase = (overrides = {}): KnowledgeBase => ({
  id: 'test-kb-id',
  name: 'Test Knowledge Base',
  createdAt: '2024-01-01T00:00:00.000Z',
  sources: [],
  crawlDepth: 2,
  totalPages: 0,
  ...overrides,
});

const createMockPageContent = (overrides = {}): PageContent => ({
  url: 'https://example.com',
  title: 'Test Page',
  text: 'Test content',
  links: [],
  ...overrides,
});

const createMockChatMessage = (overrides = {}): ChatMessage => ({
  role: 'user',
  content: 'Test message',
  ...overrides,
});
```

**Location:**
- `tests/fixtures/` or `src/__fixtures__/` recommended
- Or inline in test files for simple cases

## Coverage

**Requirements:** None enforced (no test infrastructure)

**Recommended Coverage Targets:**
- Overall: 70%+
- Utilities: 80%+ (pure functions are easy to test)
- React components: 50%+ (UI testing is harder)

**View Coverage:**
```bash
# After setting up Vitest:
npx vitest run --coverage
```

## Test Types

**Unit Tests:**
- Scope: Individual functions in `src/utils/`
- High priority targets:
  - `src/utils/tokenizer.ts` - Pure functions, easy to test
  - `src/utils/rag.ts` - Text chunking and TF-IDF calculations
  - `src/utils/crawler.ts` - URL normalization, content extraction
  - `src/utils/git.ts` - Status parsing (mock spawnSync)

**Integration Tests:**
- Scope: Module interactions
- Priority targets:
  - Knowledge base creation/crawling flow
  - Copilot token detection and verification
  - QA plan generation workflow

**E2E Tests:**
- Framework: Not applicable for CLI tool
- Consider manual testing or snapshot testing for TUI output

## Common Patterns

**Async Testing:**
```typescript
it('should fetch and verify token', async () => {
  // Arrange
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ token: 'api-token', expires_at: Date.now() + 3600000 }),
  });

  // Act
  const result = await exchangeForCopilotToken('oauth-token');

  // Assert
  expect(result.success).toBe(true);
  expect(result.token).toBe('api-token');
  expect(fetch).toHaveBeenCalledWith(
    'https://api.github.com/copilot_internal/v2/token',
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'token oauth-token',
      }),
    })
  );
});
```

**Error Testing:**
```typescript
it('should handle network errors gracefully', async () => {
  // Arrange
  global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

  // Act
  const result = await exchangeForCopilotToken('token');

  // Assert
  expect(result.success).toBe(false);
  expect(result.error).toBe('Network error');
});

it('should return null for invalid file path', () => {
  // Arrange
  vi.mocked(fs.existsSync).mockReturnValue(false);

  // Act
  const result = readSourceFile('/nonexistent/path.ts');

  // Assert
  expect(result).toBeNull();
});
```

**Testing Result Objects:**
```typescript
it('should return success result on valid input', () => {
  const result = saveQAPlan('content', 'filename', metadata);

  expect(result).toEqual({
    success: true,
    path: expect.stringContaining('filename.md'),
  });
});

it('should return error result on invalid filename', () => {
  const result = saveQAPlan('content', '', metadata);

  expect(result).toEqual({
    success: false,
    error: 'Invalid filename',
  });
});
```

## Recommended Test Setup

**Install Dependencies:**
```bash
npm install -D vitest @vitest/coverage-v8
```

**Add to package.json:**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Create vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts'],
    },
  },
});
```

## Priority Test Targets

**High Priority (pure functions, easy to test):**
1. `src/utils/tokenizer.ts` - countTokens, truncateToTokenLimit, truncateDiff
2. `src/utils/rag.ts` - chunkText, cosineSimilarity, tokenize
3. `src/utils/crawler.ts` - normalizeUrl, isValidUrl, isSameDomain, extractContent
4. `src/utils/qaPlan.ts` - sanitizeFilename, generateDefaultFilename

**Medium Priority (require mocking):**
1. `src/utils/git.ts` - Mock child_process.spawnSync
2. `src/utils/settings.ts` - Mock fs operations
3. `src/utils/knowledgeBase.ts` - Mock fs operations
4. `src/utils/copilot.ts` - Mock fetch

**Lower Priority (UI components):**
1. React component rendering tests
2. Keyboard input handling tests
3. State machine transitions

---

*Testing analysis: 2026-01-20*

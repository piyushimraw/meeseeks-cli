# Feature: Context Condensing for QA Plan Generator

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types, and models. Import from the right files etc.

## Feature Description

Add intelligent context condensing to the QA Plan Generator that automatically detects when the combined context (system prompt + knowledge base content + git diff) exceeds the token limit of the selected model, and applies condensing strategies to fit within limits while preserving the most relevant information.

## User Story

As a developer using the QA Plan Generator
I want the tool to automatically handle context that exceeds model token limits
So that I can generate QA plans for large diffs or with extensive knowledge bases without encountering API errors

## Problem Statement

Currently, the QA Plan Generator assembles context by concatenating:
1. System prompt (~50 tokens)
2. Knowledge base content (up to 100KB / ~25,000 tokens)
3. Git diff (unlimited, though individual files capped at 500 lines)

This combined context is sent directly to the Copilot API without checking if it exceeds the model's token limit. For smaller context models like GPT-4 (8K tokens) or GPT-3.5-turbo (4K tokens), large diffs or knowledge bases will cause API failures.

## Solution Statement

Implement a context management layer that:
1. Counts tokens before sending using `gpt-tokenizer` library
2. Defines token limits per model (with safety margin)
3. When context exceeds limits, applies condensing strategies:
   - Reduce number of KB search results
   - Truncate git diff to most important files
   - Summarize using progressive condensing if needed
4. Shows user feedback about context size and any condensing applied

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: QAPlan.tsx, copilot.ts
**Dependencies**: gpt-tokenizer (new npm dependency)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/screens/QAPlan.tsx` (lines 112-185) - Why: Contains `handleGenerate` function where context is assembled and API is called. This is the primary integration point.
- `src/utils/copilot.ts` (lines 282-339) - Why: Contains `chatWithCopilot` function and `ChatMessage` type. Need to understand the API call flow.
- `src/utils/copilot.ts` (lines 374-384) - Why: Contains `FALLBACK_MODELS` array with model IDs that need token limits mapped.
- `src/utils/git.ts` (lines 288-342) - Why: Contains `getUncommittedDiff` and `getBranchDiff` functions. May need to modify to support truncation.
- `src/utils/knowledgeBase.ts` (lines 275-326) - Why: Contains `loadKnowledgeBaseContent` with existing 100KB truncation logic.
- `src/utils/rag.ts` (lines 671-718) - Why: Contains `searchKnowledgeBase` function that returns search results.
- `src/types/index.ts` - Why: Type definitions for `CopilotModel`, `ChatMessage`, `SearchResult`, etc.
- `src/context/KnowledgeBaseContext.tsx` (lines 193-199) - Why: Contains `searchKB` wrapper that's called from QAPlan.

### New Files to Create

- `src/utils/tokenizer.ts` - Token counting and context management utilities
- No new type files needed - types can be added to existing `src/types/index.ts`

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [gpt-tokenizer npm package](https://www.npmjs.com/package/gpt-tokenizer)
  - Specific section: Installation and basic usage
  - Why: Primary library for token counting
- [OpenAI Token Limits](https://platform.openai.com/docs/models)
  - Specific section: Model comparison table
  - Why: Reference for model context window sizes

### Patterns to Follow

**Naming Conventions:**
- Utility files: `src/utils/{feature}.ts` (lowercase, kebab-case for multi-word)
- Functions: camelCase (e.g., `countTokens`, `condenseContext`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `MODEL_TOKEN_LIMITS`)
- Types/Interfaces: PascalCase (e.g., `TokenCountResult`, `CondenseOptions`)

**Error Handling Pattern** (from copilot.ts:330-338):
```typescript
try {
  // operation
} catch (err) {
  return {
    success: false,
    error: err instanceof Error ? err.message : 'Operation failed',
  };
}
```

**Async Function Pattern** (from copilot.ts:282-286):
```typescript
export async function functionName(
  param1: string,
  param2: Type,
): Promise<ResultType> {
  // implementation
}
```

**Export Pattern** (from copilot.ts):
- Named exports for functions
- Type exports with `export type` or `export interface`

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation - Token Counting Infrastructure

Create the token counting utility with model-specific limits and basic counting functionality.

**Tasks:**
- Add `gpt-tokenizer` dependency
- Create `src/utils/tokenizer.ts` with model limits map
- Implement token counting functions
- Add types for token-related operations

### Phase 2: Core Implementation - Context Condensing Logic

Implement the context analysis and condensing strategies.

**Tasks:**
- Implement context analysis function
- Create condensing strategies for KB content
- Create condensing strategies for git diff
- Implement progressive condensing pipeline

### Phase 3: Integration - Connect to QA Plan Flow

Integrate the condensing system into the QA plan generation flow.

**Tasks:**
- Modify `handleGenerate` in QAPlan.tsx
- Add UI feedback for condensing status
- Handle edge cases (empty content, minimal context)

### Phase 4: Testing & Validation

Test the implementation with various scenarios.

**Tasks:**
- Test with different models (GPT-4, GPT-3.5, Claude)
- Test with large diffs exceeding limits
- Test with large KB content
- Verify error handling

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1: ADD gpt-tokenizer dependency

- **IMPLEMENT**: Add `gpt-tokenizer` to package.json dependencies
- **PATTERN**: Follow existing dependency style in package.json:56-66
- **VALIDATE**: `npm install && npm run build`

```bash
npm install gpt-tokenizer
```

### Task 2: CREATE src/utils/tokenizer.ts - Model token limits

- **IMPLEMENT**: Create tokenizer utility file with model limits constant
- **PATTERN**: Mirror constant definition style from copilot.ts:374-384
- **IMPORTS**: `import { encode, encodeChat } from 'gpt-tokenizer';`

```typescript
// Model token limits (context window size)
// Reserve 20% for response + safety margin
export const MODEL_TOKEN_LIMITS: Record<string, { context: number; maxOutput: number; available: number }> = {
  'gpt-4o': { context: 128000, maxOutput: 16384, available: 100000 },
  'gpt-4o-mini': { context: 128000, maxOutput: 16384, available: 100000 },
  'gpt-4': { context: 8192, maxOutput: 8192, available: 6000 },
  'gpt-4-turbo': { context: 128000, maxOutput: 4096, available: 100000 },
  'gpt-3.5-turbo': { context: 16385, maxOutput: 4096, available: 12000 },
  'claude-3.5-sonnet': { context: 200000, maxOutput: 8192, available: 150000 },
  'claude-3.5-haiku': { context: 200000, maxOutput: 8192, available: 150000 },
  'o1-preview': { context: 128000, maxOutput: 32768, available: 90000 },
  'o1-mini': { context: 128000, maxOutput: 65536, available: 60000 },
};

// Default for unknown models (conservative)
export const DEFAULT_TOKEN_LIMIT = { context: 8192, maxOutput: 4096, available: 6000 };
```

- **VALIDATE**: `npm run build` (no TypeScript errors)

### Task 3: UPDATE src/utils/tokenizer.ts - Token counting functions

- **IMPLEMENT**: Add token counting functions for text and chat messages
- **PATTERN**: Follow function signature style from copilot.ts
- **IMPORTS**: Already have gpt-tokenizer imported
- **GOTCHA**: encodeChat needs model parameter - use 'gpt-4o' as default since all models use similar tokenization

```typescript
import { encode, encodeChat } from 'gpt-tokenizer';
import type { ChatMessage } from './copilot.js';

/**
 * Count tokens in a string
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  return encode(text).length;
}

/**
 * Count tokens in chat messages (includes message overhead)
 */
export function countChatTokens(messages: ChatMessage[]): number {
  if (!messages || messages.length === 0) return 0;
  try {
    return encodeChat(messages, 'gpt-4o').length;
  } catch {
    // Fallback to simple counting if encodeChat fails
    return messages.reduce((sum, msg) => sum + countTokens(msg.content) + 4, 0);
  }
}

/**
 * Get available tokens for a model
 */
export function getAvailableTokens(modelId: string): number {
  const limits = MODEL_TOKEN_LIMITS[modelId] || DEFAULT_TOKEN_LIMIT;
  return limits.available;
}

/**
 * Get model token limits
 */
export function getModelLimits(modelId: string): { context: number; maxOutput: number; available: number } {
  return MODEL_TOKEN_LIMITS[modelId] || DEFAULT_TOKEN_LIMIT;
}
```

- **VALIDATE**: `npm run build`

### Task 4: ADD types to src/types/index.ts - Context condensing types

- **IMPLEMENT**: Add types for context analysis and condensing results
- **PATTERN**: Follow existing interface style in types/index.ts
- **GOTCHA**: Place at end of file to avoid disrupting existing exports

```typescript
// Context Condensing Types
export interface ContextAnalysis {
  systemTokens: number;
  userTokens: number;
  totalTokens: number;
  availableTokens: number;
  exceedsLimit: boolean;
  overflowTokens: number;
}

export interface CondenseResult {
  condensed: boolean;
  strategy: 'none' | 'reduce-kb' | 'truncate-diff' | 'both';
  originalTokens: number;
  finalTokens: number;
  systemPrompt: string;
  userPrompt: string;
  warnings: string[];
}

export interface CondenseOptions {
  modelId: string;
  systemPrompt: string;
  userPrompt: string;
  gitDiff: string;
  kbContent: string;
  searchResultCount: number;
}
```

- **VALIDATE**: `npm run build`

### Task 5: UPDATE src/utils/tokenizer.ts - Context analysis function

- **IMPLEMENT**: Add function to analyze context and determine if condensing is needed
- **PATTERN**: Follow existing utility function patterns
- **IMPORTS**: Import types from types/index.js

```typescript
import type { ContextAnalysis } from '../types/index.js';

/**
 * Analyze context to determine if it exceeds model limits
 */
export function analyzeContext(
  messages: ChatMessage[],
  modelId: string
): ContextAnalysis {
  const totalTokens = countChatTokens(messages);
  const availableTokens = getAvailableTokens(modelId);
  const exceedsLimit = totalTokens > availableTokens;

  // Calculate individual message tokens
  const systemMsg = messages.find(m => m.role === 'system');
  const userMsg = messages.find(m => m.role === 'user');

  return {
    systemTokens: systemMsg ? countTokens(systemMsg.content) : 0,
    userTokens: userMsg ? countTokens(userMsg.content) : 0,
    totalTokens,
    availableTokens,
    exceedsLimit,
    overflowTokens: exceedsLimit ? totalTokens - availableTokens : 0,
  };
}
```

- **VALIDATE**: `npm run build`

### Task 6: UPDATE src/utils/tokenizer.ts - Condensing strategies

- **IMPLEMENT**: Add functions to condense KB content and git diff
- **PATTERN**: Follow truncation pattern from knowledgeBase.ts:294-316
- **GOTCHA**: Preserve diff headers and most important files when truncating

```typescript
import type { CondenseResult, CondenseOptions, SearchResult } from '../types/index.js';

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  if (!text) return '';

  const tokens = encode(text);
  if (tokens.length <= maxTokens) return text;

  // Decode truncated tokens back to string
  const truncatedTokens = tokens.slice(0, maxTokens);
  let result = '';
  try {
    // gpt-tokenizer's decode function
    const { decode } = require('gpt-tokenizer');
    result = decode(truncatedTokens);
  } catch {
    // Fallback: estimate character count (4 chars per token)
    result = text.slice(0, maxTokens * 4);
  }

  return result + '\n\n[... content truncated to fit model context limit]';
}

/**
 * Reduce KB search results to fit within token budget
 */
export function reduceKBResults(
  results: SearchResult[],
  maxTokens: number
): { results: SearchResult[]; truncated: boolean } {
  if (results.length === 0) return { results: [], truncated: false };

  const kept: SearchResult[] = [];
  let totalTokens = 0;

  for (const result of results) {
    const resultTokens = countTokens(result.chunk.text) + 50; // 50 for header/formatting
    if (totalTokens + resultTokens <= maxTokens) {
      kept.push(result);
      totalTokens += resultTokens;
    } else {
      break;
    }
  }

  return {
    results: kept,
    truncated: kept.length < results.length,
  };
}

/**
 * Truncate git diff intelligently - keep headers and prioritize changed files
 */
export function truncateDiff(diff: string, maxTokens: number): { diff: string; truncated: boolean } {
  if (!diff || diff === '(no changes)') return { diff, truncated: false };

  const currentTokens = countTokens(diff);
  if (currentTokens <= maxTokens) return { diff, truncated: false };

  // Split by file diffs
  const fileDiffs = diff.split(/(?=diff --git)/);
  const kept: string[] = [];
  let totalTokens = 0;
  const reserveForMessage = 100; // Reserve tokens for truncation message
  const availableTokens = maxTokens - reserveForMessage;

  for (const fileDiff of fileDiffs) {
    const tokens = countTokens(fileDiff);
    if (totalTokens + tokens <= availableTokens) {
      kept.push(fileDiff);
      totalTokens += tokens;
    } else if (kept.length === 0) {
      // At least keep one truncated file
      kept.push(truncateToTokenLimit(fileDiff, availableTokens));
      break;
    } else {
      break;
    }
  }

  const truncatedCount = fileDiffs.length - kept.length;
  let result = kept.join('');

  if (truncatedCount > 0) {
    result += `\n\n[... ${truncatedCount} more file(s) truncated to fit model context limit]`;
  }

  return { diff: result, truncated: truncatedCount > 0 };
}
```

- **VALIDATE**: `npm run build`

### Task 7: UPDATE src/utils/tokenizer.ts - Main condense function

- **IMPLEMENT**: Add main `condenseContext` function that orchestrates condensing strategies
- **PATTERN**: Follow ChatResponse pattern from copilot.ts for result type

```typescript
/**
 * Condense context to fit within model token limits
 * Applies strategies in order: reduce KB results, then truncate diff
 */
export function condenseContext(options: CondenseOptions): CondenseResult {
  const { modelId, gitDiff, kbContent, searchResultCount } = options;
  let { systemPrompt, userPrompt } = options;

  const warnings: string[] = [];
  let strategy: CondenseResult['strategy'] = 'none';

  // Build initial messages
  const buildMessages = (sys: string, usr: string): ChatMessage[] => [
    { role: 'system', content: sys },
    { role: 'user', content: usr },
  ];

  // Check initial token count
  let messages = buildMessages(systemPrompt, userPrompt);
  const initialAnalysis = analyzeContext(messages, modelId);
  const originalTokens = initialAnalysis.totalTokens;

  if (!initialAnalysis.exceedsLimit) {
    return {
      condensed: false,
      strategy: 'none',
      originalTokens,
      finalTokens: originalTokens,
      systemPrompt,
      userPrompt,
      warnings,
    };
  }

  // Strategy 1: If KB content exists, reduce it
  if (kbContent && initialAnalysis.systemTokens > 1000) {
    const kbTokens = countTokens(kbContent);
    const targetKBTokens = Math.max(1000, kbTokens - initialAnalysis.overflowTokens);

    if (targetKBTokens < kbTokens) {
      const truncatedKB = truncateToTokenLimit(kbContent, targetKBTokens);
      systemPrompt = systemPrompt.replace(kbContent, truncatedKB);
      warnings.push(`Knowledge base content reduced from ${kbTokens} to ${targetKBTokens} tokens`);
      strategy = 'reduce-kb';

      // Re-check
      messages = buildMessages(systemPrompt, userPrompt);
      const afterKB = analyzeContext(messages, modelId);

      if (!afterKB.exceedsLimit) {
        return {
          condensed: true,
          strategy,
          originalTokens,
          finalTokens: afterKB.totalTokens,
          systemPrompt,
          userPrompt,
          warnings,
        };
      }
    }
  }

  // Strategy 2: Truncate git diff
  if (gitDiff && gitDiff !== '(no changes)') {
    // Calculate how many tokens we need to remove from diff
    messages = buildMessages(systemPrompt, userPrompt);
    const currentAnalysis = analyzeContext(messages, modelId);

    if (currentAnalysis.exceedsLimit) {
      const diffTokens = countTokens(gitDiff);
      const targetDiffTokens = Math.max(500, diffTokens - currentAnalysis.overflowTokens);

      const { diff: truncatedDiff, truncated } = truncateDiff(gitDiff, targetDiffTokens);

      if (truncated) {
        userPrompt = userPrompt.replace(gitDiff, truncatedDiff);
        warnings.push(`Git diff truncated from ${diffTokens} to ${countTokens(truncatedDiff)} tokens`);
        strategy = strategy === 'reduce-kb' ? 'both' : 'truncate-diff';
      }
    }
  }

  // Final check
  messages = buildMessages(systemPrompt, userPrompt);
  const finalAnalysis = analyzeContext(messages, modelId);

  if (finalAnalysis.exceedsLimit) {
    warnings.push(`Warning: Context still exceeds limit by ${finalAnalysis.overflowTokens} tokens. API call may fail.`);
  }

  return {
    condensed: true,
    strategy,
    originalTokens,
    finalTokens: finalAnalysis.totalTokens,
    systemPrompt,
    userPrompt,
    warnings,
  };
}
```

- **VALIDATE**: `npm run build`

### Task 8: UPDATE src/utils/tokenizer.ts - Export all functions

- **IMPLEMENT**: Ensure all functions are properly exported
- **PATTERN**: Follow export style from copilot.ts
- **VALIDATE**: `npm run build`

The final `src/utils/tokenizer.ts` should export:
- `MODEL_TOKEN_LIMITS`
- `DEFAULT_TOKEN_LIMIT`
- `countTokens`
- `countChatTokens`
- `getAvailableTokens`
- `getModelLimits`
- `analyzeContext`
- `truncateToTokenLimit`
- `reduceKBResults`
- `truncateDiff`
- `condenseContext`

### Task 9: UPDATE src/screens/QAPlan.tsx - Import tokenizer

- **IMPLEMENT**: Import tokenizer functions at the top of the file
- **PATTERN**: Follow import style from lines 1-9
- **IMPORTS**: Add after existing imports

```typescript
import { condenseContext, analyzeContext, getModelLimits } from '../utils/tokenizer.js';
import type { CondenseResult } from '../types/index.js';
```

- **VALIDATE**: `npm run build`

### Task 10: UPDATE src/screens/QAPlan.tsx - Add condensing state

- **IMPLEMENT**: Add state variable to track condensing results
- **PATTERN**: Follow state definition style from lines 57-73
- **LOCATION**: After line 73 (after `savedPath` state)

```typescript
const [condenseInfo, setCondenseInfo] = useState<CondenseResult | null>(null);
```

- **VALIDATE**: `npm run build`

### Task 11: UPDATE src/screens/QAPlan.tsx - Modify handleGenerate

- **IMPLEMENT**: Integrate context condensing into the generation flow
- **PATTERN**: Follow existing async flow pattern in handleGenerate
- **LOCATION**: Modify lines 148-174 (prompt building and API call section)
- **GOTCHA**: Must apply condensing BEFORE calling chatWithCopilot

Replace the prompt building and API call section (approximately lines 148-185) with:

```typescript
    setState('generating');

    // Build the initial system prompt
    let systemPrompt = 'You are a QA engineer assistant. Generate comprehensive, actionable test plans for code changes.';
    if (kbContent) {
      systemPrompt += `\n\n## Reference Documentation\nUse the following documentation to understand the project context and ensure test coverage aligns with documented features:\n\n${kbContent}`;
    }

    // Build the initial user prompt
    let userPrompt = 'Generate a QA test plan for the following code changes. Include:\n';
    userPrompt += '1. Summary of changes\n';
    userPrompt += '2. Areas affected\n';
    userPrompt += '3. Test cases with clear steps\n';
    userPrompt += '4. Edge cases to consider\n';
    userPrompt += '5. Regression testing recommendations\n\n';
    userPrompt += '## Code Changes (Git Diff)\n\n```diff\n' + gitDiff + '\n```';

    // Apply context condensing if needed
    const condenseResult = condenseContext({
      modelId: authState.selectedModel,
      systemPrompt,
      userPrompt,
      gitDiff,
      kbContent,
      searchResultCount: searchResults.length,
    });

    setCondenseInfo(condenseResult);

    // Use condensed prompts
    const result = await chatWithCopilot(token, [
      {
        role: 'system',
        content: condenseResult.systemPrompt,
      },
      {
        role: 'user',
        content: condenseResult.userPrompt,
      },
    ], authState.selectedModel);

    if (result.success && result.content) {
      setOutput(result.content);
      setModelInfo(result.model || null);
      setUsageInfo(result.usage || null);
      setState('complete');
    } else {
      setError(result.error || 'Failed to generate QA plan');
      setState('error');
    }
```

- **VALIDATE**: `npm run build`

### Task 12: UPDATE src/screens/QAPlan.tsx - Add condensing UI feedback

- **IMPLEMENT**: Display condensing information in the generating and complete states
- **PATTERN**: Follow existing UI patterns with palette colors
- **LOCATION**: Modify 'generating' case (around line 543-560) and 'complete' case (around line 563-595)

In the 'generating' case, add after the model info display:

```typescript
{condenseInfo && condenseInfo.condensed && (
  <Box marginTop={1}>
    <Text color={palette.yellow}>
      Context condensed: {condenseInfo.originalTokens.toLocaleString()} → {condenseInfo.finalTokens.toLocaleString()} tokens
      {condenseInfo.strategy !== 'none' && ` (${condenseInfo.strategy})`}
    </Text>
  </Box>
)}
```

In the 'complete' case, add after the token usage display (around line 590):

```typescript
{condenseInfo && condenseInfo.condensed && (
  <Box marginTop={1} flexDirection="column">
    <Text color={palette.yellow}>
      Context was condensed to fit model limits
    </Text>
    <Text color={palette.dim}>
      Original: {condenseInfo.originalTokens.toLocaleString()} tokens | Final: {condenseInfo.finalTokens.toLocaleString()} tokens
    </Text>
    {condenseInfo.warnings.map((warning, i) => (
      <Text key={i} color={palette.dim}>
        • {warning}
      </Text>
    ))}
  </Box>
)}
```

- **VALIDATE**: `npm run build`

### Task 13: UPDATE src/screens/QAPlan.tsx - Reset condensing state

- **IMPLEMENT**: Reset condenseInfo when resetting the form
- **PATTERN**: Follow existing reset pattern at lines 319-335
- **LOCATION**: In the reset handler, add `setCondenseInfo(null);`

Add after line 334:
```typescript
setCondenseInfo(null);
```

- **VALIDATE**: `npm run build`

### Task 14: VERIFY complete tokenizer.ts file

- **IMPLEMENT**: Verify all imports are correct and file compiles
- **VALIDATE**: `npm run build && npm run start` (should launch without errors)

The complete `src/utils/tokenizer.ts` file should have:
1. Imports from gpt-tokenizer
2. Import of ChatMessage type from copilot
3. Import of types from types/index
4. MODEL_TOKEN_LIMITS constant
5. DEFAULT_TOKEN_LIMIT constant
6. All utility functions

### Task 15: VALIDATE end-to-end flow

- **IMPLEMENT**: Manually test the feature
- **VALIDATE**:
  1. Run `npm start`
  2. Connect to Copilot
  3. Select a model with small context (GPT-4 if available)
  4. Try to generate QA plan with large diff
  5. Verify condensing feedback is shown

---

## TESTING STRATEGY

### Unit Tests

Given the project does not have a test framework configured, focus on manual validation:

1. **Token counting accuracy**:
   - Test `countTokens` with known strings
   - Verify counts match OpenAI tokenizer

2. **Condensing logic**:
   - Test with content below limit (no condensing)
   - Test with content above limit (condensing applied)
   - Test with different models (different limits)

### Integration Tests

Manual integration testing scenarios:

1. **Small diff, no KB** → Should not condense
2. **Large diff (>100 files), no KB** → Should truncate diff
3. **Small diff, large KB** → Should reduce KB content
4. **Large diff, large KB** → Should apply both strategies
5. **GPT-4 (8K)** → Should condense aggressively
6. **GPT-4o (128K)** → Should rarely need condensing

### Edge Cases

- Empty git diff (`(no changes)`)
- No knowledge base selected
- Unknown model ID (should use default limits)
- Token counting errors (should fallback gracefully)

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
npm run build
```
Expected: No TypeScript errors

### Level 2: Runtime Verification

```bash
npm start
```
Expected: App launches without errors

### Level 3: Manual Feature Testing

1. Launch app: `npm start`
2. Select "Connect to Copilot" and connect
3. Select "Select Model" → choose GPT-4 (smaller context)
4. Select "Create QA Plan"
5. Choose "Branch comparison" or make large changes
6. Observe condensing feedback during generation
7. Verify QA plan is generated successfully

### Level 4: Verify Package

```bash
npm run build && npm link && meeseeks
```
Expected: CLI works correctly after build

---

## ACCEPTANCE CRITERIA

- [ ] `gpt-tokenizer` dependency added and working
- [ ] `src/utils/tokenizer.ts` created with all functions
- [ ] Token counting accurately estimates context size
- [ ] Context condensing activates when limit exceeded
- [ ] KB content is reduced first, then diff truncated
- [ ] User sees feedback about condensing (tokens, strategy)
- [ ] QA plans generate successfully even with large context
- [ ] No TypeScript errors on build
- [ ] Works with all listed models (GPT-4, GPT-4o, Claude, etc.)
- [ ] Graceful fallback for unknown models

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] `npm run build` passes with no errors
- [ ] `npm start` launches app successfully
- [ ] Manual testing confirms feature works
- [ ] Condensing feedback displays correctly
- [ ] Large diffs work without API errors
- [ ] Code follows project conventions

---

## NOTES

### Design Decisions

1. **Token counting library**: Chose `gpt-tokenizer` over `tiktoken` because:
   - Pure TypeScript (no WASM requirements)
   - Works in all Node.js environments
   - Actively maintained, supports latest models
   - Smaller bundle size

2. **Condensing strategy order**: KB first, then diff because:
   - KB content is supplementary context
   - Diff is the primary input user cares about
   - Better to have complete diff analysis with partial KB than vice versa

3. **Safety margin (20%)**: Reserved 20% of context for:
   - Model response generation
   - Message formatting overhead
   - Buffer for tokenization differences

### Potential Future Enhancements

1. **Smarter diff prioritization**: Rank files by importance (tests, core logic) when truncating
2. **Summarization**: Use LLM to summarize instead of truncate for better information preservation
3. **User controls**: Let user choose condensing aggressiveness
4. **Caching**: Cache token counts for repeated content

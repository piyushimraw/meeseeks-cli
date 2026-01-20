import { encode, decode } from 'gpt-tokenizer';
import type { ChatMessage } from './copilot.js';
import type { ContextAnalysis, CondenseResult, CondenseOptions } from '../types/index.js';

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
  'gemini-3-flash-preview': { context: 128000, maxOutput: 8192, available: 100000 },
};

// Default for unknown models (conservative)
export const DEFAULT_TOKEN_LIMIT = { context: 8192, maxOutput: 4096, available: 6000 };

/**
 * Count tokens in a string
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  return encode(text).length;
}

/**
 * Count tokens in chat messages (includes message overhead)
 * Each message has ~4 tokens of overhead for role/formatting
 */
export function countChatTokens(messages: ChatMessage[]): number {
  if (!messages || messages.length === 0) return 0;
  try {
    // Count tokens for each message content plus ~4 tokens per message overhead
    return messages.reduce((sum, msg) => sum + countTokens(msg.content) + 4, 0);
  } catch {
    // Fallback to simple counting if encoding fails
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
    result = decode(truncatedTokens);
  } catch {
    // Fallback: estimate character count (4 chars per token)
    result = text.slice(0, maxTokens * 4);
  }

  return result + '\n\n[... content truncated to fit model context limit]';
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

/**
 * Condense context to fit within model token limits
 * Applies strategies in order: reduce KB results, then truncate diff
 */
export function condenseContext(options: CondenseOptions): CondenseResult {
  const { modelId, gitDiff, kbContent } = options;
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
      warnings.push(`Knowledge base content reduced from ${kbTokens.toLocaleString()} to ${targetKBTokens.toLocaleString()} tokens`);
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
        warnings.push(`Git diff truncated from ${diffTokens.toLocaleString()} to ${countTokens(truncatedDiff).toLocaleString()} tokens`);
        strategy = strategy === 'reduce-kb' ? 'both' : 'truncate-diff';
      }
    }
  }

  // Final check
  messages = buildMessages(systemPrompt, userPrompt);
  const finalAnalysis = analyzeContext(messages, modelId);

  if (finalAnalysis.exceedsLimit) {
    warnings.push(`Warning: Context still exceeds limit by ${finalAnalysis.overflowTokens.toLocaleString()} tokens. API call may fail.`);
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

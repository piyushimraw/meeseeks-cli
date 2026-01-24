import { describe, it, expect } from 'vitest';
import {
  MODEL_TOKEN_LIMITS,
  DEFAULT_TOKEN_LIMIT,
  countTokens,
  countChatTokens,
  getAvailableTokens,
  getModelLimits,
  truncateToTokenLimit,
  truncateDiff,
  analyzeContext,
  condenseContext,
} from './tokenizer.js';
import type { ChatMessage } from './copilot.js';

describe('tokenizer', () => {
  describe('countTokens', () => {
    it('counts tokens in a simple string', () => {
      const result = countTokens('Hello, world!');
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });

    it('counts tokens in a longer string', () => {
      const short = countTokens('Hi');
      const long = countTokens('Hello, this is a much longer string with more words');
      expect(long).toBeGreaterThan(short);
    });

    it('returns 0 for empty string', () => {
      expect(countTokens('')).toBe(0);
    });

    it('returns 0 for null/undefined input', () => {
      expect(countTokens(null as unknown as string)).toBe(0);
      expect(countTokens(undefined as unknown as string)).toBe(0);
    });

    it('handles special characters', () => {
      const result = countTokens('!@#$%^&*()_+-=[]{}|;:,.<>?');
      expect(result).toBeGreaterThan(0);
    });

    it('handles unicode characters', () => {
      const result = countTokens('こんにちは世界 🌍 مرحبا');
      expect(result).toBeGreaterThan(0);
    });

    it('handles newlines and whitespace', () => {
      const result = countTokens('Line 1\nLine 2\n\tIndented');
      expect(result).toBeGreaterThan(0);
    });

    it('handles code snippets', () => {
      const code = `function hello() {
  console.log("Hello, world!");
}`;
      const result = countTokens(code);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('countChatTokens', () => {
    it('counts tokens in chat messages with overhead', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];
      const result = countChatTokens(messages);
      // Should be token count of "Hello" plus 4 tokens overhead
      expect(result).toBeGreaterThan(countTokens('Hello'));
    });

    it('returns 0 for empty messages array', () => {
      expect(countChatTokens([])).toBe(0);
    });

    it('returns 0 for null/undefined', () => {
      expect(countChatTokens(null as unknown as ChatMessage[])).toBe(0);
      expect(countChatTokens(undefined as unknown as ChatMessage[])).toBe(0);
    });

    it('handles multiple messages', () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi there!' },
      ];
      const result = countChatTokens(messages);
      // Should include all content tokens plus 4 tokens overhead per message
      expect(result).toBeGreaterThan(0);
      // 3 messages = 12 tokens overhead minimum
      expect(result).toBeGreaterThanOrEqual(12);
    });
  });

  describe('getAvailableTokens', () => {
    it('returns available tokens for known model', () => {
      expect(getAvailableTokens('gpt-4o')).toBe(100000);
      expect(getAvailableTokens('gpt-4')).toBe(6000);
      expect(getAvailableTokens('claude-3.5-sonnet')).toBe(150000);
    });

    it('returns default for unknown model', () => {
      expect(getAvailableTokens('unknown-model')).toBe(DEFAULT_TOKEN_LIMIT.available);
    });
  });

  describe('getModelLimits', () => {
    it('returns full limits for known model', () => {
      const limits = getModelLimits('gpt-4o');
      expect(limits).toEqual({
        context: 128000,
        maxOutput: 16384,
        available: 100000,
      });
    });

    it('returns default limits for unknown model', () => {
      const limits = getModelLimits('unknown-model');
      expect(limits).toEqual(DEFAULT_TOKEN_LIMIT);
    });
  });

  describe('MODEL_TOKEN_LIMITS', () => {
    it('contains expected models', () => {
      expect(MODEL_TOKEN_LIMITS).toHaveProperty('gpt-4o');
      expect(MODEL_TOKEN_LIMITS).toHaveProperty('gpt-4');
      expect(MODEL_TOKEN_LIMITS).toHaveProperty('gpt-4-turbo');
      expect(MODEL_TOKEN_LIMITS).toHaveProperty('gpt-3.5-turbo');
      expect(MODEL_TOKEN_LIMITS).toHaveProperty('claude-3.5-sonnet');
    });

    it('has valid structure for all models', () => {
      for (const [model, limits] of Object.entries(MODEL_TOKEN_LIMITS)) {
        expect(limits).toHaveProperty('context');
        expect(limits).toHaveProperty('maxOutput');
        expect(limits).toHaveProperty('available');
        expect(typeof limits.context).toBe('number');
        expect(typeof limits.maxOutput).toBe('number');
        expect(typeof limits.available).toBe('number');
        expect(limits.available).toBeLessThanOrEqual(limits.context);
      }
    });
  });

  describe('DEFAULT_TOKEN_LIMIT', () => {
    it('has valid structure', () => {
      expect(DEFAULT_TOKEN_LIMIT).toHaveProperty('context');
      expect(DEFAULT_TOKEN_LIMIT).toHaveProperty('maxOutput');
      expect(DEFAULT_TOKEN_LIMIT).toHaveProperty('available');
      expect(DEFAULT_TOKEN_LIMIT.context).toBe(8192);
      expect(DEFAULT_TOKEN_LIMIT.maxOutput).toBe(4096);
      expect(DEFAULT_TOKEN_LIMIT.available).toBe(6000);
    });
  });

  describe('truncateToTokenLimit', () => {
    it('returns empty string for empty input', () => {
      expect(truncateToTokenLimit('', 100)).toBe('');
    });

    it('returns original string if under limit', () => {
      const text = 'Short text';
      const result = truncateToTokenLimit(text, 1000);
      expect(result).toBe(text);
    });

    it('truncates text that exceeds limit', () => {
      const text = 'This is a longer text that will be truncated because it exceeds the token limit we set.'.repeat(10);
      const result = truncateToTokenLimit(text, 10);
      expect(result.length).toBeLessThan(text.length);
      expect(result).toContain('[... content truncated to fit model context limit]');
    });

    it('handles null/undefined', () => {
      expect(truncateToTokenLimit(null as unknown as string, 100)).toBe('');
      expect(truncateToTokenLimit(undefined as unknown as string, 100)).toBe('');
    });
  });

  describe('truncateDiff', () => {
    it('returns original diff if under limit', () => {
      const diff = 'diff --git a/file.txt b/file.txt\n+line added';
      const result = truncateDiff(diff, 1000);
      expect(result.diff).toBe(diff);
      expect(result.truncated).toBe(false);
    });

    it('returns original for "(no changes)"', () => {
      const result = truncateDiff('(no changes)', 100);
      expect(result.diff).toBe('(no changes)');
      expect(result.truncated).toBe(false);
    });

    it('returns original for empty diff', () => {
      const result = truncateDiff('', 100);
      expect(result.diff).toBe('');
      expect(result.truncated).toBe(false);
    });

    it('truncates large diff by file', () => {
      const diff = `diff --git a/file1.txt b/file1.txt
+line1
diff --git a/file2.txt b/file2.txt
+line2
diff --git a/file3.txt b/file3.txt
+line3`.repeat(50);
      const result = truncateDiff(diff, 50);
      expect(result.truncated).toBe(true);
      expect(result.diff).toContain('truncated to fit model context limit');
    });

    it('handles null/undefined', () => {
      expect(truncateDiff(null as unknown as string, 100)).toEqual({ diff: null, truncated: false });
      expect(truncateDiff(undefined as unknown as string, 100)).toEqual({ diff: undefined, truncated: false });
    });
  });

  describe('analyzeContext', () => {
    it('analyzes context within limit', () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hello!' },
      ];
      const result = analyzeContext(messages, 'gpt-4o');
      expect(result.totalTokens).toBeGreaterThan(0);
      expect(result.availableTokens).toBe(100000);
      expect(result.exceedsLimit).toBe(false);
      expect(result.overflowTokens).toBe(0);
      expect(result.systemTokens).toBeGreaterThan(0);
      expect(result.userTokens).toBeGreaterThan(0);
    });

    it('detects when context exceeds limit', () => {
      const longContent = 'word '.repeat(10000);
      const messages: ChatMessage[] = [
        { role: 'system', content: longContent },
        { role: 'user', content: longContent },
      ];
      const result = analyzeContext(messages, 'gpt-4'); // gpt-4 has small limit of 6000
      expect(result.exceedsLimit).toBe(true);
      expect(result.overflowTokens).toBeGreaterThan(0);
    });

    it('handles missing system or user messages', () => {
      const messages: ChatMessage[] = [
        { role: 'assistant', content: 'Hello!' },
      ];
      const result = analyzeContext(messages, 'gpt-4o');
      expect(result.systemTokens).toBe(0);
      expect(result.userTokens).toBe(0);
    });
  });

  describe('condenseContext', () => {
    it('returns unchanged when under limit', () => {
      const result = condenseContext({
        modelId: 'gpt-4o',
        systemPrompt: 'You are helpful.',
        userPrompt: 'Hello!',
        gitDiff: '',
        kbContent: '',
        searchResultCount: 0,
      });
      expect(result.condensed).toBe(false);
      expect(result.strategy).toBe('none');
      expect(result.systemPrompt).toBe('You are helpful.');
      expect(result.userPrompt).toBe('Hello!');
      expect(result.warnings).toHaveLength(0);
    });

    it('reduces KB content when exceeds limit', () => {
      const kbContent = 'Knowledge base content. '.repeat(1000);
      const systemPrompt = `Instructions. ${kbContent}`;
      const result = condenseContext({
        modelId: 'gpt-4', // Small limit
        systemPrompt,
        userPrompt: 'Question?',
        kbContent,
        gitDiff: '',
        searchResultCount: 0,
      });
      // Should attempt to reduce KB content
      expect(result.finalTokens).toBeLessThanOrEqual(result.originalTokens);
    });

    it('truncates git diff when exceeds limit', () => {
      const gitDiff = `diff --git a/file.txt b/file.txt
+added line
`.repeat(500);
      const result = condenseContext({
        modelId: 'gpt-4', // Small limit
        systemPrompt: 'System prompt.',
        userPrompt: `User request. ${gitDiff}`,
        gitDiff,
        kbContent: '',
        searchResultCount: 0,
      });
      expect(result.finalTokens).toBeLessThanOrEqual(result.originalTokens);
    });

    it('applies both strategies when needed', () => {
      const kbContent = 'KB content. '.repeat(500);
      const gitDiff = `diff --git a/file.txt b/file.txt
+added line
`.repeat(500);
      const result = condenseContext({
        modelId: 'gpt-4', // Small limit
        systemPrompt: `System. ${kbContent}`,
        userPrompt: `User. ${gitDiff}`,
        kbContent,
        gitDiff,
        searchResultCount: 0,
      });
      expect(result.finalTokens).toBeLessThanOrEqual(result.originalTokens);
    });

    it('warns when context still exceeds limit after strategies', () => {
      const hugeContent = 'word '.repeat(50000);
      const result = condenseContext({
        modelId: 'gpt-4',
        systemPrompt: hugeContent,
        userPrompt: hugeContent,
        gitDiff: '',
        kbContent: '',
        searchResultCount: 0,
      });
      // Should have a warning about still exceeding
      const hasWarning = result.warnings.some(w => w.includes('still exceeds'));
      expect(hasWarning).toBe(true);
    });
  });
});

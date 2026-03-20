import {describe, it, expect, vi, beforeEach} from 'vitest';
import {buildClaudeArgs, parseClaudeOutput, isClaudeInstalled} from './claudeCli.js';

describe('claudeCli', () => {
  describe('buildClaudeArgs', () => {
    it('should build args for print mode with prompt', () => {
      const args = buildClaudeArgs({prompt: 'Hello world'});
      expect(args).toEqual(['-p', 'Hello world', '--permission-mode', 'acceptEdits']);
    });

    it('should include --output-format json when requested', () => {
      const args = buildClaudeArgs({prompt: 'Hello', outputJson: true});
      expect(args).toContain('--output-format');
      expect(args).toContain('json');
    });

    it('should include --max-turns when specified', () => {
      const args = buildClaudeArgs({prompt: 'Hello', maxTurns: 5});
      expect(args).toContain('--max-turns');
      expect(args).toContain('5');
    });
  });

  describe('parseClaudeOutput', () => {
    it('should parse successful output', () => {
      const result = parseClaudeOutput(0, 'Some output text', '');
      expect(result).toEqual({
        success: true,
        output: 'Some output text',
        exitCode: 0,
      });
    });

    it('should parse failed output', () => {
      const result = parseClaudeOutput(1, '', 'Error occurred');
      expect(result).toEqual({
        success: false,
        output: '',
        exitCode: 1,
        error: 'Error occurred',
      });
    });

    it('should handle non-zero exit with stdout content', () => {
      const result = parseClaudeOutput(1, 'partial output', 'something went wrong');
      expect(result.success).toBe(false);
      expect(result.output).toBe('partial output');
      expect(result.error).toBe('something went wrong');
    });
  });
});

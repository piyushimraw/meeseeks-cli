import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateBranchName, isValidBranchName } from './branchName.js';
import * as git from './git.js';

// Mock the git module for isValidBranchName tests
vi.mock('./git.js', async () => {
  const actual = await vi.importActual('./git.js');
  return {
    ...actual,
    runGit: vi.fn(),
  };
});

describe('branchName utilities', () => {
  describe('generateBranchName', () => {
    describe('basic functionality', () => {
      it('generates branch name from ticket key and summary', () => {
        const result = generateBranchName('PROJ-123', 'Add user authentication');
        expect(result).toBe('proj-123-add-user-authentication');
      });

      it('converts ticket key to lowercase', () => {
        const result = generateBranchName('PROJ-456', 'Test');
        expect(result.startsWith('proj-456-')).toBe(true);
      });

      it('converts summary to lowercase slug', () => {
        const result = generateBranchName('ABC-1', 'My Feature Title');
        expect(result).toBe('abc-1-my-feature-title');
      });
    });

    describe('special characters handling', () => {
      it('removes special characters from summary', () => {
        const result = generateBranchName('PROJ-1', 'Fix bug! @#()');
        expect(result).toBe('proj-1-fix-bug');
      });

      it('converts currency symbols to words', () => {
        // slugify converts $ to 'dollar', % to 'percent'
        const result = generateBranchName('PROJ-1', 'Cost $100');
        expect(result).toBe('proj-1-cost-dollar100');
      });

      it('handles ampersand in summary', () => {
        const result = generateBranchName('PROJ-1', 'Save & Load data');
        expect(result).toBe('proj-1-save-and-load-data');
      });

      it('handles unicode characters', () => {
        const result = generateBranchName('PROJ-1', 'Café feature');
        expect(result).toBe('proj-1-cafe-feature');
      });

      it('handles emojis in summary', () => {
        const result = generateBranchName('PROJ-1', '🚀 Launch feature');
        expect(result).toBe('proj-1-launch-feature');
      });

      it('replaces multiple spaces with single hyphen', () => {
        const result = generateBranchName('PROJ-1', 'Multiple   spaces   here');
        expect(result).toBe('proj-1-multiple-spaces-here');
      });

      it('handles dots in summary', () => {
        const result = generateBranchName('PROJ-1', 'Fix v2.0 bug');
        expect(result).toBe('proj-1-fix-v20-bug');
      });

      it('handles underscores in summary', () => {
        // slugify with strict:true removes underscores without replacing
        const result = generateBranchName('PROJ-1', 'snake_case_name');
        expect(result).toBe('proj-1-snakecasename');
      });

      it('handles slashes in summary', () => {
        const result = generateBranchName('PROJ-1', 'path/to/feature');
        expect(result).toBe('proj-1-pathtofeature');
      });

      it('handles quotes in summary', () => {
        const result = generateBranchName('PROJ-1', "Don't break \"quotes\"");
        expect(result).toBe('proj-1-dont-break-quotes');
      });
    });

    describe('length limits', () => {
      it('respects 50 character max length', () => {
        const result = generateBranchName(
          'PROJ-123',
          'This is a very long summary that should be truncated to fit within limits'
        );
        expect(result.length).toBeLessThanOrEqual(50);
      });

      it('truncates long summaries while keeping ticket key intact', () => {
        const ticketKey = 'PROJ-123';
        const result = generateBranchName(
          ticketKey,
          'This is an extremely long feature description that exceeds the limit'
        );
        expect(result.startsWith('proj-123-')).toBe(true);
        expect(result.length).toBeLessThanOrEqual(50);
      });

      it('does not end with trailing hyphen after truncation', () => {
        const result = generateBranchName(
          'PROJ-123',
          'This is a very long summary that should be truncated properly'
        );
        expect(result.endsWith('-')).toBe(false);
      });

      it('handles short summaries without truncation', () => {
        const result = generateBranchName('AB-1', 'Short');
        expect(result).toBe('ab-1-short');
      });

      it('handles longer ticket keys', () => {
        const result = generateBranchName(
          'LONGPROJECT-99999',
          'Some feature description here that might be truncated'
        );
        expect(result.startsWith('longproject-99999-')).toBe(true);
        expect(result.length).toBeLessThanOrEqual(50);
      });
    });

    describe('edge cases', () => {
      it('handles empty summary', () => {
        const result = generateBranchName('PROJ-1', '');
        expect(result).toBe('proj-1-');
      });

      it('handles summary with only special characters', () => {
        // Characters like @#^*() are removed, but $ and % become words
        const result = generateBranchName('PROJ-1', '!@#^*()');
        expect(result).toBe('proj-1-');
      });

      it('handles summary with currency symbols only', () => {
        // $ becomes 'dollar', & becomes 'and', % becomes 'percent'
        const result = generateBranchName('PROJ-1', '$%&');
        expect(result).toBe('proj-1-dollarpercentand');
      });

      it('handles summary with only spaces', () => {
        const result = generateBranchName('PROJ-1', '   ');
        expect(result).toBe('proj-1-');
      });

      it('handles single character summary', () => {
        const result = generateBranchName('PROJ-1', 'A');
        expect(result).toBe('proj-1-a');
      });

      it('handles numbers in summary', () => {
        const result = generateBranchName('PROJ-1', 'Version 2 release 3');
        expect(result).toBe('proj-1-version-2-release-3');
      });

      it('handles summary starting with numbers', () => {
        const result = generateBranchName('PROJ-1', '123 steps to success');
        expect(result).toBe('proj-1-123-steps-to-success');
      });

      it('handles hyphenated ticket key', () => {
        const result = generateBranchName('MY-PROJ-123', 'Feature');
        expect(result).toBe('my-proj-123-feature');
      });

      it('handles lowercase ticket key input', () => {
        const result = generateBranchName('proj-123', 'Feature');
        expect(result).toBe('proj-123-feature');
      });

      it('handles mixed case ticket key', () => {
        const result = generateBranchName('Proj-123', 'Feature');
        expect(result).toBe('proj-123-feature');
      });
    });
  });

  describe('isValidBranchName', () => {
    const mockRunGit = vi.mocked(git.runGit);

    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.resetAllMocks();
    });

    it('returns true for valid branch names', () => {
      mockRunGit.mockReturnValue({ stdout: '', stderr: '', success: true });
      expect(isValidBranchName('feature/my-branch')).toBe(true);
      expect(mockRunGit).toHaveBeenCalledWith(['check-ref-format', '--branch', 'feature/my-branch']);
    });

    it('returns true for simple alphanumeric branch names', () => {
      mockRunGit.mockReturnValue({ stdout: '', stderr: '', success: true });
      expect(isValidBranchName('proj-123-add-feature')).toBe(true);
    });

    it('returns false for branch names with invalid characters', () => {
      mockRunGit.mockReturnValue({
        stdout: '',
        stderr: 'fatal: invalid ref format',
        success: false,
      });
      expect(isValidBranchName('branch~name')).toBe(false);
    });

    it('returns false for branch names with spaces', () => {
      mockRunGit.mockReturnValue({
        stdout: '',
        stderr: 'fatal: invalid ref format',
        success: false,
      });
      expect(isValidBranchName('branch name')).toBe(false);
    });

    it('returns false for branch names starting with hyphen', () => {
      mockRunGit.mockReturnValue({
        stdout: '',
        stderr: 'fatal: invalid ref format',
        success: false,
      });
      expect(isValidBranchName('-branch')).toBe(false);
    });

    it('returns false for branch names ending with dot', () => {
      mockRunGit.mockReturnValue({
        stdout: '',
        stderr: 'fatal: invalid ref format',
        success: false,
      });
      expect(isValidBranchName('branch.')).toBe(false);
    });

    it('returns false for branch names with consecutive dots', () => {
      mockRunGit.mockReturnValue({
        stdout: '',
        stderr: 'fatal: invalid ref format',
        success: false,
      });
      expect(isValidBranchName('branch..name')).toBe(false);
    });

    it('returns false for branch names with @{ sequence', () => {
      mockRunGit.mockReturnValue({
        stdout: '',
        stderr: 'fatal: invalid ref format',
        success: false,
      });
      expect(isValidBranchName('branch@{name')).toBe(false);
    });

    it('returns false for single @ as branch name', () => {
      mockRunGit.mockReturnValue({
        stdout: '',
        stderr: 'fatal: invalid ref format',
        success: false,
      });
      expect(isValidBranchName('@')).toBe(false);
    });

    it('returns false for empty string', () => {
      mockRunGit.mockReturnValue({
        stdout: '',
        stderr: 'fatal: invalid ref format',
        success: false,
      });
      expect(isValidBranchName('')).toBe(false);
    });

    it('returns false for branch names with backslash', () => {
      mockRunGit.mockReturnValue({
        stdout: '',
        stderr: 'fatal: invalid ref format',
        success: false,
      });
      expect(isValidBranchName('branch\\name')).toBe(false);
    });

    it('returns true for branch names with forward slash', () => {
      mockRunGit.mockReturnValue({ stdout: '', stderr: '', success: true });
      expect(isValidBranchName('feature/branch-name')).toBe(true);
    });

    it('returns false for branch names ending with .lock', () => {
      mockRunGit.mockReturnValue({
        stdout: '',
        stderr: 'fatal: invalid ref format',
        success: false,
      });
      expect(isValidBranchName('branch.lock')).toBe(false);
    });

    it('calls runGit with correct arguments', () => {
      mockRunGit.mockReturnValue({ stdout: '', stderr: '', success: true });
      isValidBranchName('test-branch');
      expect(mockRunGit).toHaveBeenCalledTimes(1);
      expect(mockRunGit).toHaveBeenCalledWith(['check-ref-format', '--branch', 'test-branch']);
    });
  });
});

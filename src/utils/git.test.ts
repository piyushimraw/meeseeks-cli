import { describe, it, expect } from 'vitest';
import {
  parseStatusCode,
  parseStatusLine,
  type GitFileChange,
} from './git.js';

describe('git utilities', () => {
  describe('parseStatusCode', () => {
    it('parses "A" as added', () => {
      expect(parseStatusCode('A')).toBe('added');
    });

    it('parses "M" as modified', () => {
      expect(parseStatusCode('M')).toBe('modified');
    });

    it('parses "D" as deleted', () => {
      expect(parseStatusCode('D')).toBe('deleted');
    });

    it('parses "R" as renamed', () => {
      expect(parseStatusCode('R')).toBe('renamed');
    });

    it('parses "?" as untracked', () => {
      expect(parseStatusCode('?')).toBe('untracked');
    });

    it('returns modified for unknown codes', () => {
      expect(parseStatusCode('X')).toBe('modified');
      expect(parseStatusCode('U')).toBe('modified');
      expect(parseStatusCode(' ')).toBe('modified');
    });
  });

  describe('parseStatusLine', () => {
    it('parses staged added file', () => {
      const changes = parseStatusLine('A  src/newfile.ts');
      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        path: 'src/newfile.ts',
        status: 'added',
        staged: true,
      });
    });

    it('parses staged modified file', () => {
      const changes = parseStatusLine('M  src/modified.ts');
      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        path: 'src/modified.ts',
        status: 'modified',
        staged: true,
      });
    });

    it('parses staged deleted file', () => {
      const changes = parseStatusLine('D  src/deleted.ts');
      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        path: 'src/deleted.ts',
        status: 'deleted',
        staged: true,
      });
    });

    it('parses unstaged modified file', () => {
      const changes = parseStatusLine(' M src/unstaged.ts');
      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        path: 'src/unstaged.ts',
        status: 'modified',
        staged: false,
      });
    });

    it('parses untracked file', () => {
      const changes = parseStatusLine('?? src/untracked.ts');
      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        path: 'src/untracked.ts',
        status: 'untracked',
        staged: false,
      });
    });

    it('parses file with both staged and unstaged changes', () => {
      const changes = parseStatusLine('MM src/both.ts');
      expect(changes).toHaveLength(2);
      expect(changes[0]).toEqual({
        path: 'src/both.ts',
        status: 'modified',
        staged: true,
      });
      expect(changes[1]).toEqual({
        path: 'src/both.ts',
        status: 'modified',
        staged: false,
      });
    });

    it('parses renamed file with arrow notation', () => {
      const changes = parseStatusLine('R  old/path.ts -> new/path.ts');
      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        path: 'new/path.ts',
        status: 'renamed',
        staged: true,
        oldPath: 'old/path.ts',
      });
    });

    it('parses staged added and unstaged modified (AM)', () => {
      const changes = parseStatusLine('AM src/newfile.ts');
      expect(changes).toHaveLength(2);
      expect(changes[0]).toEqual({
        path: 'src/newfile.ts',
        status: 'added',
        staged: true,
      });
      expect(changes[1]).toEqual({
        path: 'src/newfile.ts',
        status: 'modified',
        staged: false,
      });
    });

    it('handles file paths with spaces', () => {
      const changes = parseStatusLine('A  src/file with spaces.ts');
      expect(changes).toHaveLength(1);
      expect(changes[0].path).toBe('src/file with spaces.ts');
    });
  });
});

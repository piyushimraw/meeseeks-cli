import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  getTargetDir,
  getPrimeSubdir,
  generateIndexMd,
} from './generator.js';

// Tests for pure functions that don't require file system mocking

describe('generator', () => {
  describe('getTargetDir', () => {
    it('returns .roo for roocode extension', () => {
      const result = getTargetDir('/project', 'roocode');

      expect(result).toBe(path.join('/project', '.roo'));
    });

    it('returns .kilocode/workflows for kilocode extension', () => {
      const result = getTargetDir('/project', 'kilocode');

      expect(result).toBe(path.join('/project', '.kilocode/workflows'));
    });

    it('handles project root with trailing slash', () => {
      const result = getTargetDir('/project/', 'roocode');

      // path.join normalizes the path
      expect(result).toContain('.roo');
    });

    it('handles Windows-style paths', () => {
      const result = getTargetDir('C:\\Users\\project', 'roocode');

      expect(result).toContain('.roo');
    });
  });

  describe('getPrimeSubdir', () => {
    it('returns empty string for roocode extension', () => {
      const result = getPrimeSubdir('roocode');

      expect(result).toBe('');
    });

    it('returns "context" for kilocode extension', () => {
      const result = getPrimeSubdir('kilocode');

      expect(result).toBe('context');
    });
  });

  describe('generateIndexMd', () => {
    it('generates index with prime files section', () => {
      const targetDir = '/project/.roo';
      const files = [
        '/project/.roo/ARCHITECTURE.md',
        '/project/.roo/CONVENTION.md',
        '/project/.roo/STACK.md',
      ];

      const result = generateIndexMd(targetDir, files);

      expect(result).toContain('# Meta Prompting Files');
      expect(result).toContain('## Prime Files (Codebase Context)');
      expect(result).toContain('ARCHITECTURE');
      expect(result).toContain('CONVENTION');
      expect(result).toContain('STACK');
    });

    it('generates index with plan files section', () => {
      const targetDir = '/project/.roo';
      const files = [
        '/project/.roo/ARCHITECTURE.md',
        '/project/.roo/plans/eng-123-impl.md',
        '/project/.roo/plans/feature-x-impl.md',
      ];

      const result = generateIndexMd(targetDir, files);

      expect(result).toContain('## Plans');
      expect(result).toContain('eng-123-impl.md');
      expect(result).toContain('feature-x-impl.md');
    });

    it('omits plans section when no plan files', () => {
      const targetDir = '/project/.roo';
      const files = ['/project/.roo/ARCHITECTURE.md'];

      const result = generateIndexMd(targetDir, files);

      expect(result).not.toContain('## Plans');
    });

    it('handles empty file list', () => {
      const targetDir = '/project/.roo';
      const files: string[] = [];

      const result = generateIndexMd(targetDir, files);

      expect(result).toContain('# Meta Prompting Files');
      expect(result).toContain('## Prime Files (Codebase Context)');
      // Empty prime files section
      expect(result).toContain('*Run `/prime` to regenerate');
    });

    it('includes regeneration instructions', () => {
      const targetDir = '/project/.roo';
      const files: string[] = [];

      const result = generateIndexMd(targetDir, files);

      expect(result).toContain('Run `/prime` to regenerate codebase context files');
    });

    it('identifies INTEGRATION.md as prime file', () => {
      const targetDir = '/project/.roo';
      const files = ['/project/.roo/INTEGRATION.md'];

      const result = generateIndexMd(targetDir, files);

      expect(result).toContain('INTEGRATION');
      // Should be in prime files section, not commands
      expect(result).toContain('## Prime Files');
    });

    it('identifies STRUCTURE.md as prime file', () => {
      const targetDir = '/project/.roo';
      const files = ['/project/.roo/STRUCTURE.md'];

      const result = generateIndexMd(targetDir, files);

      expect(result).toContain('STRUCTURE');
    });
  });

  // Tests that require file system mocking
  describe('File system dependent functions', () => {
    describe.skip('ensureTargetDir - requires fs mocking', () => {
      it('creates directory if not exists', () => {});
      it('does nothing if directory exists', () => {});
    });

    describe.skip('checkExistingFile - requires fs mocking', () => {
      it('returns exists:true with content for existing file', () => {});
      it('returns exists:false for non-existent file', () => {});
    });

    describe.skip('writeFile - requires fs mocking', () => {
      it('writes content to file', () => {});
      it('creates parent directories if needed', () => {});
    });

    describe.skip('generateFile - requires fs mocking', () => {
      it('creates new file when not exists', () => {});
      it('updates existing file with overwrite choice', () => {});
      it('skips with skip choice', () => {});
      it('returns error status on write failure', () => {});
    });

    describe.skip('loadPrimeMetadata - requires fs mocking', () => {
      it('loads and parses .prime-meta.json', () => {});
      it('returns null if file not exists', () => {});
      it('returns null on parse error', () => {});
    });

    describe.skip('savePrimeMetadata - requires fs mocking', () => {
      it('saves metadata to .prime-meta.json', () => {});
    });

    describe.skip('listGeneratedFiles - requires fs mocking', () => {
      it('returns list of .md files recursively', () => {});
      it('returns empty array for non-existent directory', () => {});
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAffectedPrimeFiles } from './changeDetector.js';
import type { PrimeFile } from './types.js';

// Note: Functions that use simple-git (getCurrentCommit, getChangedFilesSince, detectChanges)
// are integration-tested with actual git operations and are skipped here.
// This file focuses on testing the pure logic functions.

describe('changeDetector', () => {
  describe('getAffectedPrimeFiles', () => {
    it('returns all prime files when no specific files matched but changes exist', () => {
      const changedFiles = ['README.md', 'docs/guide.md'];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('ARCHITECTURE');
      expect(result).toContain('CONVENTION');
      expect(result).toContain('INTEGRATION');
      expect(result).toContain('STACK');
      expect(result).toContain('STRUCTURE');
    });

    it('returns empty array when no changes', () => {
      const changedFiles: string[] = [];

      const result = getAffectedPrimeFiles(changedFiles);

      // With no changes, should still return all prime files per implementation
      // Actually looking at the code - if changedFiles.length === 0 and affectedSet.size === 0
      // then it returns all prime files. Let me re-check the implementation.
      // Wait - if changedFiles is empty, the loop doesn't run, affectedSet is empty,
      // and then the condition `affectedSet.size === 0 && changedFiles.length > 0` is false
      // so it returns empty array from affectedSet
      expect(result).toEqual([]);
    });

    it('detects STACK and INTEGRATION from package.json changes', () => {
      const changedFiles = ['package.json'];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('STACK');
      expect(result).toContain('INTEGRATION');
    });

    it('detects STACK and INTEGRATION from requirements.txt changes', () => {
      const changedFiles = ['requirements.txt'];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('STACK');
      expect(result).toContain('INTEGRATION');
    });

    it('detects STACK and INTEGRATION from pyproject.toml changes', () => {
      const changedFiles = ['pyproject.toml'];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('STACK');
      expect(result).toContain('INTEGRATION');
    });

    it('detects STACK and INTEGRATION from Cargo.toml changes', () => {
      const changedFiles = ['Cargo.toml'];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('STACK');
      expect(result).toContain('INTEGRATION');
    });

    it('detects STACK and INTEGRATION from go.mod changes', () => {
      const changedFiles = ['go.mod'];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('STACK');
      expect(result).toContain('INTEGRATION');
    });

    it('detects INTEGRATION from .env changes', () => {
      const changedFiles = ['.env', '.env.local'];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('INTEGRATION');
    });

    it('detects INTEGRATION from config file changes', () => {
      const changedFiles = ['config/database.ts', 'src/config.js'];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('INTEGRATION');
    });

    it('detects INTEGRATION from YAML file changes', () => {
      const changedFiles = ['docker-compose.yml', 'ci.yaml'];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('INTEGRATION');
    });

    it('detects INTEGRATION from Docker file changes', () => {
      const changedFiles = ['Dockerfile', 'docker/app.dockerfile'];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('INTEGRATION');
    });

    it('detects ARCHITECTURE, CONVENTION, STRUCTURE from TypeScript file changes', () => {
      const changedFiles = ['src/utils/helper.ts', 'src/components/Button.tsx'];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('ARCHITECTURE');
      expect(result).toContain('CONVENTION');
      expect(result).toContain('STRUCTURE');
    });

    it('detects ARCHITECTURE, CONVENTION, STRUCTURE from JavaScript file changes', () => {
      const changedFiles = ['src/index.js', 'components/Card.jsx'];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('ARCHITECTURE');
      expect(result).toContain('CONVENTION');
      expect(result).toContain('STRUCTURE');
    });

    it('detects ARCHITECTURE, CONVENTION, STRUCTURE from Python file changes', () => {
      const changedFiles = ['app/main.py', 'tests/test_main.py'];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('ARCHITECTURE');
      expect(result).toContain('CONVENTION');
      expect(result).toContain('STRUCTURE');
    });

    it('detects ARCHITECTURE, CONVENTION, STRUCTURE from Rust file changes', () => {
      const changedFiles = ['src/main.rs', 'src/lib.rs'];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('ARCHITECTURE');
      expect(result).toContain('CONVENTION');
      expect(result).toContain('STRUCTURE');
    });

    it('detects ARCHITECTURE, CONVENTION, STRUCTURE from Go file changes', () => {
      const changedFiles = ['main.go', 'internal/handler/api.go'];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('ARCHITECTURE');
      expect(result).toContain('CONVENTION');
      expect(result).toContain('STRUCTURE');
    });

    it('detects CONVENTION from test file changes with .test. pattern', () => {
      const changedFiles = ['src/utils/helper.test.ts'];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('CONVENTION');
    });

    it('detects CONVENTION from test file changes with .spec. pattern', () => {
      const changedFiles = ['src/components/Button.spec.tsx'];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('CONVENTION');
    });

    it('detects CONVENTION from test file changes with _test. pattern', () => {
      const changedFiles = ['main_test.go'];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('CONVENTION');
    });

    it('detects CONVENTION from files in /tests/ directory', () => {
      const changedFiles = ['tests/integration/api.test.ts'];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('CONVENTION');
    });

    it('detects CONVENTION from files in /test/ directory', () => {
      const changedFiles = ['test/unit/helper.js'];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('CONVENTION');
    });

    it('handles mixed file types correctly', () => {
      const changedFiles = [
        'package.json', // STACK, INTEGRATION
        'src/app.ts', // ARCHITECTURE, CONVENTION, STRUCTURE
        '.env', // INTEGRATION
        'tests/app.test.ts', // CONVENTION + source code effects
      ];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('STACK');
      expect(result).toContain('INTEGRATION');
      expect(result).toContain('ARCHITECTURE');
      expect(result).toContain('CONVENTION');
      expect(result).toContain('STRUCTURE');
    });

    it('does not duplicate prime file names', () => {
      const changedFiles = [
        'src/app.ts',
        'src/utils/helper.ts',
        'src/components/Button.tsx',
      ];

      const result = getAffectedPrimeFiles(changedFiles);

      // Count occurrences of each
      const architectureCount = result.filter((f) => f === 'ARCHITECTURE').length;
      const conventionCount = result.filter((f) => f === 'CONVENTION').length;

      expect(architectureCount).toBe(1);
      expect(conventionCount).toBe(1);
    });

    it('is case-insensitive for file patterns', () => {
      const changedFiles = [
        'PACKAGE.JSON',
        'SRC/APP.TS',
        '.ENV',
      ];

      const result = getAffectedPrimeFiles(changedFiles);

      expect(result).toContain('STACK');
      expect(result).toContain('INTEGRATION');
      expect(result).toContain('ARCHITECTURE');
    });

    it('handles paths with Windows-style separators', () => {
      const changedFiles = [
        'src\\utils\\helper.ts',
        'tests\\unit\\helper.test.ts',
      ];

      const result = getAffectedPrimeFiles(changedFiles);

      // The function uses includes() which works with any path style
      expect(result).toContain('ARCHITECTURE');
      expect(result).toContain('CONVENTION');
    });
  });

  // Integration tests that require actual git operations are skipped
  describe.skip('Git-dependent functions (require actual git repo)', () => {
    it('getCurrentCommit - requires git repository', () => {});
    it('getChangedFilesSince - requires git history', () => {});
    it('detectChanges - requires git operations', () => {});
  });
});

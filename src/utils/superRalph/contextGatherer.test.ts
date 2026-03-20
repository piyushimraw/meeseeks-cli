import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  gatherCodebaseStructure,
  gatherProjectDocs,
  buildContextPrompt,
} from './contextGatherer.js';

describe('contextGatherer', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-ctx-'));
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Test Project');
    fs.mkdirSync(path.join(tmpDir, 'src'), {recursive: true});
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.ts'), 'export const main = () => {};');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  describe('gatherCodebaseStructure', () => {
    it('should return a string describing the project structure', () => {
      const structure = gatherCodebaseStructure(tmpDir);
      expect(structure).toContain('src');
      expect(structure).toContain('README.md');
    });
  });

  describe('gatherProjectDocs', () => {
    it('should read README.md when present', () => {
      const docs = gatherProjectDocs(tmpDir);
      expect(docs).toContain('# Test Project');
    });

    it('should handle missing docs gracefully', () => {
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-empty-'));
      const docs = gatherProjectDocs(emptyDir);
      expect(docs).toBe('');
      fs.rmSync(emptyDir, {recursive: true, force: true});
    });

    it('should read CLAUDE.md when present', () => {
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Claude Instructions');
      const docs = gatherProjectDocs(tmpDir);
      expect(docs).toContain('# Claude Instructions');
    });
  });

  describe('buildContextPrompt', () => {
    it('should combine all context into a single prompt string', () => {
      const prompt = buildContextPrompt({
        codebaseStructure: 'src/\n  index.ts',
        gitHistory: 'abc123 Initial commit',
        projectDocs: '# README',
      });
      expect(prompt).toContain('## Codebase Structure');
      expect(prompt).toContain('src/');
      expect(prompt).toContain('## Git History');
      expect(prompt).toContain('## Project Documentation');
    });

    it('should include figma context when provided', () => {
      const prompt = buildContextPrompt({
        codebaseStructure: '',
        gitHistory: '',
        projectDocs: '',
        figmaContext: 'Figma design has 3 components',
      });
      expect(prompt).toContain('## Figma Design Context');
    });

    it('should omit figma section when not provided', () => {
      const prompt = buildContextPrompt({
        codebaseStructure: '',
        gitHistory: '',
        projectDocs: '',
      });
      expect(prompt).not.toContain('## Figma Design Context');
    });
  });
});

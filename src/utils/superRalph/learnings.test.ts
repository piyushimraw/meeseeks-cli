import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {saveLearnings, loadLearnings, buildLearningsPrompt} from './learnings.js';
import type {PhaseLearnings} from '../../types/superRalph.js';

describe('learnings', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-learn-'));
    fs.mkdirSync(path.join(tmpDir, 'learnings'), {recursive: true});
  });

  afterEach(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  const sampleLearnings: PhaseLearnings = {
    phase: 1,
    title: 'Layout',
    patternsDiscovered: ['CSS Grid works well for 2D layouts'],
    mistakesAvoided: ['Tried Flexbox first, Grid was better'],
    conventionsEstablished: ['Use --sr-* prefix for design tokens'],
  };

  describe('saveLearnings', () => {
    it('should write learnings JSON to session dir', () => {
      saveLearnings(tmpDir, sampleLearnings);
      const filePath = path.join(tmpDir, 'learnings', 'phase-1-learnings.json');
      expect(fs.existsSync(filePath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(content.phase).toBe(1);
    });
  });

  describe('loadLearnings', () => {
    it('should load learnings for a phase', () => {
      saveLearnings(tmpDir, sampleLearnings);
      const loaded = loadLearnings(tmpDir, 1);
      expect(loaded).toEqual(sampleLearnings);
    });

    it('should return null for non-existent phase', () => {
      const loaded = loadLearnings(tmpDir, 99);
      expect(loaded).toBeNull();
    });
  });

  describe('buildLearningsPrompt', () => {
    it('should generate a prompt asking LLM to extract learnings', () => {
      const prompt = buildLearningsPrompt(1, 'Layout', 'iteration output logs here');
      expect(prompt).toContain('Phase 1');
      expect(prompt).toContain('Layout');
      expect(prompt).toContain('JSON');
    });
  });
});

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  buildIterationPrompt,
  loadProgress,
  saveProgress,
  createInitialProgress,
  shouldPauseLoop,
  updateProgressFromOutput,
} from './executor.js';
import type {SuperRalphPlan, ExecutionProgress} from '../../types/superRalph.js';

describe('executor', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-exec-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  const samplePlan: SuperRalphPlan = {
    phase: 1,
    title: 'Layout',
    tasks: [
      {id: 'task-001', title: 'Create layout', description: 'Build grid', acceptanceCriteria: ['Works'], dependencies: [], passes: false},
      {id: 'task-002', title: 'Add tokens', description: 'Tokens', acceptanceCriteria: ['Matches'], dependencies: ['task-001'], passes: false},
    ],
    feedbackLoops: ['typecheck', 'test'],
    riskLevel: 'low',
  };

  describe('createInitialProgress', () => {
    it('should create progress with all tasks remaining', () => {
      const progress = createInitialProgress(samplePlan, 10);
      expect(progress.phase).toBe(1);
      expect(progress.iteration).toBe(0);
      expect(progress.maxIterations).toBe(10);
      expect(progress.tasksCompleted).toEqual([]);
      expect(progress.tasksRemaining).toEqual(['task-001', 'task-002']);
      expect(progress.currentTask).toBeNull();
      expect(progress.failures).toEqual([]);
    });
  });

  describe('saveProgress / loadProgress', () => {
    it('should round-trip progress to disk', () => {
      const progress = createInitialProgress(samplePlan, 10);
      saveProgress(tmpDir, 1, progress);
      const loaded = loadProgress(tmpDir, 1);
      expect(loaded).toEqual(progress);
    });

    it('should return null when no progress file exists', () => {
      const loaded = loadProgress(tmpDir, 99);
      expect(loaded).toBeNull();
    });
  });

  describe('buildIterationPrompt', () => {
    it('should include the phase prompt and progress', () => {
      const progress = createInitialProgress(samplePlan, 10);
      const phasePrompt = '# Phase 1: Layout\n\nDo stuff.';
      const prompt = buildIterationPrompt(phasePrompt, progress);
      expect(prompt).toContain('Phase 1: Layout');
      expect(prompt).toContain('Iteration: 1 of 10');
    });

    it('should include completed tasks in progress section', () => {
      const progress = createInitialProgress(samplePlan, 10);
      progress.tasksCompleted = ['task-001'];
      progress.tasksRemaining = ['task-002'];
      const prompt = buildIterationPrompt('prompt', progress);
      expect(prompt).toContain('task-001');
    });

    it('should include failure context for self-heal', () => {
      const progress = createInitialProgress(samplePlan, 10);
      progress.failures = [{
        taskId: 'task-001',
        iteration: 1,
        error: 'TypeError: undefined is not a function',
        timestamp: new Date().toISOString(),
      }];
      const prompt = buildIterationPrompt('prompt', progress);
      expect(prompt).toContain('TypeError');
    });
  });

  describe('shouldPauseLoop', () => {
    it('should return false when no failures', () => {
      const progress = createInitialProgress(samplePlan, 10);
      expect(shouldPauseLoop(progress, 2)).toBe(false);
    });

    it('should return false after first failure on a task', () => {
      const progress = createInitialProgress(samplePlan, 10);
      progress.failures = [{taskId: 'task-001', iteration: 1, error: 'fail', timestamp: ''}];
      expect(shouldPauseLoop(progress, 2)).toBe(false);
    });

    it('should return true when same task fails N times', () => {
      const progress = createInitialProgress(samplePlan, 10);
      progress.failures = [
        {taskId: 'task-001', iteration: 1, error: 'fail', timestamp: ''},
        {taskId: 'task-001', iteration: 2, error: 'fail again', timestamp: ''},
      ];
      expect(shouldPauseLoop(progress, 2)).toBe(true);
    });

    it('should return true when max iterations reached', () => {
      const progress = createInitialProgress(samplePlan, 3);
      progress.iteration = 3;
      expect(shouldPauseLoop(progress, 2)).toBe(true);
    });
  });
});

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  buildPlanGenerationPrompt,
  parsePlan,
  generatePromptFile,
  savePlan,
} from './planGenerator.js';
import type {BrainstormOutput, SuperRalphPlan, PhaseLearnings} from '../../types/superRalph.js';

describe('planGenerator', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-plan-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  const sampleBrainstorm: BrainstormOutput = {
    phase: 1,
    title: 'Layout Component',
    decisions: ['Use CSS Grid'],
    constraints: ['Must be responsive'],
    acceptanceCriteria: ['Renders at 768px breakpoint'],
    dependencies: [],
    contextSources: ['src/components/'],
  };

  describe('buildPlanGenerationPrompt', () => {
    it('should include brainstorm decisions', () => {
      const prompt = buildPlanGenerationPrompt(sampleBrainstorm, 'project context');
      expect(prompt).toContain('Use CSS Grid');
    });

    it('should include acceptance criteria', () => {
      const prompt = buildPlanGenerationPrompt(sampleBrainstorm, 'ctx');
      expect(prompt).toContain('Renders at 768px breakpoint');
    });

    it('should include learnings when provided', () => {
      const learnings: PhaseLearnings = {
        phase: 0,
        title: 'Setup',
        patternsDiscovered: ['Use Ink Box for layout'],
        mistakesAvoided: [],
        conventionsEstablished: [],
      };
      const prompt = buildPlanGenerationPrompt(sampleBrainstorm, 'ctx', learnings);
      expect(prompt).toContain('Use Ink Box for layout');
    });

    it('should request JSON response format', () => {
      const prompt = buildPlanGenerationPrompt(sampleBrainstorm, 'ctx');
      expect(prompt).toContain('JSON');
    });
  });

  describe('parsePlan', () => {
    it('should parse valid plan JSON from LLM output', () => {
      const llmOutput = '```json\n' + JSON.stringify({
        phase: 1,
        title: 'Layout',
        tasks: [{
          id: 'task-001',
          title: 'Create component',
          description: 'Build it',
          acceptanceCriteria: ['Works'],
          dependencies: [],
          passes: false,
        }],
        feedbackLoops: ['typecheck'],
        riskLevel: 'low',
      }) + '\n```';

      const plan = parsePlan(llmOutput);
      expect(plan.tasks).toHaveLength(1);
      expect(plan.tasks[0].passes).toBe(false);
    });

    it('should throw on invalid JSON', () => {
      expect(() => parsePlan('not json')).toThrow();
    });
  });

  describe('generatePromptFile', () => {
    it('should generate markdown prompt with task list', () => {
      const plan: SuperRalphPlan = {
        phase: 1,
        title: 'Layout',
        tasks: [
          {id: 'task-001', title: 'Create layout', description: 'Build grid layout', acceptanceCriteria: ['Renders'], dependencies: [], passes: false},
          {id: 'task-002', title: 'Add tokens', description: 'Design tokens', acceptanceCriteria: ['Matches Figma'], dependencies: ['task-001'], passes: false},
        ],
        feedbackLoops: ['typecheck', 'test'],
        riskLevel: 'low',
      };

      const prompt = generatePromptFile(plan, sampleBrainstorm);
      expect(prompt).toContain('task-001');
      expect(prompt).toContain('task-002');
      expect(prompt).toContain('typecheck');
      expect(prompt).toContain('Use CSS Grid');
    });
  });

  describe('savePlan', () => {
    it('should write plan.json and prompt.md to tasks dir', () => {
      const plan: SuperRalphPlan = {
        phase: 1,
        title: 'Layout',
        tasks: [],
        feedbackLoops: [],
        riskLevel: 'low',
      };

      fs.mkdirSync(tmpDir, {recursive: true});
      savePlan(tmpDir, 1, plan, '# Prompt content');

      expect(fs.existsSync(path.join(tmpDir, 'phase-1-plan.json'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'phase-1-prompt.md'))).toBe(true);
    });
  });
});

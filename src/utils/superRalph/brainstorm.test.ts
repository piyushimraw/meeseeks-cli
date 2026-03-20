import {describe, it, expect} from 'vitest';
import {
  getTemplateQuestions,
  buildScopeAssessmentPrompt,
  buildFollowUpPrompt,
  buildBrainstormOutput,
  parseScopeAssessment,
} from './brainstorm.js';
import type {BrainstormQuestion, BrainstormOutput, ScopeAssessment} from '../../types/superRalph.js';

describe('brainstorm', () => {
  describe('getTemplateQuestions', () => {
    it('should return 4 standard template questions', () => {
      const questions = getTemplateQuestions();
      expect(questions).toHaveLength(4);
      expect(questions.every(q => q.type === 'template')).toBe(true);
    });

    it('should include functional requirements question', () => {
      const questions = getTemplateQuestions();
      expect(questions[0].question).toContain('should this do');
    });

    it('should include constraints question', () => {
      const questions = getTemplateQuestions();
      expect(questions[1].question).toContain('constraint');
    });

    it('should include acceptance criteria question', () => {
      const questions = getTemplateQuestions();
      expect(questions[2].question).toContain('success');
    });

    it('should include dependencies question', () => {
      const questions = getTemplateQuestions();
      expect(questions[3].question).toContain('dependenc');
    });
  });

  describe('buildScopeAssessmentPrompt', () => {
    it('should include the task description', () => {
      const prompt = buildScopeAssessmentPrompt('Build a dashboard', 'context here');
      expect(prompt).toContain('Build a dashboard');
    });

    it('should include the context', () => {
      const prompt = buildScopeAssessmentPrompt('Build a dashboard', 'project uses React');
      expect(prompt).toContain('project uses React');
    });

    it('should ask for JSON response', () => {
      const prompt = buildScopeAssessmentPrompt('task', 'ctx');
      expect(prompt).toContain('JSON');
    });
  });

  describe('parseScopeAssessment', () => {
    it('should parse valid JSON from LLM output', () => {
      const llmOutput = '```json\n{"isMultiPhase":true,"reasoning":"Too big","proposedPhases":[{"title":"Phase 1","description":"Layout"}]}\n```';
      const result = parseScopeAssessment(llmOutput);
      expect(result.isMultiPhase).toBe(true);
      expect(result.proposedPhases).toHaveLength(1);
    });

    it('should handle raw JSON without code fences', () => {
      const llmOutput = '{"isMultiPhase":false,"reasoning":"Small task","proposedPhases":[{"title":"Single Phase","description":"Everything"}]}';
      const result = parseScopeAssessment(llmOutput);
      expect(result.isMultiPhase).toBe(false);
    });

    it('should throw on invalid JSON', () => {
      expect(() => parseScopeAssessment('not json at all')).toThrow();
    });
  });

  describe('buildFollowUpPrompt', () => {
    it('should include previous Q&A context', () => {
      const answered: BrainstormQuestion[] = [
        {id: 'q1', question: 'What should it do?', type: 'template', answer: 'Show charts'},
      ];
      const prompt = buildFollowUpPrompt('Build dashboard', answered);
      expect(prompt).toContain('What should it do?');
      expect(prompt).toContain('Show charts');
    });

    it('should ask for a single follow-up question', () => {
      const prompt = buildFollowUpPrompt('task', []);
      expect(prompt).toContain('one follow-up question');
    });
  });

  describe('buildBrainstormOutput', () => {
    it('should create structured output from answered questions', () => {
      const questions: BrainstormQuestion[] = [
        {id: 'q1', question: 'What should it do?', type: 'template', answer: 'Show user analytics'},
        {id: 'q2', question: 'Constraints?', type: 'template', answer: 'Must use React, responsive'},
        {id: 'q3', question: 'Success criteria?', type: 'template', answer: 'Charts render under 2s'},
        {id: 'q4', question: 'Dependencies?', type: 'template', answer: 'None'},
      ];

      const output = buildBrainstormOutput(1, 'Dashboard', questions, ['src/components/']);
      expect(output.phase).toBe(1);
      expect(output.title).toBe('Dashboard');
      expect(output.contextSources).toEqual(['src/components/']);
    });
  });
});

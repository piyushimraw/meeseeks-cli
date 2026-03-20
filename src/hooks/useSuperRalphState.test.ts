import {describe, it, expect} from 'vitest';
import {
  createInitialState,
  transitionToScoping,
  transitionToBrainstorming,
  transitionToPlanning,
  transitionToExecuting,
  transitionToPaused,
  transitionToCompleted,
  addQuestionAnswer,
  confirmPhaseBreakdown,
  type SuperRalphScreenState,
} from './useSuperRalphState.js';

describe('useSuperRalphState', () => {
  describe('createInitialState', () => {
    it('should create state in idle step', () => {
      const state = createInitialState();
      expect(state.step).toBe('idle');
      expect(state.sessionId).toBeNull();
      expect(state.taskDescription).toBe('');
    });
  });

  describe('transitionToScoping', () => {
    it('should move to scoping with task description', () => {
      const state = createInitialState();
      const next = transitionToScoping(state, 'Build a dashboard');
      expect(next.step).toBe('scoping');
      expect(next.taskDescription).toBe('Build a dashboard');
    });
  });

  describe('transitionToBrainstorming', () => {
    it('should move to brainstorming with session id', () => {
      const state = {...createInitialState(), step: 'scoping' as const, taskDescription: 'task'};
      const next = transitionToBrainstorming(state, 'session-123');
      expect(next.step).toBe('brainstorming');
      expect(next.sessionId).toBe('session-123');
    });
  });

  describe('addQuestionAnswer', () => {
    it('should add answer to current question', () => {
      const state: SuperRalphScreenState = {
        ...createInitialState(),
        step: 'brainstorming',
        currentQuestionIndex: 0,
        questions: [{id: 'q1', question: 'What?', type: 'template'}],
      };
      const next = addQuestionAnswer(state, 'Build charts');
      expect(next.questions[0].answer).toBe('Build charts');
      expect(next.currentQuestionIndex).toBe(1);
    });
  });

  describe('confirmPhaseBreakdown', () => {
    it('should store confirmed phases', () => {
      const state: SuperRalphScreenState = {
        ...createInitialState(),
        step: 'scoping',
      };
      const phases = [
        {title: 'Layout', description: 'Build layout'},
        {title: 'Components', description: 'Build components'},
      ];
      const next = confirmPhaseBreakdown(state, phases);
      expect(next.confirmedPhases).toEqual(phases);
    });
  });

  describe('transitionToExecuting', () => {
    it('should set step to executing', () => {
      const state = {...createInitialState(), step: 'planning' as const};
      const next = transitionToExecuting(state);
      expect(next.step).toBe('executing');
    });
  });

  describe('transitionToPaused', () => {
    it('should set step to paused with reason', () => {
      const state = {...createInitialState(), step: 'executing' as const};
      const next = transitionToPaused(state, 'Task failed twice');
      expect(next.step).toBe('paused');
      expect(next.pauseReason).toBe('Task failed twice');
    });
  });

  describe('transitionToCompleted', () => {
    it('should set step to completed', () => {
      const state = {...createInitialState(), step: 'executing' as const};
      const next = transitionToCompleted(state);
      expect(next.step).toBe('completed');
    });
  });
});

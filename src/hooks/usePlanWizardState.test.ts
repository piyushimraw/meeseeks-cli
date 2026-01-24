import { describe, it, expect, beforeEach } from 'vitest';
import type { JiraTicket, KnowledgeBase, ClarifyingQuestion } from '../types/index.js';
import {
  createInitialState,
  parseQuestionsFromResponse,
  formatAnswers,
  transitionToSelectKB,
  transitionToConfirmTicket,
  transitionToInitialResearch,
  transitionToError,
  transitionToResearchSummary,
  transitionToGeneratingImpl,
  transitionToReviewImpl,
  transitionToGeneratingVerify,
  transitionToComplete,
  setSelectedKB,
  setKBResults,
  setClarifyingQuestions,
  enterCustomInputMode,
  exitCustomInputMode,
  updateCustomInput,
  submitCustomAnswer,
  selectOptionAndAdvance,
  navigateOption,
  selectOptionByNumber,
  resetToRetry,
  enableRegenerate,
  getCurrentStepIndex,
  handleCustomInputKeypress,
  handleStepInput,
  type PlanWizardState,
  type PlanWizardStep,
} from './usePlanWizardState.js';

// Test fixtures
const createMockTicket = (): JiraTicket => ({
  id: '10001',
  key: 'PROJ-123',
  summary: 'Implement feature X',
  status: 'In Progress',
  priority: 'High',
  storyPoints: 5,
});

const createMockKB = (): KnowledgeBase => ({
  id: 'kb-1',
  name: 'Test Knowledge Base',
  createdAt: new Date().toISOString(),
  sources: [],
  crawlDepth: 2,
  totalPages: 100,
});

const createMockQuestions = (): ClarifyingQuestion[] => [
  {
    id: 'q0',
    question: 'What authentication method?',
    options: ['JWT', 'OAuth', 'Session', 'Other'],
    allowOther: true,
  },
  {
    id: 'q1',
    question: 'Which database?',
    options: ['PostgreSQL', 'MongoDB', 'Other'],
    allowOther: true,
  },
];

describe('usePlanWizardState', () => {
  describe('createInitialState', () => {
    it('creates initial state with correct defaults', () => {
      const ticket = createMockTicket();
      const state = createInitialState(ticket);

      expect(state.step).toBe('confirm-ticket');
      expect(state.ticket).toBe(ticket);
      expect(state.selectedKB).toBeNull();
      expect(state.kbResults).toEqual([]);
      expect(state.kbContext).toBe('');
      expect(state.questions).toEqual([]);
      expect(state.currentQuestionIndex).toBe(0);
      expect(state.answers).toBeInstanceOf(Map);
      expect(state.answers.size).toBe(0);
      expect(state.selectedOptionIndex).toBe(0);
      expect(state.isEnteringCustom).toBe(false);
      expect(state.customInput).toBe('');
      expect(state.implPlan).toBeNull();
      expect(state.verifyPlan).toBeNull();
      expect(state.savedImplPath).toBeNull();
      expect(state.savedVerifyPath).toBeNull();
      expect(state.canRegenerate).toBe(false);
      expect(state.error).toBeUndefined();
    });
  });

  describe('parseQuestionsFromResponse', () => {
    it('parses valid question format', () => {
      const response = `
Some intro text
QUESTION: What authentication method? | OPTIONS: JWT, OAuth, Session, Other
QUESTION: Which database? | OPTIONS: PostgreSQL, MongoDB, Other
More text here
`;
      const questions = parseQuestionsFromResponse(response);

      expect(questions).toHaveLength(2);
      expect(questions[0].id).toBe('q0');
      expect(questions[0].question).toBe('What authentication method?');
      expect(questions[0].options).toEqual(['JWT', 'OAuth', 'Session', 'Other']);
      expect(questions[0].allowOther).toBe(true);
      expect(questions[1].id).toBe('q1');
      expect(questions[1].question).toBe('Which database?');
    });

    it('handles empty response', () => {
      const questions = parseQuestionsFromResponse('');
      expect(questions).toEqual([]);
    });

    it('handles response without questions', () => {
      const questions = parseQuestionsFromResponse('Just some random text without questions.');
      expect(questions).toEqual([]);
    });

    it('ignores malformed lines', () => {
      const response = `
QUESTION: Valid question | OPTIONS: A, B, C
QUESTION: Invalid without options
QUESTION: Another valid | OPTIONS: X, Y
`;
      const questions = parseQuestionsFromResponse(response);

      expect(questions).toHaveLength(2);
      expect(questions[0].question).toBe('Valid question');
      expect(questions[1].question).toBe('Another valid');
    });
  });

  describe('formatAnswers', () => {
    it('formats answers with questions', () => {
      const questions = createMockQuestions();
      const answers = new Map<string, string>();
      answers.set('q0', 'JWT');
      answers.set('q1', 'PostgreSQL');

      const formatted = formatAnswers(answers, questions);

      expect(formatted).toBe('- What authentication method?: JWT\n- Which database?: PostgreSQL');
    });

    it('handles empty answers', () => {
      const questions = createMockQuestions();
      const answers = new Map<string, string>();

      const formatted = formatAnswers(answers, questions);

      expect(formatted).toBe('');
    });

    it('skips answers without matching questions', () => {
      const questions = createMockQuestions();
      const answers = new Map<string, string>();
      answers.set('q0', 'JWT');
      answers.set('q999', 'Unknown'); // No matching question

      const formatted = formatAnswers(answers, questions);

      expect(formatted).toBe('- What authentication method?: JWT');
    });
  });

  describe('Step transitions', () => {
    let initialState: PlanWizardState;

    beforeEach(() => {
      initialState = createInitialState(createMockTicket());
    });

    it('transitionToSelectKB changes step', () => {
      const newState = transitionToSelectKB(initialState);
      expect(newState.step).toBe('select-kb');
    });

    it('transitionToConfirmTicket changes step', () => {
      initialState.step = 'select-kb';
      const newState = transitionToConfirmTicket(initialState);
      expect(newState.step).toBe('confirm-ticket');
    });

    it('transitionToInitialResearch changes step', () => {
      const newState = transitionToInitialResearch(initialState);
      expect(newState.step).toBe('initial-research');
    });

    it('transitionToError sets error and step', () => {
      const newState = transitionToError(initialState, 'Test error message');
      expect(newState.step).toBe('error');
      expect(newState.error).toBe('Test error message');
    });

    it('transitionToResearchSummary changes step', () => {
      const newState = transitionToResearchSummary(initialState);
      expect(newState.step).toBe('research-summary');
    });

    it('transitionToGeneratingImpl changes step', () => {
      const newState = transitionToGeneratingImpl(initialState);
      expect(newState.step).toBe('generating-impl');
    });

    it('transitionToReviewImpl sets plan and changes step', () => {
      const newState = transitionToReviewImpl(initialState, 'Implementation plan content');
      expect(newState.step).toBe('review-impl');
      expect(newState.implPlan).toBe('Implementation plan content');
      expect(newState.canRegenerate).toBe(false);
    });

    it('transitionToGeneratingVerify changes step', () => {
      const newState = transitionToGeneratingVerify(initialState);
      expect(newState.step).toBe('generating-verify');
    });

    it('transitionToComplete sets all completion data', () => {
      const newState = transitionToComplete(
        initialState,
        'Verify plan content',
        '/path/to/impl.md',
        '/path/to/verify.md'
      );
      expect(newState.step).toBe('complete');
      expect(newState.verifyPlan).toBe('Verify plan content');
      expect(newState.savedImplPath).toBe('/path/to/impl.md');
      expect(newState.savedVerifyPath).toBe('/path/to/verify.md');
    });

    it('resetToRetry clears error and goes to confirm-ticket', () => {
      initialState.step = 'error';
      initialState.error = 'Some error';
      const newState = resetToRetry(initialState);
      expect(newState.step).toBe('confirm-ticket');
      expect(newState.error).toBeUndefined();
    });

    it('enableRegenerate sets canRegenerate flag', () => {
      const newState = enableRegenerate(initialState);
      expect(newState.canRegenerate).toBe(true);
    });
  });

  describe('KB selection', () => {
    it('setSelectedKB sets the knowledge base', () => {
      const state = createInitialState(createMockTicket());
      const kb = createMockKB();

      const newState = setSelectedKB(state, kb);

      expect(newState.selectedKB).toBe(kb);
    });

    it('setSelectedKB can set to null', () => {
      const state = createInitialState(createMockTicket());
      state.selectedKB = createMockKB();

      const newState = setSelectedKB(state, null);

      expect(newState.selectedKB).toBeNull();
    });

    it('setKBResults sets results and context', () => {
      const state = createInitialState(createMockTicket());
      const results = [{
        chunk: {
          id: 1,
          pageHash: 'hash1',
          pageUrl: 'https://docs.example.com/doc1',
          pageTitle: 'Doc 1',
          text: 'Content 1',
          startIdx: 0,
          endIdx: 100,
        },
        score: 0.9,
      }];

      const newState = setKBResults(state, results, 'KB context content');

      expect(newState.kbResults).toBe(results);
      expect(newState.kbContext).toBe('KB context content');
    });
  });

  describe('Clarifying questions', () => {
    it('setClarifyingQuestions with questions goes to clarifying-questions', () => {
      const state = createInitialState(createMockTicket());
      const questions = createMockQuestions();

      const newState = setClarifyingQuestions(state, questions, 'Context');

      expect(newState.step).toBe('clarifying-questions');
      expect(newState.questions).toBe(questions);
      expect(newState.kbContext).toBe('Context');
      expect(newState.currentQuestionIndex).toBe(0);
    });

    it('setClarifyingQuestions with empty questions goes to research-summary', () => {
      const state = createInitialState(createMockTicket());

      const newState = setClarifyingQuestions(state, [], 'Context');

      expect(newState.step).toBe('research-summary');
      expect(newState.questions).toEqual([]);
    });
  });

  describe('Custom input mode', () => {
    it('enterCustomInputMode sets flag and clears input', () => {
      const state = createInitialState(createMockTicket());
      state.customInput = 'leftover';

      const newState = enterCustomInputMode(state);

      expect(newState.isEnteringCustom).toBe(true);
      expect(newState.customInput).toBe('');
    });

    it('exitCustomInputMode clears flag and input', () => {
      const state = createInitialState(createMockTicket());
      state.isEnteringCustom = true;
      state.customInput = 'some input';

      const newState = exitCustomInputMode(state);

      expect(newState.isEnteringCustom).toBe(false);
      expect(newState.customInput).toBe('');
    });

    it('updateCustomInput updates the input', () => {
      const state = createInitialState(createMockTicket());
      state.isEnteringCustom = true;

      const newState = updateCustomInput(state, 'New custom value');

      expect(newState.customInput).toBe('New custom value');
    });

    it('submitCustomAnswer saves answer and advances', () => {
      const state = createInitialState(createMockTicket());
      state.step = 'clarifying-questions';
      state.questions = createMockQuestions();
      state.currentQuestionIndex = 0;
      state.isEnteringCustom = true;
      state.customInput = 'Custom auth method';

      const newState = submitCustomAnswer(state);

      expect(newState.answers.get('q0')).toBe('Custom auth method');
      expect(newState.currentQuestionIndex).toBe(1);
      expect(newState.isEnteringCustom).toBe(false);
      expect(newState.customInput).toBe('');
      expect(newState.selectedOptionIndex).toBe(0);
    });

    it('submitCustomAnswer on last question goes to research-summary', () => {
      const state = createInitialState(createMockTicket());
      state.step = 'clarifying-questions';
      state.questions = createMockQuestions();
      state.currentQuestionIndex = 1; // Last question
      state.isEnteringCustom = true;
      state.customInput = 'Custom DB';

      const newState = submitCustomAnswer(state);

      expect(newState.answers.get('q1')).toBe('Custom DB');
      expect(newState.step).toBe('research-summary');
    });

    it('submitCustomAnswer with empty input returns unchanged state', () => {
      const state = createInitialState(createMockTicket());
      state.step = 'clarifying-questions';
      state.questions = createMockQuestions();
      state.isEnteringCustom = true;
      state.customInput = '   '; // Whitespace only

      const newState = submitCustomAnswer(state);

      expect(newState).toBe(state);
    });
  });

  describe('Option selection', () => {
    let state: PlanWizardState;

    beforeEach(() => {
      state = createInitialState(createMockTicket());
      state.step = 'clarifying-questions';
      state.questions = createMockQuestions();
    });

    it('selectOptionAndAdvance saves answer and advances', () => {
      state.selectedOptionIndex = 1; // OAuth

      const newState = selectOptionAndAdvance(state);

      expect(newState.answers.get('q0')).toBe('OAuth');
      expect(newState.currentQuestionIndex).toBe(1);
      expect(newState.selectedOptionIndex).toBe(0);
    });

    it('selectOptionAndAdvance with Other enters custom mode', () => {
      state.selectedOptionIndex = 3; // Other

      const newState = selectOptionAndAdvance(state);

      expect(newState.isEnteringCustom).toBe(true);
      expect(newState.answers.size).toBe(0);
    });

    it('selectOptionAndAdvance on last question goes to research-summary', () => {
      state.currentQuestionIndex = 1; // Last question
      state.selectedOptionIndex = 0; // PostgreSQL

      const newState = selectOptionAndAdvance(state);

      expect(newState.answers.get('q1')).toBe('PostgreSQL');
      expect(newState.step).toBe('research-summary');
    });

    it('navigateOption up decrements index', () => {
      state.selectedOptionIndex = 2;

      const newState = navigateOption(state, 'up');

      expect(newState.selectedOptionIndex).toBe(1);
    });

    it('navigateOption up wraps around from 0', () => {
      state.selectedOptionIndex = 0;

      const newState = navigateOption(state, 'up');

      expect(newState.selectedOptionIndex).toBe(3); // 4 options, wraps to last
    });

    it('navigateOption down increments index', () => {
      state.selectedOptionIndex = 1;

      const newState = navigateOption(state, 'down');

      expect(newState.selectedOptionIndex).toBe(2);
    });

    it('navigateOption down wraps around from last', () => {
      state.selectedOptionIndex = 3; // Last option

      const newState = navigateOption(state, 'down');

      expect(newState.selectedOptionIndex).toBe(0);
    });

    it('selectOptionByNumber sets valid index', () => {
      const newState = selectOptionByNumber(state, 3);

      expect(newState.selectedOptionIndex).toBe(2); // 1-indexed to 0-indexed
    });

    it('selectOptionByNumber ignores invalid number', () => {
      state.selectedOptionIndex = 1;

      const newState = selectOptionByNumber(state, 10);

      expect(newState).toBe(state);
    });

    it('selectOptionByNumber ignores zero', () => {
      state.selectedOptionIndex = 1;

      const newState = selectOptionByNumber(state, 0);

      expect(newState).toBe(state);
    });
  });

  describe('getCurrentStepIndex', () => {
    it('returns correct index for each step', () => {
      expect(getCurrentStepIndex('confirm-ticket')).toBe(0);
      expect(getCurrentStepIndex('select-kb')).toBe(1);
      expect(getCurrentStepIndex('initial-research')).toBe(1);
      expect(getCurrentStepIndex('clarifying-questions')).toBe(2);
      expect(getCurrentStepIndex('research-summary')).toBe(2);
      expect(getCurrentStepIndex('generating-impl')).toBe(3);
      expect(getCurrentStepIndex('review-impl')).toBe(3);
      expect(getCurrentStepIndex('generating-verify')).toBe(4);
      expect(getCurrentStepIndex('complete')).toBe(5);
    });

    it('returns -1 for error step', () => {
      expect(getCurrentStepIndex('error')).toBe(-1);
    });
  });

  describe('handleCustomInputKeypress', () => {
    let state: PlanWizardState;

    beforeEach(() => {
      state = createInitialState(createMockTicket());
      state.step = 'clarifying-questions';
      state.questions = createMockQuestions();
      state.isEnteringCustom = true;
      state.customInput = 'test';
    });

    it('returns unhandled when not in custom mode', () => {
      state.isEnteringCustom = false;

      const result = handleCustomInputKeypress(state, 'a', {});

      expect(result.handled).toBe(false);
      expect(result.state).toBe(state);
    });

    it('handles return key by submitting', () => {
      const result = handleCustomInputKeypress(state, '', { return: true });

      expect(result.handled).toBe(true);
      expect(result.state.isEnteringCustom).toBe(false);
      expect(result.state.answers.get('q0')).toBe('test');
    });

    it('handles escape key by exiting', () => {
      const result = handleCustomInputKeypress(state, '', { escape: true });

      expect(result.handled).toBe(true);
      expect(result.state.isEnteringCustom).toBe(false);
      expect(result.state.customInput).toBe('');
    });

    it('handles backspace by deleting', () => {
      const result = handleCustomInputKeypress(state, '', { backspace: true });

      expect(result.handled).toBe(true);
      expect(result.state.customInput).toBe('tes');
    });

    it('handles character input by appending', () => {
      const result = handleCustomInputKeypress(state, 's', {});

      expect(result.handled).toBe(true);
      expect(result.state.customInput).toBe('tests');
    });

    it('ignores ctrl+key combinations', () => {
      const result = handleCustomInputKeypress(state, 'c', { ctrl: true });

      expect(result.handled).toBe(true);
      expect(result.state.customInput).toBe('test'); // Unchanged
    });
  });

  describe('handleStepInput', () => {
    let state: PlanWizardState;
    const emptyKBs: KnowledgeBase[] = [];
    const kbs = [createMockKB()];

    beforeEach(() => {
      state = createInitialState(createMockTicket());
    });

    describe('confirm-ticket step', () => {
      it('return key transitions to select-kb', () => {
        const result = handleStepInput(state, '', { return: true }, emptyKBs, 0);

        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.step).toBe('select-kb');
        }
      });

      it('escape triggers back', () => {
        const result = handleStepInput(state, '', { escape: true }, emptyKBs, 0);

        expect(result.action).toBe('back');
      });
    });

    describe('select-kb step', () => {
      beforeEach(() => {
        state.step = 'select-kb';
      });

      it('return key with KB triggers async research', () => {
        const result = handleStepInput(state, '', { return: true }, kbs, 0);

        expect(result.action).toBe('async');
        if (result.action === 'async') {
          expect(result.asyncAction).toBe('performInitialResearch');
          expect(result.state.selectedKB).toBe(kbs[0]);
        }
      });

      it('S key skips KB and triggers async research', () => {
        const result = handleStepInput(state, 'S', {}, kbs, 0);

        expect(result.action).toBe('async');
        if (result.action === 'async') {
          expect(result.asyncAction).toBe('performInitialResearch');
          expect(result.state.selectedKB).toBeNull();
        }
      });

      it('escape goes back to confirm-ticket', () => {
        const result = handleStepInput(state, '', { escape: true }, emptyKBs, 0);

        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.step).toBe('confirm-ticket');
        }
      });
    });

    describe('clarifying-questions step', () => {
      beforeEach(() => {
        state.step = 'clarifying-questions';
        state.questions = createMockQuestions();
      });

      it('E key skips to research-summary', () => {
        const result = handleStepInput(state, 'E', {}, emptyKBs, 0);

        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.step).toBe('research-summary');
        }
      });

      it('return key selects option', () => {
        const result = handleStepInput(state, '', { return: true }, emptyKBs, 0);

        expect(result.action).toBe('transition');
      });

      it('O key enters custom mode', () => {
        const result = handleStepInput(state, 'O', {}, emptyKBs, 0);

        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.isEnteringCustom).toBe(true);
        }
      });

      it('j key navigates down', () => {
        state.selectedOptionIndex = 0;
        const result = handleStepInput(state, 'j', {}, emptyKBs, 0);

        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.selectedOptionIndex).toBe(1);
        }
      });

      it('k key navigates up', () => {
        state.selectedOptionIndex = 2;
        const result = handleStepInput(state, 'k', {}, emptyKBs, 0);

        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.selectedOptionIndex).toBe(1);
        }
      });

      it('number key selects option', () => {
        const result = handleStepInput(state, '3', {}, emptyKBs, 0);

        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.selectedOptionIndex).toBe(2);
        }
      });

      it('escape goes back to select-kb', () => {
        const result = handleStepInput(state, '', { escape: true }, emptyKBs, 0);

        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.step).toBe('select-kb');
        }
      });
    });

    describe('research-summary step', () => {
      beforeEach(() => {
        state.step = 'research-summary';
      });

      it('return key triggers plan generation', () => {
        const result = handleStepInput(state, '', { return: true }, emptyKBs, 0);

        expect(result.action).toBe('async');
        if (result.action === 'async') {
          expect(result.asyncAction).toBe('generateImplementationPlan');
        }
      });

      it('escape goes back to clarifying-questions', () => {
        const result = handleStepInput(state, '', { escape: true }, emptyKBs, 0);

        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.step).toBe('clarifying-questions');
        }
      });
    });

    describe('review-impl step', () => {
      beforeEach(() => {
        state.step = 'review-impl';
        state.implPlan = 'Some plan';
      });

      it('return key triggers verification plan', () => {
        const result = handleStepInput(state, '', { return: true }, emptyKBs, 0);

        expect(result.action).toBe('async');
        if (result.action === 'async') {
          expect(result.asyncAction).toBe('generateVerificationPlan');
        }
      });

      it('R key regenerates impl plan', () => {
        const result = handleStepInput(state, 'R', {}, emptyKBs, 0);

        expect(result.action).toBe('async');
        if (result.action === 'async') {
          expect(result.asyncAction).toBe('generateImplementationPlan');
          expect(result.state.canRegenerate).toBe(true);
        }
      });

      it('escape goes back to research-summary', () => {
        const result = handleStepInput(state, '', { escape: true }, emptyKBs, 0);

        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.step).toBe('research-summary');
        }
      });
    });

    describe('complete step', () => {
      beforeEach(() => {
        state.step = 'complete';
      });

      it('N key triggers complete action', () => {
        const result = handleStepInput(state, 'N', {}, emptyKBs, 0);

        expect(result.action).toBe('complete');
      });

      it('Q key triggers back', () => {
        const result = handleStepInput(state, 'Q', {}, emptyKBs, 0);

        expect(result.action).toBe('back');
      });

      it('escape triggers back', () => {
        const result = handleStepInput(state, '', { escape: true }, emptyKBs, 0);

        expect(result.action).toBe('back');
      });
    });

    describe('error step', () => {
      beforeEach(() => {
        state.step = 'error';
        state.error = 'Test error';
      });

      it('R key retries', () => {
        const result = handleStepInput(state, 'R', {}, emptyKBs, 0);

        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.step).toBe('confirm-ticket');
          expect(result.state.error).toBeUndefined();
        }
      });

      it('B key triggers back', () => {
        const result = handleStepInput(state, 'B', {}, emptyKBs, 0);

        expect(result.action).toBe('back');
      });

      it('escape triggers back', () => {
        const result = handleStepInput(state, '', { escape: true }, emptyKBs, 0);

        expect(result.action).toBe('back');
      });
    });

    describe('unhandled inputs', () => {
      it('returns none for unrecognized input', () => {
        const result = handleStepInput(state, 'x', {}, emptyKBs, 0);

        expect(result.action).toBe('none');
      });

      it('returns none for generating steps', () => {
        state.step = 'generating-impl';
        const result = handleStepInput(state, '', { return: true }, emptyKBs, 0);

        expect(result.action).toBe('none');
      });
    });
  });

  describe('State immutability', () => {
    it('does not mutate original state on transitions', () => {
      const originalState = createInitialState(createMockTicket());
      const originalStep = originalState.step;

      transitionToSelectKB(originalState);

      expect(originalState.step).toBe(originalStep);
    });

    it('does not mutate answers map', () => {
      const state = createInitialState(createMockTicket());
      state.questions = createMockQuestions();
      state.selectedOptionIndex = 0;
      const originalAnswersSize = state.answers.size;

      selectOptionAndAdvance(state);

      expect(state.answers.size).toBe(originalAnswersSize);
    });
  });
});

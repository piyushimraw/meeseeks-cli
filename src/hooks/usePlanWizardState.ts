/**
 * Plan Wizard State Management
 *
 * Extracted from PlanGenerator.tsx for testable screen logic.
 * This module contains pure state management functions and types
 * that can be tested without React rendering.
 */

import type { JiraTicket, KnowledgeBase, SearchResult, ClarifyingQuestion } from '../types/index.js';

// Types
export type PlanWizardStep =
  | 'confirm-ticket'
  | 'select-kb'
  | 'initial-research'
  | 'clarifying-questions'
  | 'research-summary'
  | 'generating-impl'
  | 'review-impl'
  | 'generating-verify'
  | 'complete'
  | 'error';

export interface PlanWizardState {
  step: PlanWizardStep;
  ticket: JiraTicket;
  selectedKB: KnowledgeBase | null;
  kbResults: SearchResult[];
  kbContext: string;
  questions: ClarifyingQuestion[];
  currentQuestionIndex: number;
  answers: Map<string, string>;
  selectedOptionIndex: number;
  isEnteringCustom: boolean;
  customInput: string;
  implPlan: string | null;
  verifyPlan: string | null;
  savedImplPath: string | null;
  savedVerifyPath: string | null;
  error?: string;
  canRegenerate: boolean;
}

export interface KeyInput {
  return?: boolean;
  escape?: boolean;
  upArrow?: boolean;
  downArrow?: boolean;
  backspace?: boolean;
  delete?: boolean;
  ctrl?: boolean;
  meta?: boolean;
}

// Initial state factory
export function createInitialState(ticket: JiraTicket): PlanWizardState {
  return {
    step: 'confirm-ticket',
    ticket,
    selectedKB: null,
    kbResults: [],
    kbContext: '',
    questions: [],
    currentQuestionIndex: 0,
    answers: new Map(),
    selectedOptionIndex: 0,
    isEnteringCustom: false,
    customInput: '',
    implPlan: null,
    verifyPlan: null,
    savedImplPath: null,
    savedVerifyPath: null,
    canRegenerate: false,
  };
}

// Parse clarifying questions from AI response
export function parseQuestionsFromResponse(response: string): ClarifyingQuestion[] {
  const lines = response.split('\n').filter(line => line.trim().startsWith('QUESTION:'));
  return lines.map((line, index) => {
    const match = line.match(/QUESTION:\s*(.+?)\s*\|\s*OPTIONS:\s*(.+)/);
    if (match) {
      const [, question, optionsStr] = match;
      const options = optionsStr.split(',').map(o => o.trim());
      return {
        id: `q${index}`,
        question: question.trim(),
        options,
        allowOther: true,
      };
    }
    return null;
  }).filter((q): q is ClarifyingQuestion => q !== null);
}

// Format answers for display/prompt
export function formatAnswers(answers: Map<string, string>, questions: ClarifyingQuestion[]): string {
  return Array.from(answers.entries())
    .map(([qId, answer]) => {
      const question = questions.find(q => q.id === qId);
      return question ? `- ${question.question}: ${answer}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

// State transition functions

export function transitionToSelectKB(state: PlanWizardState): PlanWizardState {
  return { ...state, step: 'select-kb' };
}

export function transitionToConfirmTicket(state: PlanWizardState): PlanWizardState {
  return { ...state, step: 'confirm-ticket' };
}

export function transitionToInitialResearch(state: PlanWizardState): PlanWizardState {
  return { ...state, step: 'initial-research' };
}

export function transitionToError(state: PlanWizardState, error: string): PlanWizardState {
  return { ...state, step: 'error', error };
}

export function transitionToResearchSummary(state: PlanWizardState): PlanWizardState {
  return { ...state, step: 'research-summary' };
}

export function transitionToGeneratingImpl(state: PlanWizardState): PlanWizardState {
  return { ...state, step: 'generating-impl' };
}

export function transitionToReviewImpl(state: PlanWizardState, implPlan: string): PlanWizardState {
  return {
    ...state,
    implPlan,
    step: 'review-impl',
    canRegenerate: false,
  };
}

export function transitionToGeneratingVerify(state: PlanWizardState): PlanWizardState {
  return { ...state, step: 'generating-verify' };
}

export function transitionToComplete(
  state: PlanWizardState,
  verifyPlan: string,
  savedImplPath: string,
  savedVerifyPath: string
): PlanWizardState {
  return {
    ...state,
    verifyPlan,
    savedImplPath,
    savedVerifyPath,
    step: 'complete',
  };
}

export function setSelectedKB(state: PlanWizardState, kb: KnowledgeBase | null): PlanWizardState {
  return { ...state, selectedKB: kb };
}

export function setKBResults(state: PlanWizardState, results: SearchResult[], context: string): PlanWizardState {
  return { ...state, kbResults: results, kbContext: context };
}

export function setClarifyingQuestions(
  state: PlanWizardState,
  questions: ClarifyingQuestion[],
  kbContext: string
): PlanWizardState {
  const nextStep = questions.length > 0 ? 'clarifying-questions' : 'research-summary';
  return {
    ...state,
    kbContext,
    questions,
    currentQuestionIndex: 0,
    step: nextStep as PlanWizardStep,
  };
}

export function enterCustomInputMode(state: PlanWizardState): PlanWizardState {
  return { ...state, isEnteringCustom: true, customInput: '' };
}

export function exitCustomInputMode(state: PlanWizardState): PlanWizardState {
  return { ...state, isEnteringCustom: false, customInput: '' };
}

export function updateCustomInput(state: PlanWizardState, customInput: string): PlanWizardState {
  return { ...state, customInput };
}

export function submitCustomAnswer(state: PlanWizardState): PlanWizardState {
  if (!state.customInput.trim()) {
    return state;
  }

  const currentQuestion = state.questions[state.currentQuestionIndex];
  const newAnswers = new Map(state.answers);
  newAnswers.set(currentQuestion.id, state.customInput.trim());

  // Move to next question or summary
  if (state.currentQuestionIndex < state.questions.length - 1) {
    return {
      ...state,
      answers: newAnswers,
      currentQuestionIndex: state.currentQuestionIndex + 1,
      selectedOptionIndex: 0,
      isEnteringCustom: false,
      customInput: '',
    };
  } else {
    return {
      ...state,
      answers: newAnswers,
      step: 'research-summary',
      isEnteringCustom: false,
      customInput: '',
    };
  }
}

export function selectOptionAndAdvance(state: PlanWizardState): PlanWizardState {
  const currentQuestion = state.questions[state.currentQuestionIndex];
  const selectedOption = currentQuestion.options[state.selectedOptionIndex];

  if (selectedOption === 'Other') {
    return enterCustomInputMode(state);
  }

  const newAnswers = new Map(state.answers);
  newAnswers.set(currentQuestion.id, selectedOption);

  // Move to next question or summary
  if (state.currentQuestionIndex < state.questions.length - 1) {
    return {
      ...state,
      answers: newAnswers,
      currentQuestionIndex: state.currentQuestionIndex + 1,
      selectedOptionIndex: 0,
    };
  } else {
    return {
      ...state,
      answers: newAnswers,
      step: 'research-summary',
    };
  }
}

export function navigateOption(state: PlanWizardState, direction: 'up' | 'down'): PlanWizardState {
  const currentQuestion = state.questions[state.currentQuestionIndex];
  const optionsLength = currentQuestion.options.length;

  if (direction === 'up') {
    return {
      ...state,
      selectedOptionIndex: state.selectedOptionIndex > 0
        ? state.selectedOptionIndex - 1
        : optionsLength - 1,
    };
  } else {
    return {
      ...state,
      selectedOptionIndex: state.selectedOptionIndex < optionsLength - 1
        ? state.selectedOptionIndex + 1
        : 0,
    };
  }
}

export function selectOptionByNumber(state: PlanWizardState, num: number): PlanWizardState {
  const currentQuestion = state.questions[state.currentQuestionIndex];
  if (num >= 1 && num <= currentQuestion.options.length) {
    return { ...state, selectedOptionIndex: num - 1 };
  }
  return state;
}

export function resetToRetry(state: PlanWizardState): PlanWizardState {
  return { ...state, step: 'confirm-ticket', error: undefined };
}

export function enableRegenerate(state: PlanWizardState): PlanWizardState {
  return { ...state, canRegenerate: true };
}

// Step indicator calculation
export function getCurrentStepIndex(step: PlanWizardStep): number {
  const steps: Array<{ key: PlanWizardStep | PlanWizardStep[]; }> = [
    { key: 'confirm-ticket' },
    { key: ['select-kb', 'initial-research'] },
    { key: ['clarifying-questions', 'research-summary'] },
    { key: ['generating-impl', 'review-impl'] },
    { key: 'generating-verify' },
    { key: 'complete' },
  ];

  return steps.findIndex(s => {
    if (Array.isArray(s.key)) {
      return s.key.includes(step);
    }
    return s.key === step;
  });
}

// Input handler for custom input mode
export function handleCustomInputKeypress(
  state: PlanWizardState,
  input: string,
  key: KeyInput
): { state: PlanWizardState; handled: boolean } {
  if (!state.isEnteringCustom) {
    return { state, handled: false };
  }

  if (key.return) {
    return { state: submitCustomAnswer(state), handled: true };
  } else if (key.escape) {
    return { state: exitCustomInputMode(state), handled: true };
  } else if (key.backspace || key.delete) {
    return {
      state: updateCustomInput(state, state.customInput.slice(0, -1)),
      handled: true
    };
  } else if (input && input.length === 1 && !key.ctrl && !key.meta) {
    return {
      state: updateCustomInput(state, state.customInput + input),
      handled: true
    };
  }

  return { state, handled: true };
}

// Input handler for step-specific actions
export type StepInputResult =
  | { action: 'none' }
  | { action: 'back' }
  | { action: 'complete' }
  | { action: 'transition'; state: PlanWizardState }
  | { action: 'async'; asyncAction: 'performInitialResearch' | 'generateImplementationPlan' | 'generateVerificationPlan'; state: PlanWizardState };

export function handleStepInput(
  state: PlanWizardState,
  input: string,
  key: KeyInput,
  knowledgeBases: KnowledgeBase[],
  selectedKBIndex: number
): StepInputResult {
  switch (state.step) {
    case 'confirm-ticket':
      if (key.return) {
        return { action: 'transition', state: transitionToSelectKB(state) };
      } else if (key.escape) {
        return { action: 'back' };
      }
      break;

    case 'select-kb':
      if (key.return) {
        const selected = knowledgeBases[selectedKBIndex];
        const newState = setSelectedKB(state, selected || null);
        return { action: 'async', asyncAction: 'performInitialResearch', state: newState };
      } else if (input === 's' || input === 'S') {
        const newState = setSelectedKB(state, null);
        return { action: 'async', asyncAction: 'performInitialResearch', state: newState };
      } else if (key.escape) {
        return { action: 'transition', state: transitionToConfirmTicket(state) };
      }
      break;

    case 'clarifying-questions':
      if (input === 'e' || input === 'E') {
        return { action: 'transition', state: transitionToResearchSummary(state) };
      } else if (key.return) {
        return { action: 'transition', state: selectOptionAndAdvance(state) };
      } else if (input === 'o' || input === 'O') {
        return { action: 'transition', state: enterCustomInputMode(state) };
      } else if (key.escape) {
        return { action: 'transition', state: transitionToSelectKB(state) };
      } else if (key.upArrow || input === 'k') {
        return { action: 'transition', state: navigateOption(state, 'up') };
      } else if (key.downArrow || input === 'j') {
        return { action: 'transition', state: navigateOption(state, 'down') };
      } else {
        const num = parseInt(input);
        if (!isNaN(num)) {
          return { action: 'transition', state: selectOptionByNumber(state, num) };
        }
      }
      break;

    case 'research-summary':
      if (key.return) {
        return { action: 'async', asyncAction: 'generateImplementationPlan', state };
      } else if (key.escape) {
        return { action: 'transition', state: { ...state, step: 'clarifying-questions' } };
      }
      break;

    case 'review-impl':
      if (key.return) {
        return { action: 'async', asyncAction: 'generateVerificationPlan', state };
      } else if (input === 'r' || input === 'R') {
        const newState = enableRegenerate(state);
        return { action: 'async', asyncAction: 'generateImplementationPlan', state: newState };
      } else if (key.escape) {
        return { action: 'transition', state: transitionToResearchSummary(state) };
      }
      break;

    case 'complete':
      if (input === 'n' || input === 'N') {
        return { action: 'complete' };
      } else if (input === 'q' || input === 'Q' || key.escape) {
        return { action: 'back' };
      }
      break;

    case 'error':
      if (input === 'r' || input === 'R') {
        return { action: 'transition', state: resetToRetry(state) };
      } else if (input === 'b' || input === 'B' || key.escape) {
        return { action: 'back' };
      }
      break;
  }

  return { action: 'none' };
}

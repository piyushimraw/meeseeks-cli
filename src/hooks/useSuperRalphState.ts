import type {BrainstormQuestion, ScopeAssessment, ExecutionProgress} from '../types/superRalph.js';

export type SuperRalphStep =
  | 'idle'
  | 'scoping'
  | 'scope-confirm'
  | 'brainstorming'
  | 'planning'
  | 'executing'
  | 'paused'
  | 'completed'
  | 'error';

export interface ActivityLogEntry {
  id: number;
  timestamp: string;
  type: 'info' | 'context' | 'llm' | 'success' | 'error' | 'phase';
  message: string;
  detail?: string;
}

export interface SuperRalphScreenState {
  step: SuperRalphStep;
  taskDescription: string;
  sessionId: string | null;
  scopeAssessment: ScopeAssessment | null;
  confirmedPhases: {title: string; description: string}[];
  currentPhaseIndex: number;
  questions: BrainstormQuestion[];
  currentQuestionIndex: number;
  executionProgress: ExecutionProgress | null;
  error: string | null;
  pauseReason: string | null;
  isLoading: boolean;
  loadingMessage: string;
  activityLog: ActivityLogEntry[];
  logIdCounter: number;
}

export function createInitialState(): SuperRalphScreenState {
  return {
    step: 'idle',
    taskDescription: '',
    sessionId: null,
    scopeAssessment: null,
    confirmedPhases: [],
    currentPhaseIndex: 0,
    questions: [],
    currentQuestionIndex: 0,
    executionProgress: null,
    error: null,
    pauseReason: null,
    isLoading: false,
    loadingMessage: '',
    activityLog: [],
    logIdCounter: 0,
  };
}

export function addLogEntry(
  state: SuperRalphScreenState,
  type: ActivityLogEntry['type'],
  message: string,
  detail?: string,
): SuperRalphScreenState {
  const id = state.logIdCounter + 1;
  const entry: ActivityLogEntry = {
    id,
    timestamp: new Date().toLocaleTimeString(),
    type,
    message,
    detail,
  };
  return {
    ...state,
    logIdCounter: id,
    activityLog: [entry, ...state.activityLog].slice(0, 20),
  };
}

export function transitionToScoping(state: SuperRalphScreenState, taskDescription: string): SuperRalphScreenState {
  return { ...state, step: 'scoping', taskDescription, isLoading: true, loadingMessage: 'Analyzing task scope...' };
}

export function transitionToBrainstorming(state: SuperRalphScreenState, sessionId: string): SuperRalphScreenState {
  return { ...state, step: 'brainstorming', sessionId, isLoading: false, loadingMessage: '' };
}

export function transitionToPlanning(state: SuperRalphScreenState): SuperRalphScreenState {
  return { ...state, step: 'planning', isLoading: true, loadingMessage: 'Generating implementation plan...' };
}

export function transitionToExecuting(state: SuperRalphScreenState): SuperRalphScreenState {
  return { ...state, step: 'executing', isLoading: false, loadingMessage: '' };
}

export function transitionToPaused(state: SuperRalphScreenState, reason: string): SuperRalphScreenState {
  return { ...state, step: 'paused', pauseReason: reason, isLoading: false };
}

export function transitionToCompleted(state: SuperRalphScreenState): SuperRalphScreenState {
  return { ...state, step: 'completed', isLoading: false };
}

export function addQuestionAnswer(state: SuperRalphScreenState, answer: string): SuperRalphScreenState {
  const updatedQuestions = [...state.questions];
  updatedQuestions[state.currentQuestionIndex] = { ...updatedQuestions[state.currentQuestionIndex], answer };
  return { ...state, questions: updatedQuestions, currentQuestionIndex: state.currentQuestionIndex + 1 };
}

export function skipQuestion(state: SuperRalphScreenState): SuperRalphScreenState {
  const updatedQuestions = [...state.questions];
  updatedQuestions[state.currentQuestionIndex] = { ...updatedQuestions[state.currentQuestionIndex], skipped: true };
  return { ...state, questions: updatedQuestions, currentQuestionIndex: state.currentQuestionIndex + 1 };
}

export function confirmPhaseBreakdown(state: SuperRalphScreenState, phases: {title: string; description: string}[]): SuperRalphScreenState {
  return { ...state, confirmedPhases: phases };
}

export function setError(state: SuperRalphScreenState, error: string): SuperRalphScreenState {
  return { ...state, step: 'error', error, isLoading: false };
}

export function addLlmQuestion(state: SuperRalphScreenState, question: string): SuperRalphScreenState {
  return { ...state, questions: [...state.questions, { id: `llm-${state.questions.length + 1}`, question, type: 'llm-generated' }] };
}

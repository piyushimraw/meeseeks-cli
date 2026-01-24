/**
 * Workflow Wizard State Management
 *
 * Extracted from WorkflowWizard.tsx for testable screen logic.
 * This module contains pure state management functions and types
 * that can be tested without React rendering.
 */

import type { JiraTicket } from '../types/index.js';
import { generateBranchName, isValidBranchName } from '../utils/branchName.js';

// Types
export type WizardStep =
  | 'confirm-transition'
  | 'transitioning'
  | 'edit-branch-name'
  | 'select-base-branch'
  | 'handle-changes'
  | 'creating'
  | 'complete'
  | 'error';

export interface WizardState {
  step: WizardStep;
  ticket: JiraTicket;
  branchName: string;
  baseBranch: string;
  error?: string;
  transitionSkipped: boolean;
  stashed: boolean;
  branches: string[];
  selectedBranchIndex: number;
  branchExistsPrompt: boolean;
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
export function createInitialState(ticket: JiraTicket, defaultBranch: string = 'main'): WizardState {
  return {
    step: 'confirm-transition',
    ticket,
    branchName: generateBranchName(ticket.key, ticket.summary),
    baseBranch: defaultBranch,
    transitionSkipped: false,
    stashed: false,
    branches: [],
    selectedBranchIndex: 0,
    branchExistsPrompt: false,
  };
}

// Initialize branches (called after async git operations)
export function initializeBranches(
  state: WizardState,
  branches: string[],
  defaultBranch: string
): WizardState {
  const defaultIndex = branches.indexOf(defaultBranch);
  return {
    ...state,
    branches,
    baseBranch: defaultBranch,
    selectedBranchIndex: defaultIndex >= 0 ? defaultIndex : 0,
  };
}

// Check if already in progress
export function isAlreadyInProgress(ticket: JiraTicket): boolean {
  return ticket.status.toLowerCase() === 'in progress';
}

// Auto-advance if ticket is already In Progress
export function checkAutoAdvance(state: WizardState): WizardState {
  if (state.step === 'confirm-transition' && isAlreadyInProgress(state.ticket)) {
    return { ...state, step: 'edit-branch-name', transitionSkipped: true };
  }
  return state;
}

// Step transitions
export function transitionToTransitioning(state: WizardState): WizardState {
  return { ...state, step: 'transitioning' };
}

export function transitionToEditBranchName(state: WizardState): WizardState {
  return { ...state, step: 'edit-branch-name' };
}

export function transitionToEditBranchNameSkipped(state: WizardState): WizardState {
  return { ...state, step: 'edit-branch-name', transitionSkipped: true };
}

export function transitionToSelectBaseBranch(state: WizardState): WizardState {
  return { ...state, step: 'select-base-branch' };
}

export function transitionToHandleChanges(state: WizardState): WizardState {
  return { ...state, step: 'handle-changes' };
}

export function transitionToCreating(state: WizardState): WizardState {
  return { ...state, step: 'creating' };
}

export function transitionToComplete(state: WizardState): WizardState {
  return { ...state, step: 'complete' };
}

export function transitionToConfirmTransition(state: WizardState): WizardState {
  return { ...state, step: 'confirm-transition' };
}

export function transitionToError(state: WizardState, error: string): WizardState {
  return { ...state, step: 'error', error };
}

export function showBranchExistsPrompt(state: WizardState): WizardState {
  return { ...state, branchExistsPrompt: true };
}

export function hideBranchExistsPrompt(state: WizardState): WizardState {
  return { ...state, branchExistsPrompt: false };
}

export function setStashed(state: WizardState): WizardState {
  return { ...state, stashed: true };
}

export function resetForRetry(state: WizardState): WizardState {
  return { ...state, step: 'confirm-transition', error: undefined };
}

export function continueAfterError(state: WizardState): WizardState {
  return { ...state, step: 'edit-branch-name', error: undefined, transitionSkipped: true };
}

// Branch name editing
export function updateBranchName(state: WizardState, branchName: string): WizardState {
  return { ...state, branchName };
}

export function appendToBranchName(state: WizardState, char: string): WizardState {
  return { ...state, branchName: state.branchName + char };
}

export function backspaceBranchName(state: WizardState): WizardState {
  return { ...state, branchName: state.branchName.slice(0, -1) };
}

export function validateBranchName(branchName: string): boolean {
  return isValidBranchName(branchName);
}

// Branch selection
export function selectBranch(state: WizardState, index: number): WizardState {
  if (index >= 0 && index < state.branches.length) {
    return { ...state, selectedBranchIndex: index };
  }
  return state;
}

export function navigateBranch(state: WizardState, direction: 'up' | 'down'): WizardState {
  const { branches, selectedBranchIndex } = state;
  if (branches.length === 0) return state;

  if (direction === 'up') {
    return {
      ...state,
      selectedBranchIndex: selectedBranchIndex > 0
        ? selectedBranchIndex - 1
        : branches.length - 1,
    };
  } else {
    return {
      ...state,
      selectedBranchIndex: selectedBranchIndex < branches.length - 1
        ? selectedBranchIndex + 1
        : 0,
    };
  }
}

export function selectBranchByNumber(state: WizardState, num: number): WizardState {
  if (num >= 1 && num <= 9 && num <= state.branches.length) {
    return { ...state, selectedBranchIndex: num - 1 };
  }
  return state;
}

export function confirmBaseBranch(state: WizardState): WizardState {
  const selectedBranch = state.branches[state.selectedBranchIndex];
  if (selectedBranch) {
    return { ...state, baseBranch: selectedBranch };
  }
  return state;
}

// Step indicator calculation
export function getCurrentStepIndex(step: WizardStep): number {
  const stepMap: Record<WizardStep, number> = {
    'confirm-transition': 0,
    'transitioning': 0,
    'edit-branch-name': 1,
    'select-base-branch': 2,
    'handle-changes': 3,
    'creating': 3,
    'complete': 4,
    'error': -1,
  };
  return stepMap[step] ?? -1;
}

// Input handler for branch exists prompt
export type BranchExistsResult =
  | { action: 'checkout' }
  | { action: 'edit' }
  | { action: 'none' };

export function handleBranchExistsInput(input: string): BranchExistsResult {
  if (input === 'y' || input === 'Y') {
    return { action: 'checkout' };
  } else if (input === 'n' || input === 'N') {
    return { action: 'edit' };
  }
  return { action: 'none' };
}

// Input handler for step-specific actions
export type StepInputResult =
  | { action: 'none' }
  | { action: 'back' }
  | { action: 'plan' }
  | { action: 'transition'; state: WizardState }
  | { action: 'async'; asyncAction: 'executeTransition' | 'handleCreateBranch' | 'handleStash'; state: WizardState };

export function handleStepInput(
  state: WizardState,
  input: string,
  key: KeyInput,
  hasUncommittedChanges: boolean = false
): StepInputResult {
  switch (state.step) {
    case 'confirm-transition':
      if (key.return) {
        return { action: 'async', asyncAction: 'executeTransition', state };
      } else if (input === 's' || input === 'S') {
        return { action: 'transition', state: transitionToEditBranchNameSkipped(state) };
      } else if (key.escape) {
        return { action: 'back' };
      }
      break;

    case 'edit-branch-name':
      if (key.return) {
        if (validateBranchName(state.branchName)) {
          return { action: 'transition', state: transitionToSelectBaseBranch(state) };
        }
      } else if (key.escape) {
        return { action: 'transition', state: transitionToConfirmTransition(state) };
      } else if (key.backspace || key.delete) {
        return { action: 'transition', state: backspaceBranchName(state) };
      } else if (input && input.length === 1 && !key.ctrl && !key.meta) {
        return { action: 'transition', state: appendToBranchName(state, input) };
      }
      break;

    case 'select-base-branch':
      if (key.return) {
        const selectedBranch = state.branches[state.selectedBranchIndex];
        if (selectedBranch) {
          const newState = confirmBaseBranch(state);
          if (hasUncommittedChanges) {
            return { action: 'transition', state: transitionToHandleChanges(newState) };
          } else {
            return { action: 'async', asyncAction: 'handleCreateBranch', state: newState };
          }
        }
      } else if (key.escape) {
        return { action: 'transition', state: transitionToEditBranchName(state) };
      } else if (key.upArrow || input === 'k') {
        return { action: 'transition', state: navigateBranch(state, 'up') };
      } else if (key.downArrow || input === 'j') {
        return { action: 'transition', state: navigateBranch(state, 'down') };
      } else {
        const num = parseInt(input);
        if (!isNaN(num) && num >= 1 && num <= 9) {
          return { action: 'transition', state: selectBranchByNumber(state, num) };
        }
      }
      break;

    case 'handle-changes':
      if (input === 's' || input === 'S') {
        return { action: 'async', asyncAction: 'handleStash', state };
      } else if (input === 'c' || input === 'C' || key.escape) {
        return { action: 'back' };
      }
      break;

    case 'complete':
      if (input === 'p' || input === 'P') {
        return { action: 'plan' };
      } else if (input === 'q' || input === 'Q' || key.escape) {
        return { action: 'back' };
      }
      break;

    case 'error':
      if (input === 'r' || input === 'R') {
        return { action: 'transition', state: resetForRetry(state) };
      } else if (input === 'c' || input === 'C') {
        return { action: 'transition', state: continueAfterError(state) };
      } else if (input === 'b' || input === 'B' || key.escape) {
        return { action: 'back' };
      }
      break;
  }

  return { action: 'none' };
}

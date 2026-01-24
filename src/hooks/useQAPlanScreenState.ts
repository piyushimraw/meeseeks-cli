/**
 * QA Plan Screen State Management
 *
 * Extracted from QAPlan.tsx for testable screen logic.
 * This module contains pure state management functions and types
 * that can be tested without React rendering.
 */

import type { KnowledgeBase, SearchResult, CondenseResult } from '../types/index.js';
import type { ChatResponse } from '../utils/copilot.js';

// Types
export type QAPlanState =
  | 'idle'
  | 'select-diff-mode'
  | 'select-branch'
  | 'loading-diff'
  | 'select-kb'
  | 'searching'
  | 'generating'
  | 'complete'
  | 'error'
  | 'input-filename'
  | 'saving'
  | 'saved';

export type DiffMode = 'branch' | 'uncommitted';

export interface ScreenState {
  state: QAPlanState;
  output: string | null;
  error: string | null;
  selectedKBIndex: number;
  selectedKB: KnowledgeBase | null;
  gitDiff: string;
  branchInfo: string;
  searchResults: SearchResult[];
  modelInfo: string | null;
  usageInfo: ChatResponse['usage'] | null;
  diffMode: DiffMode | null;
  diffModeIndex: number;
  availableBranches: string[];
  selectedBranchIndex: number;
  selectedBranch: string | null;
  filename: string;
  savedPath: string | null;
  condenseInfo: CondenseResult | null;
}

export interface KeyInput {
  return?: boolean;
  escape?: boolean;
  upArrow?: boolean;
  downArrow?: boolean;
}

// Initial state factory
export function createInitialState(branchInfo: string = 'unknown'): ScreenState {
  return {
    state: 'idle',
    output: null,
    error: null,
    selectedKBIndex: 0,
    selectedKB: null,
    gitDiff: '',
    branchInfo,
    searchResults: [],
    modelInfo: null,
    usageInfo: null,
    diffMode: null,
    diffModeIndex: 0,
    availableBranches: [],
    selectedBranchIndex: 0,
    selectedBranch: null,
    filename: '',
    savedPath: null,
    condenseInfo: null,
  };
}

// State setters
export function setState(state: ScreenState, newState: QAPlanState): ScreenState {
  return { ...state, state: newState };
}

export function setOutput(state: ScreenState, output: string | null): ScreenState {
  return { ...state, output };
}

export function setError(state: ScreenState, error: string | null): ScreenState {
  return { ...state, error };
}

export function setSelectedKBIndex(state: ScreenState, index: number): ScreenState {
  return { ...state, selectedKBIndex: index };
}

export function setSelectedKB(state: ScreenState, kb: KnowledgeBase | null): ScreenState {
  return { ...state, selectedKB: kb };
}

export function setGitDiff(state: ScreenState, diff: string): ScreenState {
  return { ...state, gitDiff: diff };
}

export function setBranchInfo(state: ScreenState, info: string): ScreenState {
  return { ...state, branchInfo: info };
}

export function setSearchResults(state: ScreenState, results: SearchResult[]): ScreenState {
  return { ...state, searchResults: results };
}

export function setModelInfo(state: ScreenState, info: string | null): ScreenState {
  return { ...state, modelInfo: info };
}

export function setUsageInfo(state: ScreenState, usage: ChatResponse['usage'] | null): ScreenState {
  return { ...state, usageInfo: usage };
}

export function setDiffMode(state: ScreenState, mode: DiffMode | null): ScreenState {
  return { ...state, diffMode: mode };
}

export function setDiffModeIndex(state: ScreenState, index: number): ScreenState {
  return { ...state, diffModeIndex: index };
}

export function setAvailableBranches(state: ScreenState, branches: string[]): ScreenState {
  return { ...state, availableBranches: branches };
}

export function setSelectedBranchIndex(state: ScreenState, index: number): ScreenState {
  return { ...state, selectedBranchIndex: index };
}

export function setSelectedBranch(state: ScreenState, branch: string | null): ScreenState {
  return { ...state, selectedBranch: branch };
}

export function setFilename(state: ScreenState, filename: string): ScreenState {
  return { ...state, filename };
}

export function setSavedPath(state: ScreenState, path: string | null): ScreenState {
  return { ...state, savedPath: path };
}

export function setCondenseInfo(state: ScreenState, info: CondenseResult | null): ScreenState {
  return { ...state, condenseInfo: info };
}

// Navigation helpers
export function navigateDiffModeUp(state: ScreenState): ScreenState {
  return { ...state, diffModeIndex: state.diffModeIndex > 0 ? state.diffModeIndex - 1 : 1 };
}

export function navigateDiffModeDown(state: ScreenState): ScreenState {
  return { ...state, diffModeIndex: state.diffModeIndex < 1 ? state.diffModeIndex + 1 : 0 };
}

export function navigateBranchUp(state: ScreenState): ScreenState {
  const { availableBranches, selectedBranchIndex } = state;
  const newIndex = selectedBranchIndex > 0
    ? selectedBranchIndex - 1
    : availableBranches.length - 1;
  return { ...state, selectedBranchIndex: newIndex };
}

export function navigateBranchDown(state: ScreenState): ScreenState {
  const { availableBranches, selectedBranchIndex } = state;
  const newIndex = selectedBranchIndex < availableBranches.length - 1
    ? selectedBranchIndex + 1
    : 0;
  return { ...state, selectedBranchIndex: newIndex };
}

export function navigateKBUp(state: ScreenState, kbCount: number): ScreenState {
  const options = kbCount + 1; // +1 for "Skip" option
  const newIndex = state.selectedKBIndex > 0
    ? state.selectedKBIndex - 1
    : options - 1;
  return { ...state, selectedKBIndex: newIndex };
}

export function navigateKBDown(state: ScreenState, kbCount: number): ScreenState {
  const options = kbCount + 1; // +1 for "Skip" option
  const newIndex = state.selectedKBIndex < options - 1
    ? state.selectedKBIndex + 1
    : 0;
  return { ...state, selectedKBIndex: newIndex };
}

// Transition helpers
export function goToSelectDiffMode(state: ScreenState, branches: string[]): ScreenState {
  return {
    ...state,
    state: 'select-diff-mode',
    availableBranches: branches,
    diffModeIndex: 0,
  };
}

export function goToSelectBranch(state: ScreenState): ScreenState {
  return {
    ...state,
    state: 'select-branch',
    diffMode: 'branch',
    selectedBranchIndex: 0,
  };
}

export function goToLoadingDiff(state: ScreenState): ScreenState {
  return { ...state, state: 'loading-diff' };
}

export function goToSelectKB(state: ScreenState): ScreenState {
  return { ...state, state: 'select-kb' };
}

export function goToSearching(state: ScreenState): ScreenState {
  return { ...state, state: 'searching' };
}

export function goToGenerating(state: ScreenState): ScreenState {
  return { ...state, state: 'generating' };
}

export function goToComplete(
  state: ScreenState,
  output: string,
  modelInfo: string | null,
  usageInfo: ChatResponse['usage'] | null
): ScreenState {
  return {
    ...state,
    state: 'complete',
    output,
    modelInfo,
    usageInfo,
  };
}

export function goToError(state: ScreenState, error: string): ScreenState {
  return { ...state, state: 'error', error };
}

export function goToInputFilename(state: ScreenState, defaultFilename: string): ScreenState {
  return { ...state, state: 'input-filename', filename: defaultFilename, error: null };
}

export function goToSaving(state: ScreenState): ScreenState {
  return { ...state, state: 'saving', error: null };
}

export function goToSaved(state: ScreenState, path: string): ScreenState {
  return { ...state, state: 'saved', savedPath: path };
}

export function goToIdle(state: ScreenState): ScreenState {
  return {
    ...state,
    state: 'idle',
    output: null,
    error: null,
    selectedKB: null,
    selectedKBIndex: 0,
    searchResults: [],
    modelInfo: null,
    usageInfo: null,
    diffMode: null,
    diffModeIndex: 0,
    selectedBranch: null,
    selectedBranchIndex: 0,
    gitDiff: '',
    filename: '',
    savedPath: null,
    condenseInfo: null,
  };
}

// Back navigation
export type BackResult =
  | { action: 'exit' }
  | { action: 'transition'; state: ScreenState };

export function handleBack(state: ScreenState): BackResult {
  switch (state.state) {
    case 'select-diff-mode':
      return { action: 'transition', state: setState(state, 'idle') };
    case 'select-branch':
      return { action: 'transition', state: setState(state, 'select-diff-mode') };
    case 'select-kb':
      return { action: 'transition', state: setState(state, 'select-diff-mode') };
    case 'input-filename':
      return { action: 'transition', state: { ...setState(state, 'complete'), error: null } };
    case 'saved':
      return { action: 'transition', state: { ...setState(state, 'complete'), savedPath: null } };
    default:
      return { action: 'exit' };
  }
}

// Validation
export function validateFilename(filename: string): { valid: boolean; error?: string } {
  if (!filename.trim()) {
    return { valid: false, error: 'Filename is required' };
  }
  return { valid: true };
}

// Input handler result types
export type InputResult =
  | { action: 'none' }
  | { action: 'back' }
  | { action: 'exit' }
  | { action: 'transition'; state: ScreenState }
  | { action: 'async'; asyncAction: 'loadDiff' | 'generate' | 'save'; state: ScreenState };

// Input handling for idle state
export function handleIdleInput(
  state: ScreenState,
  input: string,
  isConnected: boolean,
  branches: string[]
): InputResult {
  if (input === 'g' && isConnected) {
    return { action: 'transition', state: goToSelectDiffMode(state, branches) };
  }
  return { action: 'none' };
}

// Input handling for diff mode selection
export function handleDiffModeInput(
  state: ScreenState,
  key: KeyInput
): InputResult {
  if (key.upArrow) {
    return { action: 'transition', state: navigateDiffModeUp(state) };
  } else if (key.downArrow) {
    return { action: 'transition', state: navigateDiffModeDown(state) };
  } else if (key.return) {
    if (state.diffModeIndex === 0) {
      // Compare with branch
      if (state.availableBranches.length > 0) {
        return { action: 'transition', state: goToSelectBranch(state) };
      } else {
        // No other branches, load default branch diff
        const newState = { ...state, diffMode: 'branch' as DiffMode };
        return { action: 'async', asyncAction: 'loadDiff', state: newState };
      }
    } else {
      // Uncommitted changes
      const newState = { ...state, diffMode: 'uncommitted' as DiffMode };
      return { action: 'async', asyncAction: 'loadDiff', state: newState };
    }
  }
  return { action: 'none' };
}

// Input handling for branch selection
export function handleBranchInput(
  state: ScreenState,
  key: KeyInput
): InputResult {
  if (key.upArrow) {
    return { action: 'transition', state: navigateBranchUp(state) };
  } else if (key.downArrow) {
    return { action: 'transition', state: navigateBranchDown(state) };
  } else if (key.return) {
    const branch = state.availableBranches[state.selectedBranchIndex];
    const newState = { ...state, selectedBranch: branch };
    return { action: 'async', asyncAction: 'loadDiff', state: newState };
  }
  return { action: 'none' };
}

// Input handling for KB selection
export function handleKBInput(
  state: ScreenState,
  key: KeyInput,
  knowledgeBases: KnowledgeBase[]
): InputResult {
  if (key.upArrow) {
    return { action: 'transition', state: navigateKBUp(state, knowledgeBases.length) };
  } else if (key.downArrow) {
    return { action: 'transition', state: navigateKBDown(state, knowledgeBases.length) };
  } else if (key.return) {
    if (state.selectedKBIndex < knowledgeBases.length) {
      const kb = knowledgeBases[state.selectedKBIndex];
      const newState = { ...state, selectedKB: kb };
      return { action: 'async', asyncAction: 'generate', state: newState };
    } else {
      // Skip - generate without KB
      const newState = { ...state, selectedKB: null };
      return { action: 'async', asyncAction: 'generate', state: newState };
    }
  }
  return { action: 'none' };
}

// Input handling for complete state
export function handleCompleteInput(
  state: ScreenState,
  input: string,
  defaultFilename: string
): InputResult {
  if (input === 's' && state.output) {
    return { action: 'transition', state: goToInputFilename(state, defaultFilename) };
  } else if (input === 'r') {
    return { action: 'transition', state: goToIdle(state) };
  }
  return { action: 'none' };
}

// Input handling for error state
export function handleErrorInput(
  state: ScreenState,
  input: string
): InputResult {
  if (input === 'r') {
    return { action: 'transition', state: goToIdle(state) };
  }
  return { action: 'none' };
}

// Determine if we should go to KB selection or generate directly
export function shouldSelectKB(kbCount: number): boolean {
  return kbCount > 0;
}

// After loading diff
export function afterLoadDiff(
  state: ScreenState,
  diff: string,
  branchInfo: string,
  kbCount: number
): ScreenState {
  const withDiff = { ...state, gitDiff: diff, branchInfo };
  if (shouldSelectKB(kbCount)) {
    return goToSelectKB(withDiff);
  }
  // Will trigger generate directly
  return { ...withDiff, selectedKB: null };
}

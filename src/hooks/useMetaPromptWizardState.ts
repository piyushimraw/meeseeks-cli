/**
 * MetaPrompt Wizard State Management
 *
 * Extracted from MetaPromptInit.tsx for testable screen logic.
 * This module contains pure state management functions and types
 * that can be tested without React rendering.
 */

import type { MetaPromptExtension } from '../types/index.js';
import type { TechStack, OverwriteChoice, FileGenerationResult } from '../utils/metaPrompt/types.js';

// Types
export type WizardStep =
  | 'select-extension'
  | 'detecting-stack'
  | 'confirm-generation'
  | 'checking-existing'
  | 'prompt-overwrite'
  | 'generating'
  | 'complete'
  | 'error';

export interface FileOverwritePrompt {
  file: string;
  existingContent: string;
}

export interface WizardState {
  step: WizardStep;
  extension?: MetaPromptExtension;
  techStack?: TechStack;
  targetDir?: string;
  error?: string;
  selectedExtensionIndex: number;
  filesToPrompt: FileOverwritePrompt[];
  currentFileIndex: number;
  overwriteChoices: Map<string, OverwriteChoice>;
  generationResults: FileGenerationResult[];
}

export interface KeyInput {
  return?: boolean;
  escape?: boolean;
  upArrow?: boolean;
  downArrow?: boolean;
}

export interface ExtensionOption {
  value: MetaPromptExtension;
  label: string;
  description: string;
}

// Available extensions
export const EXTENSIONS: ExtensionOption[] = [
  { value: 'roocode', label: 'RooCode', description: 'RooCode AI assistant extension' },
  { value: 'kilocode', label: 'KiloCode', description: 'KiloCode AI assistant extension' },
];

// Initial state factory
export function createInitialState(): WizardState {
  return {
    step: 'select-extension',
    selectedExtensionIndex: 0,
    filesToPrompt: [],
    currentFileIndex: 0,
    overwriteChoices: new Map(),
    generationResults: [],
  };
}

// Step transitions
export function transitionToDetectingStack(state: WizardState, extension: MetaPromptExtension): WizardState {
  return { ...state, step: 'detecting-stack', extension };
}

export function transitionToConfirmGeneration(
  state: WizardState,
  techStack: TechStack,
  targetDir: string
): WizardState {
  return { ...state, step: 'confirm-generation', techStack, targetDir };
}

export function transitionToCheckingExisting(state: WizardState): WizardState {
  return { ...state, step: 'checking-existing' };
}

export function transitionToPromptOverwrite(
  state: WizardState,
  filesToPrompt: FileOverwritePrompt[]
): WizardState {
  return { ...state, step: 'prompt-overwrite', filesToPrompt };
}

export function transitionToGenerating(state: WizardState): WizardState {
  return { ...state, step: 'generating' };
}

export function transitionToComplete(
  state: WizardState,
  generationResults: FileGenerationResult[]
): WizardState {
  return { ...state, step: 'complete', generationResults };
}

export function transitionToError(state: WizardState, error: string): WizardState {
  return { ...state, step: 'error', error };
}

// Extension selection
export function navigateExtension(state: WizardState, direction: 'up' | 'down'): WizardState {
  const extensionsCount = EXTENSIONS.length;

  if (direction === 'up') {
    return {
      ...state,
      selectedExtensionIndex: state.selectedExtensionIndex > 0
        ? state.selectedExtensionIndex - 1
        : extensionsCount - 1,
    };
  } else {
    return {
      ...state,
      selectedExtensionIndex: state.selectedExtensionIndex < extensionsCount - 1
        ? state.selectedExtensionIndex + 1
        : 0,
    };
  }
}

export function selectExtension(state: WizardState): { state: WizardState; extension: MetaPromptExtension } {
  const selected = EXTENSIONS[state.selectedExtensionIndex];
  const newState = transitionToDetectingStack(state, selected.value);
  return { state: newState, extension: selected.value };
}

// Overwrite handling
export function setOverwriteChoice(
  state: WizardState,
  file: string,
  choice: OverwriteChoice
): WizardState {
  const newChoices = new Map(state.overwriteChoices);
  newChoices.set(file, choice);
  return { ...state, overwriteChoices: newChoices };
}

export function advanceToNextFile(state: WizardState): WizardState {
  if (state.currentFileIndex < state.filesToPrompt.length - 1) {
    return { ...state, currentFileIndex: state.currentFileIndex + 1 };
  }
  return transitionToGenerating(state);
}

export function handleOverwriteChoice(
  state: WizardState,
  choice: OverwriteChoice
): WizardState {
  const currentFile = state.filesToPrompt[state.currentFileIndex];
  const stateWithChoice = setOverwriteChoice(state, currentFile.file, choice);
  return advanceToNextFile(stateWithChoice);
}

export function handleOverwriteAll(state: WizardState): WizardState {
  const newChoices = new Map(state.overwriteChoices);
  for (let i = state.currentFileIndex; i < state.filesToPrompt.length; i++) {
    newChoices.set(state.filesToPrompt[i].file, 'overwrite');
  }
  return transitionToGenerating({ ...state, overwriteChoices: newChoices });
}

// Get current file being prompted
export function getCurrentFile(state: WizardState): FileOverwritePrompt | null {
  if (state.currentFileIndex < state.filesToPrompt.length) {
    return state.filesToPrompt[state.currentFileIndex];
  }
  return null;
}

// Result statistics
export interface GenerationStats {
  created: number;
  updated: number;
  skipped: number;
  errors: FileGenerationResult[];
}

export function getGenerationStats(results: FileGenerationResult[]): GenerationStats {
  return {
    created: results.filter(r => r.status === 'created').length,
    updated: results.filter(r => r.status === 'updated').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    errors: results.filter(r => r.status === 'error'),
  };
}

// Input handler for step-specific actions
export type StepInputResult =
  | { action: 'none' }
  | { action: 'back' }
  | { action: 'transition'; state: WizardState }
  | { action: 'select-extension'; state: WizardState; extension: MetaPromptExtension };

export function handleStepInput(
  state: WizardState,
  input: string,
  key: KeyInput
): StepInputResult {
  // Global quit handling
  if (input === 'q' || key.escape) {
    return { action: 'back' };
  }

  switch (state.step) {
    case 'select-extension':
      if (key.upArrow) {
        return { action: 'transition', state: navigateExtension(state, 'up') };
      } else if (key.downArrow) {
        return { action: 'transition', state: navigateExtension(state, 'down') };
      } else if (key.return) {
        const result = selectExtension(state);
        return { action: 'select-extension', state: result.state, extension: result.extension };
      }
      break;

    case 'confirm-generation':
      if (input === 'y' || key.return) {
        return { action: 'transition', state: transitionToCheckingExisting(state) };
      } else if (input === 'n') {
        return { action: 'back' };
      }
      break;

    case 'prompt-overwrite':
      if (input === 'o') {
        return { action: 'transition', state: handleOverwriteChoice(state, 'overwrite') };
      } else if (input === 's') {
        return { action: 'transition', state: handleOverwriteChoice(state, 'skip') };
      } else if (input === 'a') {
        return { action: 'transition', state: handleOverwriteAll(state) };
      }
      break;

    case 'complete':
    case 'error':
      if (key.return || input === 'q') {
        return { action: 'back' };
      }
      break;
  }

  return { action: 'none' };
}

// Validate extension selection
export function isValidExtension(value: string): value is MetaPromptExtension {
  return value === 'roocode' || value === 'kilocode';
}

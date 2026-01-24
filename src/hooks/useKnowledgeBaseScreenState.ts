/**
 * Knowledge Base Screen State Management
 *
 * Extracted from KnowledgeBase.tsx for testable screen logic.
 * This module contains pure state management functions and types
 * that can be tested without React rendering.
 */

import type { KnowledgeBase as KBType } from '../types/index.js';

// Types
export type ViewState =
  | 'list'
  | 'create-name'
  | 'create-url'
  | 'create-depth'
  | 'detail'
  | 'add-source'
  | 'crawling'
  | 'indexing'
  | 'confirm-delete';

export interface ScreenState {
  viewState: ViewState;
  selectedIndex: number;
  selectedSourceIndex: number;
  selectedKB: KBType | null;
  newName: string;
  newUrl: string;
  newDepth: number;
  error: string | null;
}

export interface KeyInput {
  return?: boolean;
  escape?: boolean;
  upArrow?: boolean;
  downArrow?: boolean;
  leftArrow?: boolean;
  rightArrow?: boolean;
}

// Initial state
export function createInitialState(): ScreenState {
  return {
    viewState: 'list',
    selectedIndex: 0,
    selectedSourceIndex: 0,
    selectedKB: null,
    newName: '',
    newUrl: '',
    newDepth: 2,
    error: null,
  };
}

// State setters
export function setViewState(state: ScreenState, viewState: ViewState): ScreenState {
  return { ...state, viewState };
}

export function setSelectedIndex(state: ScreenState, index: number): ScreenState {
  return { ...state, selectedIndex: index };
}

export function setSelectedSourceIndex(state: ScreenState, index: number): ScreenState {
  return { ...state, selectedSourceIndex: index };
}

export function setSelectedKB(state: ScreenState, kb: KBType | null): ScreenState {
  return { ...state, selectedKB: kb };
}

export function setNewName(state: ScreenState, name: string): ScreenState {
  return { ...state, newName: name };
}

export function setNewUrl(state: ScreenState, url: string): ScreenState {
  return { ...state, newUrl: url };
}

export function setNewDepth(state: ScreenState, depth: number): ScreenState {
  return { ...state, newDepth: Math.min(3, Math.max(1, depth)) };
}

export function setError(state: ScreenState, error: string | null): ScreenState {
  return { ...state, error };
}

export function clearError(state: ScreenState): ScreenState {
  return { ...state, error: null };
}

// Navigation helpers
export function navigateListUp(state: ScreenState, kbCount: number): ScreenState {
  const newIndex = state.selectedIndex > 0
    ? state.selectedIndex - 1
    : Math.max(0, kbCount - 1);
  return { ...state, selectedIndex: newIndex };
}

export function navigateListDown(state: ScreenState, kbCount: number): ScreenState {
  const newIndex = state.selectedIndex < kbCount - 1
    ? state.selectedIndex + 1
    : 0;
  return { ...state, selectedIndex: newIndex };
}

export function navigateSourceUp(state: ScreenState): ScreenState {
  if (!state.selectedKB || state.selectedKB.sources.length === 0) {
    return state;
  }
  const sourceCount = state.selectedKB.sources.length;
  const newIndex = state.selectedSourceIndex > 0
    ? state.selectedSourceIndex - 1
    : sourceCount - 1;
  return { ...state, selectedSourceIndex: newIndex };
}

export function navigateSourceDown(state: ScreenState): ScreenState {
  if (!state.selectedKB || state.selectedKB.sources.length === 0) {
    return state;
  }
  const sourceCount = state.selectedKB.sources.length;
  const newIndex = state.selectedSourceIndex < sourceCount - 1
    ? state.selectedSourceIndex + 1
    : 0;
  return { ...state, selectedSourceIndex: newIndex };
}

export function incrementDepth(state: ScreenState): ScreenState {
  return setNewDepth(state, state.newDepth + 1);
}

export function decrementDepth(state: ScreenState): ScreenState {
  return setNewDepth(state, state.newDepth - 1);
}

// Transition helpers
export function goToList(state: ScreenState): ScreenState {
  return {
    ...state,
    viewState: 'list',
    selectedKB: null,
    selectedSourceIndex: 0,
    error: null,
  };
}

export function goToDetail(state: ScreenState, kb: KBType): ScreenState {
  return {
    ...state,
    viewState: 'detail',
    selectedKB: kb,
    selectedSourceIndex: 0,
  };
}

export function goToCreateName(state: ScreenState): ScreenState {
  return {
    ...state,
    viewState: 'create-name',
    newName: '',
    newUrl: '',
    newDepth: 2,
    error: null,
  };
}

export function goToCreateUrl(state: ScreenState): ScreenState {
  return { ...state, viewState: 'create-url', error: null };
}

export function goToCreateDepth(state: ScreenState): ScreenState {
  return { ...state, viewState: 'create-depth', error: null };
}

export function goToAddSource(state: ScreenState): ScreenState {
  return { ...state, viewState: 'add-source', newUrl: '', error: null };
}

export function goToCrawling(state: ScreenState): ScreenState {
  return { ...state, viewState: 'crawling' };
}

export function goToIndexing(state: ScreenState): ScreenState {
  return { ...state, viewState: 'indexing', error: null };
}

export function goToConfirmDelete(state: ScreenState, kb: KBType): ScreenState {
  return { ...state, viewState: 'confirm-delete', selectedKB: kb };
}

// Validation
export function validateName(name: string): { valid: boolean; error?: string } {
  if (!name.trim()) {
    return { valid: false, error: 'Name is required' };
  }
  return { valid: true };
}

export function validateUrl(url: string): { valid: boolean; error?: string } {
  if (!url.trim()) {
    return { valid: false, error: 'URL is required' };
  }
  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

// Back navigation logic
export type BackResult =
  | { action: 'exit' }
  | { action: 'transition'; state: ScreenState };

export function handleBack(state: ScreenState): BackResult {
  switch (state.viewState) {
    case 'list':
      return { action: 'exit' };
    case 'detail':
    case 'confirm-delete':
      return { action: 'transition', state: goToList(state) };
    case 'create-name':
      return { action: 'transition', state: goToList(state) };
    case 'create-url':
      return { action: 'transition', state: { ...state, viewState: 'create-name', error: null } };
    case 'create-depth':
      return { action: 'transition', state: { ...state, viewState: 'create-url', error: null } };
    case 'add-source':
      return { action: 'transition', state: { ...state, viewState: 'detail', error: null } };
    default:
      return { action: 'exit' };
  }
}

// Input handler result types
export type InputResult =
  | { action: 'none' }
  | { action: 'back' }
  | { action: 'exit' }
  | { action: 'transition'; state: ScreenState }
  | { action: 'async'; asyncAction: 'createKB' | 'crawlSource' | 'indexKB' | 'removeSource' | 'deleteKB' | 'addSource'; state: ScreenState };

// Input handling for list view
export function handleListInput(
  state: ScreenState,
  input: string,
  key: KeyInput,
  knowledgeBases: KBType[]
): InputResult {
  if (key.upArrow) {
    return { action: 'transition', state: navigateListUp(state, knowledgeBases.length) };
  } else if (key.downArrow) {
    return { action: 'transition', state: navigateListDown(state, knowledgeBases.length) };
  } else if (key.return && knowledgeBases.length > 0) {
    const kb = knowledgeBases[state.selectedIndex];
    return { action: 'transition', state: goToDetail(state, kb) };
  } else if (input === 'n') {
    return { action: 'transition', state: goToCreateName(state) };
  } else if (input === 'd' && knowledgeBases.length > 0) {
    const kb = knowledgeBases[state.selectedIndex];
    return { action: 'transition', state: goToConfirmDelete(state, kb) };
  }
  return { action: 'none' };
}

// Input handling for detail view
export function handleDetailInput(
  state: ScreenState,
  input: string,
  key: KeyInput
): InputResult {
  if (!state.selectedKB) {
    return { action: 'none' };
  }

  if (key.upArrow && state.selectedKB.sources.length > 0) {
    return { action: 'transition', state: navigateSourceUp(state) };
  } else if (key.downArrow && state.selectedKB.sources.length > 0) {
    return { action: 'transition', state: navigateSourceDown(state) };
  } else if (input === 'a') {
    return { action: 'transition', state: goToAddSource(state) };
  } else if (input === 'c' && state.selectedKB.sources.length > 0) {
    const source = state.selectedKB.sources[state.selectedSourceIndex];
    if (source && source.status !== 'crawling') {
      return { action: 'async', asyncAction: 'crawlSource', state: goToCrawling(state) };
    }
  } else if (input === 'i') {
    return { action: 'async', asyncAction: 'indexKB', state: goToIndexing(state) };
  } else if (input === 'r' && state.selectedKB.sources.length > 0) {
    return { action: 'async', asyncAction: 'removeSource', state };
  }
  return { action: 'none' };
}

// Input handling for confirm delete
export function handleConfirmDeleteInput(
  state: ScreenState,
  input: string
): InputResult {
  if (input === 'y' && state.selectedKB) {
    return { action: 'async', asyncAction: 'deleteKB', state };
  } else if (input === 'n') {
    return { action: 'transition', state: goToList(state) };
  }
  return { action: 'none' };
}

// Input handling for depth selection
export function handleDepthInput(
  state: ScreenState,
  key: KeyInput
): InputResult {
  if (key.upArrow || key.leftArrow) {
    return { action: 'transition', state: decrementDepth(state) };
  } else if (key.downArrow || key.rightArrow) {
    return { action: 'transition', state: incrementDepth(state) };
  } else if (key.return) {
    return { action: 'async', asyncAction: 'createKB', state };
  }
  return { action: 'none' };
}

// After delete cleanup
export function afterDelete(state: ScreenState, kbCount: number): ScreenState {
  const newIndex = Math.max(0, Math.min(state.selectedIndex, kbCount - 1));
  return {
    ...goToList(state),
    selectedIndex: newIndex,
  };
}

// After source remove cleanup
export function afterSourceRemove(state: ScreenState, updatedKB: KBType | null): ScreenState {
  if (!updatedKB) {
    return state;
  }
  const newSourceIndex = state.selectedSourceIndex >= updatedKB.sources.length
    ? Math.max(0, updatedKB.sources.length - 1)
    : state.selectedSourceIndex;
  return {
    ...state,
    selectedKB: updatedKB,
    selectedSourceIndex: newSourceIndex,
  };
}

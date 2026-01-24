import { describe, it, expect, beforeEach } from 'vitest';
import type { KnowledgeBase, SearchResult } from '../types/index.js';
import {
  createInitialState,
  setState,
  setOutput,
  setError,
  setSelectedKBIndex,
  setSelectedKB,
  setGitDiff,
  setBranchInfo,
  setSearchResults,
  setModelInfo,
  setUsageInfo,
  setDiffMode,
  setDiffModeIndex,
  setAvailableBranches,
  setSelectedBranchIndex,
  setSelectedBranch,
  setFilename,
  setSavedPath,
  setCondenseInfo,
  navigateDiffModeUp,
  navigateDiffModeDown,
  navigateBranchUp,
  navigateBranchDown,
  navigateKBUp,
  navigateKBDown,
  goToSelectDiffMode,
  goToSelectBranch,
  goToLoadingDiff,
  goToSelectKB,
  goToSearching,
  goToGenerating,
  goToComplete,
  goToError,
  goToInputFilename,
  goToSaving,
  goToSaved,
  goToIdle,
  handleBack,
  validateFilename,
  handleIdleInput,
  handleDiffModeInput,
  handleBranchInput,
  handleKBInput,
  handleCompleteInput,
  handleErrorInput,
  shouldSelectKB,
  afterLoadDiff,
  type ScreenState,
  type QAPlanState,
} from './useQAPlanScreenState.js';

// Test fixtures
const createMockKB = (overrides: Partial<KnowledgeBase> = {}): KnowledgeBase => ({
  id: 'kb-1',
  name: 'Test KB',
  crawlDepth: 2,
  createdAt: '2024-01-01T00:00:00Z',
  totalPages: 50,
  sources: [],
  ...overrides,
});

describe('useQAPlanScreenState', () => {
  describe('createInitialState', () => {
    it('creates initial state with defaults', () => {
      const state = createInitialState();

      expect(state.state).toBe('idle');
      expect(state.output).toBeNull();
      expect(state.error).toBeNull();
      expect(state.selectedKBIndex).toBe(0);
      expect(state.selectedKB).toBeNull();
      expect(state.gitDiff).toBe('');
      expect(state.branchInfo).toBe('unknown');
      expect(state.searchResults).toEqual([]);
      expect(state.diffMode).toBeNull();
      expect(state.diffModeIndex).toBe(0);
      expect(state.availableBranches).toEqual([]);
      expect(state.selectedBranchIndex).toBe(0);
      expect(state.selectedBranch).toBeNull();
      expect(state.filename).toBe('');
      expect(state.savedPath).toBeNull();
      expect(state.condenseInfo).toBeNull();
    });

    it('accepts custom branch info', () => {
      const state = createInitialState('main');
      expect(state.branchInfo).toBe('main');
    });
  });

  describe('State setters', () => {
    let state: ScreenState;

    beforeEach(() => {
      state = createInitialState();
    });

    it('setState updates state', () => {
      const newState = setState(state, 'generating');
      expect(newState.state).toBe('generating');
    });

    it('setOutput updates output', () => {
      const newState = setOutput(state, 'test output');
      expect(newState.output).toBe('test output');
    });

    it('setError updates error', () => {
      const newState = setError(state, 'test error');
      expect(newState.error).toBe('test error');
    });

    it('setSelectedKBIndex updates index', () => {
      const newState = setSelectedKBIndex(state, 5);
      expect(newState.selectedKBIndex).toBe(5);
    });

    it('setSelectedKB updates KB', () => {
      const kb = createMockKB();
      const newState = setSelectedKB(state, kb);
      expect(newState.selectedKB).toBe(kb);
    });

    it('setGitDiff updates diff', () => {
      const newState = setGitDiff(state, 'diff content');
      expect(newState.gitDiff).toBe('diff content');
    });

    it('setBranchInfo updates branch info', () => {
      const newState = setBranchInfo(state, 'feature/test');
      expect(newState.branchInfo).toBe('feature/test');
    });

    it('setSearchResults updates results', () => {
      const results: SearchResult[] = [{
        chunk: {
          id: 1,
          pageHash: 'hash1',
          pageUrl: 'https://test.com',
          pageTitle: 'Test',
          text: 'Content',
          startIdx: 0,
          endIdx: 100,
        },
        score: 0.9,
      }];
      const newState = setSearchResults(state, results);
      expect(newState.searchResults).toBe(results);
    });

    it('setModelInfo updates model info', () => {
      const newState = setModelInfo(state, 'gpt-4');
      expect(newState.modelInfo).toBe('gpt-4');
    });

    it('setUsageInfo updates usage', () => {
      const usage = { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 };
      const newState = setUsageInfo(state, usage);
      expect(newState.usageInfo).toBe(usage);
    });

    it('setDiffMode updates mode', () => {
      const newState = setDiffMode(state, 'branch');
      expect(newState.diffMode).toBe('branch');
    });

    it('setDiffModeIndex updates index', () => {
      const newState = setDiffModeIndex(state, 1);
      expect(newState.diffModeIndex).toBe(1);
    });

    it('setAvailableBranches updates branches', () => {
      const branches = ['main', 'develop'];
      const newState = setAvailableBranches(state, branches);
      expect(newState.availableBranches).toBe(branches);
    });

    it('setSelectedBranchIndex updates index', () => {
      const newState = setSelectedBranchIndex(state, 2);
      expect(newState.selectedBranchIndex).toBe(2);
    });

    it('setSelectedBranch updates branch', () => {
      const newState = setSelectedBranch(state, 'develop');
      expect(newState.selectedBranch).toBe('develop');
    });

    it('setFilename updates filename', () => {
      const newState = setFilename(state, 'test.md');
      expect(newState.filename).toBe('test.md');
    });

    it('setSavedPath updates path', () => {
      const newState = setSavedPath(state, '/path/to/file.md');
      expect(newState.savedPath).toBe('/path/to/file.md');
    });
  });

  describe('Navigation helpers', () => {
    let state: ScreenState;

    beforeEach(() => {
      state = createInitialState();
      state.availableBranches = ['main', 'develop', 'feature/test'];
    });

    describe('Diff mode navigation', () => {
      it('navigateDiffModeUp decrements', () => {
        state.diffModeIndex = 1;
        const newState = navigateDiffModeUp(state);
        expect(newState.diffModeIndex).toBe(0);
      });

      it('navigateDiffModeUp wraps to 1', () => {
        state.diffModeIndex = 0;
        const newState = navigateDiffModeUp(state);
        expect(newState.diffModeIndex).toBe(1);
      });

      it('navigateDiffModeDown increments', () => {
        state.diffModeIndex = 0;
        const newState = navigateDiffModeDown(state);
        expect(newState.diffModeIndex).toBe(1);
      });

      it('navigateDiffModeDown wraps to 0', () => {
        state.diffModeIndex = 1;
        const newState = navigateDiffModeDown(state);
        expect(newState.diffModeIndex).toBe(0);
      });
    });

    describe('Branch navigation', () => {
      it('navigateBranchUp decrements', () => {
        state.selectedBranchIndex = 1;
        const newState = navigateBranchUp(state);
        expect(newState.selectedBranchIndex).toBe(0);
      });

      it('navigateBranchUp wraps to end', () => {
        state.selectedBranchIndex = 0;
        const newState = navigateBranchUp(state);
        expect(newState.selectedBranchIndex).toBe(2);
      });

      it('navigateBranchDown increments', () => {
        state.selectedBranchIndex = 0;
        const newState = navigateBranchDown(state);
        expect(newState.selectedBranchIndex).toBe(1);
      });

      it('navigateBranchDown wraps to start', () => {
        state.selectedBranchIndex = 2;
        const newState = navigateBranchDown(state);
        expect(newState.selectedBranchIndex).toBe(0);
      });
    });

    describe('KB navigation', () => {
      it('navigateKBUp with KBs', () => {
        state.selectedKBIndex = 1;
        const newState = navigateKBUp(state, 2); // 2 KBs + skip = 3 options
        expect(newState.selectedKBIndex).toBe(0);
      });

      it('navigateKBUp wraps around', () => {
        state.selectedKBIndex = 0;
        const newState = navigateKBUp(state, 2);
        expect(newState.selectedKBIndex).toBe(2); // Skip option
      });

      it('navigateKBDown with KBs', () => {
        state.selectedKBIndex = 0;
        const newState = navigateKBDown(state, 2);
        expect(newState.selectedKBIndex).toBe(1);
      });

      it('navigateKBDown wraps around', () => {
        state.selectedKBIndex = 2; // Skip option
        const newState = navigateKBDown(state, 2);
        expect(newState.selectedKBIndex).toBe(0);
      });
    });
  });

  describe('Transition helpers', () => {
    let state: ScreenState;

    beforeEach(() => {
      state = createInitialState();
    });

    it('goToSelectDiffMode sets state and branches', () => {
      const branches = ['main', 'develop'];
      const newState = goToSelectDiffMode(state, branches);

      expect(newState.state).toBe('select-diff-mode');
      expect(newState.availableBranches).toBe(branches);
      expect(newState.diffModeIndex).toBe(0);
    });

    it('goToSelectBranch sets state and mode', () => {
      const newState = goToSelectBranch(state);

      expect(newState.state).toBe('select-branch');
      expect(newState.diffMode).toBe('branch');
      expect(newState.selectedBranchIndex).toBe(0);
    });

    it('goToLoadingDiff sets state', () => {
      const newState = goToLoadingDiff(state);
      expect(newState.state).toBe('loading-diff');
    });

    it('goToSelectKB sets state', () => {
      const newState = goToSelectKB(state);
      expect(newState.state).toBe('select-kb');
    });

    it('goToSearching sets state', () => {
      const newState = goToSearching(state);
      expect(newState.state).toBe('searching');
    });

    it('goToGenerating sets state', () => {
      const newState = goToGenerating(state);
      expect(newState.state).toBe('generating');
    });

    it('goToComplete sets all completion fields', () => {
      const usage = { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 };
      const newState = goToComplete(state, 'output', 'gpt-4', usage);

      expect(newState.state).toBe('complete');
      expect(newState.output).toBe('output');
      expect(newState.modelInfo).toBe('gpt-4');
      expect(newState.usageInfo).toBe(usage);
    });

    it('goToError sets state and error', () => {
      const newState = goToError(state, 'error message');

      expect(newState.state).toBe('error');
      expect(newState.error).toBe('error message');
    });

    it('goToInputFilename sets state and filename', () => {
      const newState = goToInputFilename(state, 'default.md');

      expect(newState.state).toBe('input-filename');
      expect(newState.filename).toBe('default.md');
      expect(newState.error).toBeNull();
    });

    it('goToSaving sets state', () => {
      const newState = goToSaving(state);

      expect(newState.state).toBe('saving');
      expect(newState.error).toBeNull();
    });

    it('goToSaved sets state and path', () => {
      const newState = goToSaved(state, '/path/to/saved.md');

      expect(newState.state).toBe('saved');
      expect(newState.savedPath).toBe('/path/to/saved.md');
    });

    it('goToIdle resets all fields', () => {
      state.state = 'complete';
      state.output = 'old output';
      state.error = 'old error';
      state.selectedKB = createMockKB();
      state.gitDiff = 'old diff';
      const newState = goToIdle(state);

      expect(newState.state).toBe('idle');
      expect(newState.output).toBeNull();
      expect(newState.error).toBeNull();
      expect(newState.selectedKB).toBeNull();
      expect(newState.selectedKBIndex).toBe(0);
      expect(newState.searchResults).toEqual([]);
      expect(newState.modelInfo).toBeNull();
      expect(newState.usageInfo).toBeNull();
      expect(newState.diffMode).toBeNull();
      expect(newState.gitDiff).toBe('');
      expect(newState.filename).toBe('');
      expect(newState.savedPath).toBeNull();
      expect(newState.condenseInfo).toBeNull();
    });
  });

  describe('handleBack', () => {
    let state: ScreenState;

    beforeEach(() => {
      state = createInitialState();
    });

    it('from select-diff-mode goes to idle', () => {
      state.state = 'select-diff-mode';
      const result = handleBack(state);

      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.state).toBe('idle');
      }
    });

    it('from select-branch goes to select-diff-mode', () => {
      state.state = 'select-branch';
      const result = handleBack(state);

      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.state).toBe('select-diff-mode');
      }
    });

    it('from select-kb goes to select-diff-mode', () => {
      state.state = 'select-kb';
      const result = handleBack(state);

      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.state).toBe('select-diff-mode');
      }
    });

    it('from input-filename goes to complete', () => {
      state.state = 'input-filename';
      state.error = 'some error';
      const result = handleBack(state);

      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.state).toBe('complete');
        expect(result.state.error).toBeNull();
      }
    });

    it('from saved goes to complete', () => {
      state.state = 'saved';
      state.savedPath = '/path/to/file.md';
      const result = handleBack(state);

      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.state).toBe('complete');
        expect(result.state.savedPath).toBeNull();
      }
    });

    it('from other states exits', () => {
      state.state = 'idle';
      const result = handleBack(state);
      expect(result.action).toBe('exit');
    });
  });

  describe('validateFilename', () => {
    it('accepts valid filename', () => {
      const result = validateFilename('test.md');
      expect(result.valid).toBe(true);
    });

    it('rejects empty filename', () => {
      const result = validateFilename('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Filename is required');
    });

    it('rejects whitespace-only filename', () => {
      const result = validateFilename('   ');
      expect(result.valid).toBe(false);
    });
  });

  describe('handleIdleInput', () => {
    let state: ScreenState;

    beforeEach(() => {
      state = createInitialState();
    });

    it('g when connected goes to select-diff-mode', () => {
      const branches = ['main', 'develop'];
      const result = handleIdleInput(state, 'g', true, branches);

      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.state).toBe('select-diff-mode');
        expect(result.state.availableBranches).toBe(branches);
      }
    });

    it('g when not connected does nothing', () => {
      const result = handleIdleInput(state, 'g', false, []);
      expect(result.action).toBe('none');
    });

    it('other input does nothing', () => {
      const result = handleIdleInput(state, 'x', true, []);
      expect(result.action).toBe('none');
    });
  });

  describe('handleDiffModeInput', () => {
    let state: ScreenState;

    beforeEach(() => {
      state = createInitialState();
      state.state = 'select-diff-mode';
      state.availableBranches = ['main', 'develop'];
    });

    it('upArrow navigates', () => {
      state.diffModeIndex = 1;
      const result = handleDiffModeInput(state, { upArrow: true });

      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.diffModeIndex).toBe(0);
      }
    });

    it('downArrow navigates', () => {
      const result = handleDiffModeInput(state, { downArrow: true });

      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.diffModeIndex).toBe(1);
      }
    });

    it('return on branch with branches goes to select-branch', () => {
      state.diffModeIndex = 0;
      const result = handleDiffModeInput(state, { return: true });

      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.state).toBe('select-branch');
      }
    });

    it('return on branch without branches triggers loadDiff', () => {
      state.diffModeIndex = 0;
      state.availableBranches = [];
      const result = handleDiffModeInput(state, { return: true });

      expect(result.action).toBe('async');
      if (result.action === 'async') {
        expect(result.asyncAction).toBe('loadDiff');
        expect(result.state.diffMode).toBe('branch');
      }
    });

    it('return on uncommitted triggers loadDiff', () => {
      state.diffModeIndex = 1;
      const result = handleDiffModeInput(state, { return: true });

      expect(result.action).toBe('async');
      if (result.action === 'async') {
        expect(result.asyncAction).toBe('loadDiff');
        expect(result.state.diffMode).toBe('uncommitted');
      }
    });
  });

  describe('handleBranchInput', () => {
    let state: ScreenState;

    beforeEach(() => {
      state = createInitialState();
      state.state = 'select-branch';
      state.availableBranches = ['main', 'develop', 'feature/test'];
    });

    it('upArrow navigates', () => {
      state.selectedBranchIndex = 1;
      const result = handleBranchInput(state, { upArrow: true });

      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.selectedBranchIndex).toBe(0);
      }
    });

    it('downArrow navigates', () => {
      const result = handleBranchInput(state, { downArrow: true });

      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.selectedBranchIndex).toBe(1);
      }
    });

    it('return selects branch and triggers loadDiff', () => {
      state.selectedBranchIndex = 1;
      const result = handleBranchInput(state, { return: true });

      expect(result.action).toBe('async');
      if (result.action === 'async') {
        expect(result.asyncAction).toBe('loadDiff');
        expect(result.state.selectedBranch).toBe('develop');
      }
    });
  });

  describe('handleKBInput', () => {
    let state: ScreenState;
    const kbs = [createMockKB({ id: 'kb-1', name: 'KB 1' }), createMockKB({ id: 'kb-2', name: 'KB 2' })];

    beforeEach(() => {
      state = createInitialState();
      state.state = 'select-kb';
    });

    it('upArrow navigates', () => {
      state.selectedKBIndex = 1;
      const result = handleKBInput(state, { upArrow: true }, kbs);

      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.selectedKBIndex).toBe(0);
      }
    });

    it('downArrow navigates', () => {
      const result = handleKBInput(state, { downArrow: true }, kbs);

      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.selectedKBIndex).toBe(1);
      }
    });

    it('return on KB triggers generate with KB', () => {
      state.selectedKBIndex = 0;
      const result = handleKBInput(state, { return: true }, kbs);

      expect(result.action).toBe('async');
      if (result.action === 'async') {
        expect(result.asyncAction).toBe('generate');
        expect(result.state.selectedKB).toBe(kbs[0]);
      }
    });

    it('return on Skip triggers generate without KB', () => {
      state.selectedKBIndex = 2; // Skip option
      const result = handleKBInput(state, { return: true }, kbs);

      expect(result.action).toBe('async');
      if (result.action === 'async') {
        expect(result.asyncAction).toBe('generate');
        expect(result.state.selectedKB).toBeNull();
      }
    });
  });

  describe('handleCompleteInput', () => {
    let state: ScreenState;

    beforeEach(() => {
      state = createInitialState();
      state.state = 'complete';
      state.output = 'QA plan output';
    });

    it('s with output goes to input-filename', () => {
      const result = handleCompleteInput(state, 's', 'default.md');

      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.state).toBe('input-filename');
        expect(result.state.filename).toBe('default.md');
      }
    });

    it('s without output does nothing', () => {
      state.output = null;
      const result = handleCompleteInput(state, 's', 'default.md');
      expect(result.action).toBe('none');
    });

    it('r resets to idle', () => {
      const result = handleCompleteInput(state, 'r', 'default.md');

      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.state).toBe('idle');
      }
    });
  });

  describe('handleErrorInput', () => {
    let state: ScreenState;

    beforeEach(() => {
      state = createInitialState();
      state.state = 'error';
      state.error = 'some error';
    });

    it('r resets to idle', () => {
      const result = handleErrorInput(state, 'r');

      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.state).toBe('idle');
      }
    });

    it('other input does nothing', () => {
      const result = handleErrorInput(state, 'x');
      expect(result.action).toBe('none');
    });
  });

  describe('shouldSelectKB', () => {
    it('returns true with KBs', () => {
      expect(shouldSelectKB(2)).toBe(true);
    });

    it('returns false without KBs', () => {
      expect(shouldSelectKB(0)).toBe(false);
    });
  });

  describe('afterLoadDiff', () => {
    it('goes to select-kb when KBs available', () => {
      const state = createInitialState();
      const newState = afterLoadDiff(state, 'diff content', 'main -> develop', 2);

      expect(newState.state).toBe('select-kb');
      expect(newState.gitDiff).toBe('diff content');
      expect(newState.branchInfo).toBe('main -> develop');
    });

    it('sets selectedKB null when no KBs', () => {
      const state = createInitialState();
      const newState = afterLoadDiff(state, 'diff content', 'main', 0);

      expect(newState.gitDiff).toBe('diff content');
      expect(newState.selectedKB).toBeNull();
    });
  });

  describe('State immutability', () => {
    it('does not mutate original state', () => {
      const state = createInitialState();
      const originalState = state.state;

      setState(state, 'generating');

      expect(state.state).toBe(originalState);
    });
  });
});

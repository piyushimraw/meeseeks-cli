import { describe, it, expect, beforeEach } from 'vitest';
import type { KnowledgeBase as KBType } from '../types/index.js';
import {
  createInitialState,
  setViewState,
  setSelectedIndex,
  setSelectedSourceIndex,
  setSelectedKB,
  setNewName,
  setNewUrl,
  setNewDepth,
  setError,
  clearError,
  navigateListUp,
  navigateListDown,
  navigateSourceUp,
  navigateSourceDown,
  incrementDepth,
  decrementDepth,
  goToList,
  goToDetail,
  goToCreateName,
  goToCreateUrl,
  goToCreateDepth,
  goToAddSource,
  goToCrawling,
  goToIndexing,
  goToConfirmDelete,
  validateName,
  validateUrl,
  handleBack,
  handleListInput,
  handleDetailInput,
  handleConfirmDeleteInput,
  handleDepthInput,
  afterDelete,
  afterSourceRemove,
  type ScreenState,
  type ViewState,
} from './useKnowledgeBaseScreenState.js';

// Test fixtures
const createMockKB = (overrides: Partial<KBType> = {}): KBType => ({
  id: 'kb-1',
  name: 'Test KB',
  crawlDepth: 2,
  createdAt: '2024-01-01T00:00:00Z',
  totalPages: 50,
  sources: [
    {
      id: 'src-1',
      url: 'https://docs.example.com',
      addedAt: '2024-01-01T00:00:00Z',
      status: 'complete',
      pageCount: 25,
      lastCrawledAt: '2024-01-15T00:00:00Z',
    },
    {
      id: 'src-2',
      url: 'https://api.example.com',
      addedAt: '2024-01-02T00:00:00Z',
      status: 'pending',
      pageCount: 0,
    },
  ],
  ...overrides,
});

describe('useKnowledgeBaseScreenState', () => {
  describe('createInitialState', () => {
    it('creates initial state with correct defaults', () => {
      const state = createInitialState();

      expect(state.viewState).toBe('list');
      expect(state.selectedIndex).toBe(0);
      expect(state.selectedSourceIndex).toBe(0);
      expect(state.selectedKB).toBeNull();
      expect(state.newName).toBe('');
      expect(state.newUrl).toBe('');
      expect(state.newDepth).toBe(2);
      expect(state.error).toBeNull();
    });
  });

  describe('State setters', () => {
    let state: ScreenState;

    beforeEach(() => {
      state = createInitialState();
    });

    it('setViewState changes view', () => {
      const newState = setViewState(state, 'detail');
      expect(newState.viewState).toBe('detail');
    });

    it('setSelectedIndex updates index', () => {
      const newState = setSelectedIndex(state, 5);
      expect(newState.selectedIndex).toBe(5);
    });

    it('setSelectedSourceIndex updates source index', () => {
      const newState = setSelectedSourceIndex(state, 3);
      expect(newState.selectedSourceIndex).toBe(3);
    });

    it('setSelectedKB updates KB', () => {
      const kb = createMockKB();
      const newState = setSelectedKB(state, kb);
      expect(newState.selectedKB).toBe(kb);
    });

    it('setNewName updates name', () => {
      const newState = setNewName(state, 'Test Name');
      expect(newState.newName).toBe('Test Name');
    });

    it('setNewUrl updates URL', () => {
      const newState = setNewUrl(state, 'https://test.com');
      expect(newState.newUrl).toBe('https://test.com');
    });

    it('setNewDepth clamps between 1 and 3', () => {
      expect(setNewDepth(state, 0).newDepth).toBe(1);
      expect(setNewDepth(state, 1).newDepth).toBe(1);
      expect(setNewDepth(state, 2).newDepth).toBe(2);
      expect(setNewDepth(state, 3).newDepth).toBe(3);
      expect(setNewDepth(state, 5).newDepth).toBe(3);
    });

    it('setError sets error message', () => {
      const newState = setError(state, 'Test error');
      expect(newState.error).toBe('Test error');
    });

    it('clearError clears error', () => {
      state.error = 'Some error';
      const newState = clearError(state);
      expect(newState.error).toBeNull();
    });
  });

  describe('Navigation helpers', () => {
    let state: ScreenState;

    beforeEach(() => {
      state = createInitialState();
      state.selectedKB = createMockKB();
    });

    describe('List navigation', () => {
      it('navigateListUp decrements index', () => {
        state.selectedIndex = 2;
        const newState = navigateListUp(state, 5);
        expect(newState.selectedIndex).toBe(1);
      });

      it('navigateListUp wraps to bottom', () => {
        state.selectedIndex = 0;
        const newState = navigateListUp(state, 5);
        expect(newState.selectedIndex).toBe(4);
      });

      it('navigateListUp handles empty list', () => {
        const newState = navigateListUp(state, 0);
        expect(newState.selectedIndex).toBe(0);
      });

      it('navigateListDown increments index', () => {
        state.selectedIndex = 1;
        const newState = navigateListDown(state, 5);
        expect(newState.selectedIndex).toBe(2);
      });

      it('navigateListDown wraps to top', () => {
        state.selectedIndex = 4;
        const newState = navigateListDown(state, 5);
        expect(newState.selectedIndex).toBe(0);
      });
    });

    describe('Source navigation', () => {
      it('navigateSourceUp decrements index', () => {
        state.selectedSourceIndex = 1;
        const newState = navigateSourceUp(state);
        expect(newState.selectedSourceIndex).toBe(0);
      });

      it('navigateSourceUp wraps to bottom', () => {
        state.selectedSourceIndex = 0;
        const newState = navigateSourceUp(state);
        expect(newState.selectedSourceIndex).toBe(1); // 2 sources in mock
      });

      it('navigateSourceUp handles no selected KB', () => {
        state.selectedKB = null;
        const newState = navigateSourceUp(state);
        expect(newState).toBe(state);
      });

      it('navigateSourceUp handles empty sources', () => {
        state.selectedKB = createMockKB({ sources: [] });
        const newState = navigateSourceUp(state);
        expect(newState).toBe(state);
      });

      it('navigateSourceDown increments index', () => {
        state.selectedSourceIndex = 0;
        const newState = navigateSourceDown(state);
        expect(newState.selectedSourceIndex).toBe(1);
      });

      it('navigateSourceDown wraps to top', () => {
        state.selectedSourceIndex = 1;
        const newState = navigateSourceDown(state);
        expect(newState.selectedSourceIndex).toBe(0);
      });
    });

    describe('Depth navigation', () => {
      it('incrementDepth increases depth', () => {
        state.newDepth = 1;
        const newState = incrementDepth(state);
        expect(newState.newDepth).toBe(2);
      });

      it('incrementDepth clamps at 3', () => {
        state.newDepth = 3;
        const newState = incrementDepth(state);
        expect(newState.newDepth).toBe(3);
      });

      it('decrementDepth decreases depth', () => {
        state.newDepth = 2;
        const newState = decrementDepth(state);
        expect(newState.newDepth).toBe(1);
      });

      it('decrementDepth clamps at 1', () => {
        state.newDepth = 1;
        const newState = decrementDepth(state);
        expect(newState.newDepth).toBe(1);
      });
    });
  });

  describe('Transition helpers', () => {
    let state: ScreenState;
    const mockKB = createMockKB();

    beforeEach(() => {
      state = createInitialState();
      state.selectedKB = mockKB;
      state.error = 'Some error';
    });

    it('goToList resets to list view', () => {
      state.viewState = 'detail';
      const newState = goToList(state);

      expect(newState.viewState).toBe('list');
      expect(newState.selectedKB).toBeNull();
      expect(newState.selectedSourceIndex).toBe(0);
      expect(newState.error).toBeNull();
    });

    it('goToDetail sets KB and resets source index', () => {
      const newState = goToDetail(state, mockKB);

      expect(newState.viewState).toBe('detail');
      expect(newState.selectedKB).toBe(mockKB);
      expect(newState.selectedSourceIndex).toBe(0);
    });

    it('goToCreateName resets create form', () => {
      state.newName = 'Old name';
      state.newUrl = 'https://old.com';
      state.newDepth = 3;
      const newState = goToCreateName(state);

      expect(newState.viewState).toBe('create-name');
      expect(newState.newName).toBe('');
      expect(newState.newUrl).toBe('');
      expect(newState.newDepth).toBe(2);
      expect(newState.error).toBeNull();
    });

    it('goToCreateUrl transitions with clear error', () => {
      const newState = goToCreateUrl(state);
      expect(newState.viewState).toBe('create-url');
      expect(newState.error).toBeNull();
    });

    it('goToCreateDepth transitions with clear error', () => {
      const newState = goToCreateDepth(state);
      expect(newState.viewState).toBe('create-depth');
      expect(newState.error).toBeNull();
    });

    it('goToAddSource resets URL and error', () => {
      state.newUrl = 'https://old.com';
      const newState = goToAddSource(state);

      expect(newState.viewState).toBe('add-source');
      expect(newState.newUrl).toBe('');
      expect(newState.error).toBeNull();
    });

    it('goToCrawling transitions', () => {
      const newState = goToCrawling(state);
      expect(newState.viewState).toBe('crawling');
    });

    it('goToIndexing transitions and clears error', () => {
      const newState = goToIndexing(state);
      expect(newState.viewState).toBe('indexing');
      expect(newState.error).toBeNull();
    });

    it('goToConfirmDelete sets KB and transitions', () => {
      const newState = goToConfirmDelete(state, mockKB);
      expect(newState.viewState).toBe('confirm-delete');
      expect(newState.selectedKB).toBe(mockKB);
    });
  });

  describe('Validation', () => {
    describe('validateName', () => {
      it('accepts valid name', () => {
        const result = validateName('My KB');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('rejects empty name', () => {
        const result = validateName('');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Name is required');
      });

      it('rejects whitespace-only name', () => {
        const result = validateName('   ');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Name is required');
      });
    });

    describe('validateUrl', () => {
      it('accepts valid URL', () => {
        const result = validateUrl('https://example.com');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('accepts URL with path', () => {
        const result = validateUrl('https://example.com/docs/api');
        expect(result.valid).toBe(true);
      });

      it('rejects empty URL', () => {
        const result = validateUrl('');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('URL is required');
      });

      it('rejects invalid URL', () => {
        const result = validateUrl('not-a-url');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid URL format');
      });
    });
  });

  describe('handleBack', () => {
    let state: ScreenState;

    beforeEach(() => {
      state = createInitialState();
    });

    it('from list returns exit', () => {
      state.viewState = 'list';
      const result = handleBack(state);
      expect(result.action).toBe('exit');
    });

    it('from detail returns to list', () => {
      state.viewState = 'detail';
      const result = handleBack(state);
      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.viewState).toBe('list');
      }
    });

    it('from confirm-delete returns to list', () => {
      state.viewState = 'confirm-delete';
      const result = handleBack(state);
      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.viewState).toBe('list');
      }
    });

    it('from create-name returns to list', () => {
      state.viewState = 'create-name';
      const result = handleBack(state);
      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.viewState).toBe('list');
      }
    });

    it('from create-url returns to create-name', () => {
      state.viewState = 'create-url';
      const result = handleBack(state);
      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.viewState).toBe('create-name');
      }
    });

    it('from create-depth returns to create-url', () => {
      state.viewState = 'create-depth';
      const result = handleBack(state);
      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.viewState).toBe('create-url');
      }
    });

    it('from add-source returns to detail', () => {
      state.viewState = 'add-source';
      const result = handleBack(state);
      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.viewState).toBe('detail');
      }
    });
  });

  describe('handleListInput', () => {
    let state: ScreenState;
    const kbs = [createMockKB({ id: 'kb-1', name: 'KB 1' }), createMockKB({ id: 'kb-2', name: 'KB 2' })];

    beforeEach(() => {
      state = createInitialState();
    });

    it('upArrow navigates up', () => {
      state.selectedIndex = 1;
      const result = handleListInput(state, '', { upArrow: true }, kbs);
      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.selectedIndex).toBe(0);
      }
    });

    it('downArrow navigates down', () => {
      const result = handleListInput(state, '', { downArrow: true }, kbs);
      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.selectedIndex).toBe(1);
      }
    });

    it('return opens detail view', () => {
      const result = handleListInput(state, '', { return: true }, kbs);
      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.viewState).toBe('detail');
        expect(result.state.selectedKB).toBe(kbs[0]);
      }
    });

    it('return does nothing with empty list', () => {
      const result = handleListInput(state, '', { return: true }, []);
      expect(result.action).toBe('none');
    });

    it('n opens create form', () => {
      const result = handleListInput(state, 'n', {}, kbs);
      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.viewState).toBe('create-name');
      }
    });

    it('d opens confirm delete', () => {
      const result = handleListInput(state, 'd', {}, kbs);
      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.viewState).toBe('confirm-delete');
      }
    });

    it('d does nothing with empty list', () => {
      const result = handleListInput(state, 'd', {}, []);
      expect(result.action).toBe('none');
    });
  });

  describe('handleDetailInput', () => {
    let state: ScreenState;

    beforeEach(() => {
      state = createInitialState();
      state.viewState = 'detail';
      state.selectedKB = createMockKB();
    });

    it('upArrow navigates sources up', () => {
      state.selectedSourceIndex = 1;
      const result = handleDetailInput(state, '', { upArrow: true });
      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.selectedSourceIndex).toBe(0);
      }
    });

    it('downArrow navigates sources down', () => {
      const result = handleDetailInput(state, '', { downArrow: true });
      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.selectedSourceIndex).toBe(1);
      }
    });

    it('a opens add source', () => {
      const result = handleDetailInput(state, 'a', {});
      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.viewState).toBe('add-source');
      }
    });

    it('c triggers crawl for non-crawling source', () => {
      const result = handleDetailInput(state, 'c', {});
      expect(result.action).toBe('async');
      if (result.action === 'async') {
        expect(result.asyncAction).toBe('crawlSource');
        expect(result.state.viewState).toBe('crawling');
      }
    });

    it('c does nothing for crawling source', () => {
      state.selectedKB = createMockKB({
        sources: [{ id: 'src-1', url: 'https://test.com', addedAt: '2024-01-01T00:00:00Z', status: 'crawling', pageCount: 0 }],
      });
      const result = handleDetailInput(state, 'c', {});
      expect(result.action).toBe('none');
    });

    it('i triggers index', () => {
      const result = handleDetailInput(state, 'i', {});
      expect(result.action).toBe('async');
      if (result.action === 'async') {
        expect(result.asyncAction).toBe('indexKB');
      }
    });

    it('r triggers remove source', () => {
      const result = handleDetailInput(state, 'r', {});
      expect(result.action).toBe('async');
      if (result.action === 'async') {
        expect(result.asyncAction).toBe('removeSource');
      }
    });

    it('returns none without selected KB', () => {
      state.selectedKB = null;
      const result = handleDetailInput(state, 'a', {});
      expect(result.action).toBe('none');
    });
  });

  describe('handleConfirmDeleteInput', () => {
    let state: ScreenState;

    beforeEach(() => {
      state = createInitialState();
      state.viewState = 'confirm-delete';
      state.selectedKB = createMockKB();
    });

    it('y confirms delete', () => {
      const result = handleConfirmDeleteInput(state, 'y');
      expect(result.action).toBe('async');
      if (result.action === 'async') {
        expect(result.asyncAction).toBe('deleteKB');
      }
    });

    it('n cancels delete', () => {
      const result = handleConfirmDeleteInput(state, 'n');
      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.viewState).toBe('list');
      }
    });

    it('y does nothing without selected KB', () => {
      state.selectedKB = null;
      const result = handleConfirmDeleteInput(state, 'y');
      expect(result.action).toBe('none');
    });
  });

  describe('handleDepthInput', () => {
    let state: ScreenState;

    beforeEach(() => {
      state = createInitialState();
      state.viewState = 'create-depth';
      state.newDepth = 2;
    });

    it('upArrow decrements depth', () => {
      const result = handleDepthInput(state, { upArrow: true });
      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.newDepth).toBe(1);
      }
    });

    it('leftArrow decrements depth', () => {
      const result = handleDepthInput(state, { leftArrow: true });
      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.newDepth).toBe(1);
      }
    });

    it('downArrow increments depth', () => {
      const result = handleDepthInput(state, { downArrow: true });
      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.newDepth).toBe(3);
      }
    });

    it('rightArrow increments depth', () => {
      const result = handleDepthInput(state, { rightArrow: true });
      expect(result.action).toBe('transition');
      if (result.action === 'transition') {
        expect(result.state.newDepth).toBe(3);
      }
    });

    it('return triggers create', () => {
      const result = handleDepthInput(state, { return: true });
      expect(result.action).toBe('async');
      if (result.action === 'async') {
        expect(result.asyncAction).toBe('createKB');
      }
    });
  });

  describe('afterDelete', () => {
    it('clamps selected index to valid range', () => {
      const state = createInitialState();
      state.selectedIndex = 5;
      const newState = afterDelete(state, 3);

      expect(newState.viewState).toBe('list');
      expect(newState.selectedIndex).toBe(2);
    });

    it('handles empty list', () => {
      const state = createInitialState();
      state.selectedIndex = 0;
      const newState = afterDelete(state, 0);

      expect(newState.selectedIndex).toBe(0);
    });
  });

  describe('afterSourceRemove', () => {
    it('updates KB and clamps source index', () => {
      const state = createInitialState();
      state.selectedSourceIndex = 2;
      const updatedKB = createMockKB({ sources: [{ id: 'src-1', url: 'https://test.com', addedAt: '2024-01-01T00:00:00Z', status: 'complete', pageCount: 10 }] });

      const newState = afterSourceRemove(state, updatedKB);

      expect(newState.selectedKB).toBe(updatedKB);
      expect(newState.selectedSourceIndex).toBe(0);
    });

    it('returns original state if no updated KB', () => {
      const state = createInitialState();
      const newState = afterSourceRemove(state, null);
      expect(newState).toBe(state);
    });
  });

  describe('State immutability', () => {
    it('does not mutate original state', () => {
      const state = createInitialState();
      const originalViewState = state.viewState;

      setViewState(state, 'detail');

      expect(state.viewState).toBe(originalViewState);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { JiraTicket } from '../types/index.js';
import {
  createInitialState,
  initializeBranches,
  isAlreadyInProgress,
  checkAutoAdvance,
  transitionToTransitioning,
  transitionToEditBranchName,
  transitionToEditBranchNameSkipped,
  transitionToSelectBaseBranch,
  transitionToHandleChanges,
  transitionToCreating,
  transitionToComplete,
  transitionToConfirmTransition,
  transitionToError,
  showBranchExistsPrompt,
  hideBranchExistsPrompt,
  setStashed,
  resetForRetry,
  continueAfterError,
  updateBranchName,
  appendToBranchName,
  backspaceBranchName,
  validateBranchName,
  selectBranch,
  navigateBranch,
  selectBranchByNumber,
  confirmBaseBranch,
  getCurrentStepIndex,
  handleBranchExistsInput,
  handleStepInput,
  type WizardState,
  type WizardStep,
} from './useWorkflowWizardState.js';

// Test fixtures
const createMockTicket = (overrides: Partial<JiraTicket> = {}): JiraTicket => ({
  id: '10001',
  key: 'PROJ-123',
  summary: 'Implement feature X',
  status: 'To Do',
  priority: 'High',
  storyPoints: 5,
  ...overrides,
});

describe('useWorkflowWizardState', () => {
  describe('createInitialState', () => {
    it('creates initial state with correct defaults', () => {
      const ticket = createMockTicket();
      const state = createInitialState(ticket);

      expect(state.step).toBe('confirm-transition');
      expect(state.ticket).toBe(ticket);
      expect(state.branchName.toLowerCase()).toContain('proj-123');
      expect(state.baseBranch).toBe('main');
      expect(state.transitionSkipped).toBe(false);
      expect(state.stashed).toBe(false);
      expect(state.branches).toEqual([]);
      expect(state.selectedBranchIndex).toBe(0);
      expect(state.branchExistsPrompt).toBe(false);
      expect(state.error).toBeUndefined();
    });

    it('uses custom default branch', () => {
      const ticket = createMockTicket();
      const state = createInitialState(ticket, 'develop');

      expect(state.baseBranch).toBe('develop');
    });

    it('generates branch name from ticket', () => {
      const ticket = createMockTicket({ key: 'TEST-42', summary: 'Add user authentication' });
      const state = createInitialState(ticket);

      expect(state.branchName.toLowerCase()).toContain('test-42');
    });
  });

  describe('initializeBranches', () => {
    it('sets branches and finds default index', () => {
      const state = createInitialState(createMockTicket());
      const branches = ['main', 'develop', 'feature/test'];

      const newState = initializeBranches(state, branches, 'develop');

      expect(newState.branches).toEqual(branches);
      expect(newState.baseBranch).toBe('develop');
      expect(newState.selectedBranchIndex).toBe(1);
    });

    it('defaults to index 0 if default branch not found', () => {
      const state = createInitialState(createMockTicket());
      const branches = ['main', 'develop'];

      const newState = initializeBranches(state, branches, 'nonexistent');

      expect(newState.selectedBranchIndex).toBe(0);
    });

    it('handles empty branches array', () => {
      const state = createInitialState(createMockTicket());

      const newState = initializeBranches(state, [], 'main');

      expect(newState.branches).toEqual([]);
      expect(newState.selectedBranchIndex).toBe(0);
    });
  });

  describe('isAlreadyInProgress', () => {
    it('returns true for In Progress status', () => {
      const ticket = createMockTicket({ status: 'In Progress' });
      expect(isAlreadyInProgress(ticket)).toBe(true);
    });

    it('returns true case-insensitively', () => {
      const ticket = createMockTicket({ status: 'in progress' });
      expect(isAlreadyInProgress(ticket)).toBe(true);
    });

    it('returns false for other statuses', () => {
      expect(isAlreadyInProgress(createMockTicket({ status: 'To Do' }))).toBe(false);
      expect(isAlreadyInProgress(createMockTicket({ status: 'Done' }))).toBe(false);
      expect(isAlreadyInProgress(createMockTicket({ status: 'In Review' }))).toBe(false);
    });
  });

  describe('checkAutoAdvance', () => {
    it('advances to edit-branch-name if In Progress', () => {
      const ticket = createMockTicket({ status: 'In Progress' });
      const state = createInitialState(ticket);

      const newState = checkAutoAdvance(state);

      expect(newState.step).toBe('edit-branch-name');
      expect(newState.transitionSkipped).toBe(true);
    });

    it('does not advance for other statuses', () => {
      const ticket = createMockTicket({ status: 'To Do' });
      const state = createInitialState(ticket);

      const newState = checkAutoAdvance(state);

      expect(newState.step).toBe('confirm-transition');
      expect(newState.transitionSkipped).toBe(false);
    });

    it('does not advance from non-confirm-transition steps', () => {
      const ticket = createMockTicket({ status: 'In Progress' });
      const state = createInitialState(ticket);
      state.step = 'edit-branch-name';

      const newState = checkAutoAdvance(state);

      expect(newState).toBe(state);
    });
  });

  describe('Step transitions', () => {
    let state: WizardState;

    beforeEach(() => {
      state = createInitialState(createMockTicket());
    });

    it('transitionToTransitioning changes step', () => {
      const newState = transitionToTransitioning(state);
      expect(newState.step).toBe('transitioning');
    });

    it('transitionToEditBranchName changes step', () => {
      const newState = transitionToEditBranchName(state);
      expect(newState.step).toBe('edit-branch-name');
    });

    it('transitionToEditBranchNameSkipped changes step and sets flag', () => {
      const newState = transitionToEditBranchNameSkipped(state);
      expect(newState.step).toBe('edit-branch-name');
      expect(newState.transitionSkipped).toBe(true);
    });

    it('transitionToSelectBaseBranch changes step', () => {
      const newState = transitionToSelectBaseBranch(state);
      expect(newState.step).toBe('select-base-branch');
    });

    it('transitionToHandleChanges changes step', () => {
      const newState = transitionToHandleChanges(state);
      expect(newState.step).toBe('handle-changes');
    });

    it('transitionToCreating changes step', () => {
      const newState = transitionToCreating(state);
      expect(newState.step).toBe('creating');
    });

    it('transitionToComplete changes step', () => {
      const newState = transitionToComplete(state);
      expect(newState.step).toBe('complete');
    });

    it('transitionToConfirmTransition changes step', () => {
      state.step = 'edit-branch-name';
      const newState = transitionToConfirmTransition(state);
      expect(newState.step).toBe('confirm-transition');
    });

    it('transitionToError sets error and step', () => {
      const newState = transitionToError(state, 'Test error');
      expect(newState.step).toBe('error');
      expect(newState.error).toBe('Test error');
    });
  });

  describe('Branch exists prompt', () => {
    let state: WizardState;

    beforeEach(() => {
      state = createInitialState(createMockTicket());
    });

    it('showBranchExistsPrompt sets flag', () => {
      const newState = showBranchExistsPrompt(state);
      expect(newState.branchExistsPrompt).toBe(true);
    });

    it('hideBranchExistsPrompt clears flag', () => {
      state.branchExistsPrompt = true;
      const newState = hideBranchExistsPrompt(state);
      expect(newState.branchExistsPrompt).toBe(false);
    });
  });

  describe('Stash handling', () => {
    it('setStashed sets flag', () => {
      const state = createInitialState(createMockTicket());
      const newState = setStashed(state);
      expect(newState.stashed).toBe(true);
    });
  });

  describe('Error recovery', () => {
    let state: WizardState;

    beforeEach(() => {
      state = createInitialState(createMockTicket());
      state.step = 'error';
      state.error = 'Some error';
    });

    it('resetForRetry clears error and goes to confirm-transition', () => {
      const newState = resetForRetry(state);
      expect(newState.step).toBe('confirm-transition');
      expect(newState.error).toBeUndefined();
    });

    it('continueAfterError clears error and skips transition', () => {
      const newState = continueAfterError(state);
      expect(newState.step).toBe('edit-branch-name');
      expect(newState.error).toBeUndefined();
      expect(newState.transitionSkipped).toBe(true);
    });
  });

  describe('Branch name editing', () => {
    let state: WizardState;

    beforeEach(() => {
      state = createInitialState(createMockTicket());
      state.branchName = 'feature/test';
    });

    it('updateBranchName replaces name', () => {
      const newState = updateBranchName(state, 'feature/new-name');
      expect(newState.branchName).toBe('feature/new-name');
    });

    it('appendToBranchName adds character', () => {
      const newState = appendToBranchName(state, 's');
      expect(newState.branchName).toBe('feature/tests');
    });

    it('backspaceBranchName removes last character', () => {
      const newState = backspaceBranchName(state);
      expect(newState.branchName).toBe('feature/tes');
    });

    it('backspaceBranchName handles empty string', () => {
      state.branchName = '';
      const newState = backspaceBranchName(state);
      expect(newState.branchName).toBe('');
    });
  });

  describe('validateBranchName', () => {
    it('accepts valid branch names', () => {
      expect(validateBranchName('feature/test')).toBe(true);
      expect(validateBranchName('PROJ-123-feature')).toBe(true);
      expect(validateBranchName('bugfix/fix-login')).toBe(true);
    });

    it('rejects empty names', () => {
      expect(validateBranchName('')).toBe(false);
    });

    it('rejects names with invalid characters', () => {
      expect(validateBranchName('feature test')).toBe(false);
      expect(validateBranchName('feature..test')).toBe(false);
    });
  });

  describe('Branch selection', () => {
    let state: WizardState;

    beforeEach(() => {
      state = createInitialState(createMockTicket());
      state.branches = ['main', 'develop', 'feature/a', 'feature/b'];
      state.selectedBranchIndex = 0;
    });

    it('selectBranch sets valid index', () => {
      const newState = selectBranch(state, 2);
      expect(newState.selectedBranchIndex).toBe(2);
    });

    it('selectBranch ignores invalid index', () => {
      const newState = selectBranch(state, 10);
      expect(newState).toBe(state);
    });

    it('selectBranch ignores negative index', () => {
      const newState = selectBranch(state, -1);
      expect(newState).toBe(state);
    });

    it('navigateBranch down increments', () => {
      const newState = navigateBranch(state, 'down');
      expect(newState.selectedBranchIndex).toBe(1);
    });

    it('navigateBranch down wraps around', () => {
      state.selectedBranchIndex = 3;
      const newState = navigateBranch(state, 'down');
      expect(newState.selectedBranchIndex).toBe(0);
    });

    it('navigateBranch up decrements', () => {
      state.selectedBranchIndex = 2;
      const newState = navigateBranch(state, 'up');
      expect(newState.selectedBranchIndex).toBe(1);
    });

    it('navigateBranch up wraps around', () => {
      state.selectedBranchIndex = 0;
      const newState = navigateBranch(state, 'up');
      expect(newState.selectedBranchIndex).toBe(3);
    });

    it('navigateBranch handles empty branches', () => {
      state.branches = [];
      const newState = navigateBranch(state, 'down');
      expect(newState).toBe(state);
    });

    it('selectBranchByNumber sets valid number (1-indexed)', () => {
      const newState = selectBranchByNumber(state, 3);
      expect(newState.selectedBranchIndex).toBe(2);
    });

    it('selectBranchByNumber ignores 0', () => {
      const newState = selectBranchByNumber(state, 0);
      expect(newState).toBe(state);
    });

    it('selectBranchByNumber ignores numbers > 9', () => {
      const newState = selectBranchByNumber(state, 10);
      expect(newState).toBe(state);
    });

    it('selectBranchByNumber ignores numbers > branches length', () => {
      const newState = selectBranchByNumber(state, 9);
      expect(newState).toBe(state);
    });

    it('confirmBaseBranch sets baseBranch from selection', () => {
      state.selectedBranchIndex = 1;
      const newState = confirmBaseBranch(state);
      expect(newState.baseBranch).toBe('develop');
    });

    it('confirmBaseBranch handles empty selection', () => {
      state.branches = [];
      const newState = confirmBaseBranch(state);
      expect(newState).toBe(state);
    });
  });

  describe('getCurrentStepIndex', () => {
    it('returns correct index for each step', () => {
      expect(getCurrentStepIndex('confirm-transition')).toBe(0);
      expect(getCurrentStepIndex('transitioning')).toBe(0);
      expect(getCurrentStepIndex('edit-branch-name')).toBe(1);
      expect(getCurrentStepIndex('select-base-branch')).toBe(2);
      expect(getCurrentStepIndex('handle-changes')).toBe(3);
      expect(getCurrentStepIndex('creating')).toBe(3);
      expect(getCurrentStepIndex('complete')).toBe(4);
      expect(getCurrentStepIndex('error')).toBe(-1);
    });
  });

  describe('handleBranchExistsInput', () => {
    it('returns checkout for Y', () => {
      expect(handleBranchExistsInput('Y')).toEqual({ action: 'checkout' });
      expect(handleBranchExistsInput('y')).toEqual({ action: 'checkout' });
    });

    it('returns edit for N', () => {
      expect(handleBranchExistsInput('N')).toEqual({ action: 'edit' });
      expect(handleBranchExistsInput('n')).toEqual({ action: 'edit' });
    });

    it('returns none for other inputs', () => {
      expect(handleBranchExistsInput('x')).toEqual({ action: 'none' });
      expect(handleBranchExistsInput('')).toEqual({ action: 'none' });
    });
  });

  describe('handleStepInput', () => {
    let state: WizardState;

    beforeEach(() => {
      state = createInitialState(createMockTicket());
      state.branches = ['main', 'develop'];
    });

    describe('confirm-transition step', () => {
      it('return key triggers async transition', () => {
        const result = handleStepInput(state, '', { return: true });
        expect(result.action).toBe('async');
        if (result.action === 'async') {
          expect(result.asyncAction).toBe('executeTransition');
        }
      });

      it('S key skips transition', () => {
        const result = handleStepInput(state, 'S', {});
        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.step).toBe('edit-branch-name');
          expect(result.state.transitionSkipped).toBe(true);
        }
      });

      it('escape triggers back', () => {
        const result = handleStepInput(state, '', { escape: true });
        expect(result.action).toBe('back');
      });
    });

    describe('edit-branch-name step', () => {
      beforeEach(() => {
        state.step = 'edit-branch-name';
        state.branchName = 'PROJ-123-test';
      });

      it('return with valid name goes to select-base-branch', () => {
        const result = handleStepInput(state, '', { return: true });
        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.step).toBe('select-base-branch');
        }
      });

      it('return with invalid name does nothing', () => {
        state.branchName = '';
        const result = handleStepInput(state, '', { return: true });
        expect(result.action).toBe('none');
      });

      it('escape goes back to confirm-transition', () => {
        const result = handleStepInput(state, '', { escape: true });
        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.step).toBe('confirm-transition');
        }
      });

      it('backspace removes character', () => {
        const result = handleStepInput(state, '', { backspace: true });
        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.branchName).toBe('PROJ-123-tes');
        }
      });

      it('character input appends', () => {
        const result = handleStepInput(state, 's', {});
        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.branchName).toBe('PROJ-123-tests');
        }
      });

      it('ignores ctrl+key combinations', () => {
        const result = handleStepInput(state, 'c', { ctrl: true });
        expect(result.action).toBe('none');
      });
    });

    describe('select-base-branch step', () => {
      beforeEach(() => {
        state.step = 'select-base-branch';
        state.selectedBranchIndex = 0;
      });

      it('return without uncommitted changes triggers create', () => {
        const result = handleStepInput(state, '', { return: true }, false);
        expect(result.action).toBe('async');
        if (result.action === 'async') {
          expect(result.asyncAction).toBe('handleCreateBranch');
        }
      });

      it('return with uncommitted changes goes to handle-changes', () => {
        const result = handleStepInput(state, '', { return: true }, true);
        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.step).toBe('handle-changes');
        }
      });

      it('escape goes back', () => {
        const result = handleStepInput(state, '', { escape: true });
        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.step).toBe('edit-branch-name');
        }
      });

      it('j key navigates down', () => {
        const result = handleStepInput(state, 'j', {});
        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.selectedBranchIndex).toBe(1);
        }
      });

      it('k key navigates up', () => {
        state.selectedBranchIndex = 1;
        const result = handleStepInput(state, 'k', {});
        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.selectedBranchIndex).toBe(0);
        }
      });

      it('number key selects branch', () => {
        const result = handleStepInput(state, '2', {});
        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.selectedBranchIndex).toBe(1);
        }
      });
    });

    describe('handle-changes step', () => {
      beforeEach(() => {
        state.step = 'handle-changes';
      });

      it('S key triggers stash', () => {
        const result = handleStepInput(state, 'S', {});
        expect(result.action).toBe('async');
        if (result.action === 'async') {
          expect(result.asyncAction).toBe('handleStash');
        }
      });

      it('C key triggers back', () => {
        const result = handleStepInput(state, 'C', {});
        expect(result.action).toBe('back');
      });

      it('escape triggers back', () => {
        const result = handleStepInput(state, '', { escape: true });
        expect(result.action).toBe('back');
      });
    });

    describe('complete step', () => {
      beforeEach(() => {
        state.step = 'complete';
      });

      it('P key triggers plan', () => {
        const result = handleStepInput(state, 'P', {});
        expect(result.action).toBe('plan');
      });

      it('Q key triggers back', () => {
        const result = handleStepInput(state, 'Q', {});
        expect(result.action).toBe('back');
      });

      it('escape triggers back', () => {
        const result = handleStepInput(state, '', { escape: true });
        expect(result.action).toBe('back');
      });
    });

    describe('error step', () => {
      beforeEach(() => {
        state.step = 'error';
        state.error = 'Test error';
      });

      it('R key retries', () => {
        const result = handleStepInput(state, 'R', {});
        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.step).toBe('confirm-transition');
          expect(result.state.error).toBeUndefined();
        }
      });

      it('C key continues', () => {
        const result = handleStepInput(state, 'C', {});
        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.step).toBe('edit-branch-name');
          expect(result.state.transitionSkipped).toBe(true);
        }
      });

      it('B key triggers back', () => {
        const result = handleStepInput(state, 'B', {});
        expect(result.action).toBe('back');
      });

      it('escape triggers back', () => {
        const result = handleStepInput(state, '', { escape: true });
        expect(result.action).toBe('back');
      });
    });

    describe('unhandled states', () => {
      it('returns none for transitioning step', () => {
        state.step = 'transitioning';
        const result = handleStepInput(state, '', { return: true });
        expect(result.action).toBe('none');
      });

      it('returns none for creating step', () => {
        state.step = 'creating';
        const result = handleStepInput(state, '', { return: true });
        expect(result.action).toBe('none');
      });
    });
  });

  describe('State immutability', () => {
    it('does not mutate original state', () => {
      const state = createInitialState(createMockTicket());
      const originalStep = state.step;

      transitionToEditBranchName(state);

      expect(state.step).toBe(originalStep);
    });

    it('does not mutate branches array', () => {
      const state = createInitialState(createMockTicket());
      state.branches = ['main', 'develop'];
      const originalLength = state.branches.length;

      initializeBranches(state, ['a', 'b', 'c'], 'a');

      expect(state.branches.length).toBe(originalLength);
    });
  });
});

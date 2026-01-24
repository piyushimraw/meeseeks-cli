import { describe, it, expect, beforeEach } from 'vitest';
import type { TechStack, FileGenerationResult } from '../utils/metaPrompt/types.js';
import {
  createInitialState,
  transitionToDetectingStack,
  transitionToConfirmGeneration,
  transitionToCheckingExisting,
  transitionToPromptOverwrite,
  transitionToGenerating,
  transitionToComplete,
  transitionToError,
  navigateExtension,
  selectExtension,
  setOverwriteChoice,
  advanceToNextFile,
  handleOverwriteChoice,
  handleOverwriteAll,
  getCurrentFile,
  getGenerationStats,
  handleStepInput,
  isValidExtension,
  EXTENSIONS,
  type WizardState,
  type FileOverwritePrompt,
} from './useMetaPromptWizardState.js';

// Test fixtures
const createMockTechStack = (): TechStack => ({
  runtime: 'Node.js',
  language: 'TypeScript',
  packageManager: 'npm',
  frameworks: ['react', 'express'],
  testFramework: 'vitest',
  buildTool: 'vite',
});

const createMockFilesToPrompt = (): FileOverwritePrompt[] => [
  { file: '/path/to/file1.md', existingContent: 'content 1' },
  { file: '/path/to/file2.md', existingContent: 'content 2' },
  { file: '/path/to/file3.md', existingContent: 'content 3' },
];

const createMockGenerationResults = (): FileGenerationResult[] => [
  { path: '/path/to/file1.md', status: 'created' },
  { path: '/path/to/file2.md', status: 'updated' },
  { path: '/path/to/file3.md', status: 'skipped' },
  { path: '/path/to/file4.md', status: 'error', error: 'Permission denied' },
];

describe('useMetaPromptWizardState', () => {
  describe('createInitialState', () => {
    it('creates initial state with correct defaults', () => {
      const state = createInitialState();

      expect(state.step).toBe('select-extension');
      expect(state.extension).toBeUndefined();
      expect(state.techStack).toBeUndefined();
      expect(state.targetDir).toBeUndefined();
      expect(state.error).toBeUndefined();
      expect(state.selectedExtensionIndex).toBe(0);
      expect(state.filesToPrompt).toEqual([]);
      expect(state.currentFileIndex).toBe(0);
      expect(state.overwriteChoices).toBeInstanceOf(Map);
      expect(state.overwriteChoices.size).toBe(0);
      expect(state.generationResults).toEqual([]);
    });
  });

  describe('EXTENSIONS constant', () => {
    it('has the expected extensions', () => {
      expect(EXTENSIONS).toHaveLength(2);
      expect(EXTENSIONS[0].value).toBe('roocode');
      expect(EXTENSIONS[1].value).toBe('kilocode');
    });

    it('has labels and descriptions', () => {
      for (const ext of EXTENSIONS) {
        expect(ext.label).toBeTruthy();
        expect(ext.description).toBeTruthy();
      }
    });
  });

  describe('Step transitions', () => {
    let state: WizardState;

    beforeEach(() => {
      state = createInitialState();
    });

    it('transitionToDetectingStack sets extension and step', () => {
      const newState = transitionToDetectingStack(state, 'roocode');

      expect(newState.step).toBe('detecting-stack');
      expect(newState.extension).toBe('roocode');
    });

    it('transitionToConfirmGeneration sets tech stack and target dir', () => {
      const techStack = createMockTechStack();
      const newState = transitionToConfirmGeneration(state, techStack, '/path/to/target');

      expect(newState.step).toBe('confirm-generation');
      expect(newState.techStack).toBe(techStack);
      expect(newState.targetDir).toBe('/path/to/target');
    });

    it('transitionToCheckingExisting changes step', () => {
      const newState = transitionToCheckingExisting(state);

      expect(newState.step).toBe('checking-existing');
    });

    it('transitionToPromptOverwrite sets files and step', () => {
      const files = createMockFilesToPrompt();
      const newState = transitionToPromptOverwrite(state, files);

      expect(newState.step).toBe('prompt-overwrite');
      expect(newState.filesToPrompt).toBe(files);
    });

    it('transitionToGenerating changes step', () => {
      const newState = transitionToGenerating(state);

      expect(newState.step).toBe('generating');
    });

    it('transitionToComplete sets results and step', () => {
      const results = createMockGenerationResults();
      const newState = transitionToComplete(state, results);

      expect(newState.step).toBe('complete');
      expect(newState.generationResults).toBe(results);
    });

    it('transitionToError sets error and step', () => {
      const newState = transitionToError(state, 'Test error message');

      expect(newState.step).toBe('error');
      expect(newState.error).toBe('Test error message');
    });
  });

  describe('Extension selection', () => {
    let state: WizardState;

    beforeEach(() => {
      state = createInitialState();
    });

    it('navigateExtension down increments index', () => {
      const newState = navigateExtension(state, 'down');

      expect(newState.selectedExtensionIndex).toBe(1);
    });

    it('navigateExtension down wraps around', () => {
      state.selectedExtensionIndex = EXTENSIONS.length - 1;
      const newState = navigateExtension(state, 'down');

      expect(newState.selectedExtensionIndex).toBe(0);
    });

    it('navigateExtension up decrements index', () => {
      state.selectedExtensionIndex = 1;
      const newState = navigateExtension(state, 'up');

      expect(newState.selectedExtensionIndex).toBe(0);
    });

    it('navigateExtension up wraps around', () => {
      state.selectedExtensionIndex = 0;
      const newState = navigateExtension(state, 'up');

      expect(newState.selectedExtensionIndex).toBe(EXTENSIONS.length - 1);
    });

    it('selectExtension returns state and extension', () => {
      state.selectedExtensionIndex = 1;
      const result = selectExtension(state);

      expect(result.state.step).toBe('detecting-stack');
      expect(result.state.extension).toBe('kilocode');
      expect(result.extension).toBe('kilocode');
    });
  });

  describe('Overwrite handling', () => {
    let state: WizardState;

    beforeEach(() => {
      state = createInitialState();
      state.step = 'prompt-overwrite';
      state.filesToPrompt = createMockFilesToPrompt();
      state.currentFileIndex = 0;
    });

    it('setOverwriteChoice adds choice to map', () => {
      const newState = setOverwriteChoice(state, '/path/to/file1.md', 'overwrite');

      expect(newState.overwriteChoices.get('/path/to/file1.md')).toBe('overwrite');
    });

    it('setOverwriteChoice creates new map instance', () => {
      const newState = setOverwriteChoice(state, '/path/to/file1.md', 'skip');

      expect(newState.overwriteChoices).not.toBe(state.overwriteChoices);
    });

    it('advanceToNextFile increments index', () => {
      const newState = advanceToNextFile(state);

      expect(newState.currentFileIndex).toBe(1);
    });

    it('advanceToNextFile transitions to generating on last file', () => {
      state.currentFileIndex = 2; // Last file
      const newState = advanceToNextFile(state);

      expect(newState.step).toBe('generating');
    });

    it('handleOverwriteChoice sets choice and advances', () => {
      const newState = handleOverwriteChoice(state, 'overwrite');

      expect(newState.overwriteChoices.get('/path/to/file1.md')).toBe('overwrite');
      expect(newState.currentFileIndex).toBe(1);
    });

    it('handleOverwriteChoice with skip', () => {
      const newState = handleOverwriteChoice(state, 'skip');

      expect(newState.overwriteChoices.get('/path/to/file1.md')).toBe('skip');
      expect(newState.currentFileIndex).toBe(1);
    });

    it('handleOverwriteAll sets overwrite for all remaining files', () => {
      state.currentFileIndex = 1; // Start from second file
      const newState = handleOverwriteAll(state);

      expect(newState.overwriteChoices.get('/path/to/file2.md')).toBe('overwrite');
      expect(newState.overwriteChoices.get('/path/to/file3.md')).toBe('overwrite');
      expect(newState.overwriteChoices.has('/path/to/file1.md')).toBe(false);
      expect(newState.step).toBe('generating');
    });
  });

  describe('getCurrentFile', () => {
    let state: WizardState;

    beforeEach(() => {
      state = createInitialState();
      state.filesToPrompt = createMockFilesToPrompt();
    });

    it('returns current file', () => {
      state.currentFileIndex = 1;
      const file = getCurrentFile(state);

      expect(file).toEqual({ file: '/path/to/file2.md', existingContent: 'content 2' });
    });

    it('returns null when index out of bounds', () => {
      state.currentFileIndex = 10;
      const file = getCurrentFile(state);

      expect(file).toBeNull();
    });

    it('returns null for empty files array', () => {
      state.filesToPrompt = [];
      const file = getCurrentFile(state);

      expect(file).toBeNull();
    });
  });

  describe('getGenerationStats', () => {
    it('calculates statistics correctly', () => {
      const results = createMockGenerationResults();
      const stats = getGenerationStats(results);

      expect(stats.created).toBe(1);
      expect(stats.updated).toBe(1);
      expect(stats.skipped).toBe(1);
      expect(stats.errors).toHaveLength(1);
      expect(stats.errors[0].error).toBe('Permission denied');
    });

    it('handles empty results', () => {
      const stats = getGenerationStats([]);

      expect(stats.created).toBe(0);
      expect(stats.updated).toBe(0);
      expect(stats.skipped).toBe(0);
      expect(stats.errors).toHaveLength(0);
    });

    it('handles all created', () => {
      const results: FileGenerationResult[] = [
        { path: '/a.md', status: 'created' },
        { path: '/b.md', status: 'created' },
      ];
      const stats = getGenerationStats(results);

      expect(stats.created).toBe(2);
      expect(stats.updated).toBe(0);
    });
  });

  describe('handleStepInput', () => {
    let state: WizardState;

    beforeEach(() => {
      state = createInitialState();
    });

    describe('global quit handling', () => {
      it('q triggers back from any step', () => {
        const result = handleStepInput(state, 'q', {});
        expect(result.action).toBe('back');
      });

      it('escape triggers back from any step', () => {
        const result = handleStepInput(state, '', { escape: true });
        expect(result.action).toBe('back');
      });
    });

    describe('select-extension step', () => {
      it('upArrow navigates up', () => {
        const result = handleStepInput(state, '', { upArrow: true });

        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.selectedExtensionIndex).toBe(EXTENSIONS.length - 1);
        }
      });

      it('downArrow navigates down', () => {
        const result = handleStepInput(state, '', { downArrow: true });

        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.selectedExtensionIndex).toBe(1);
        }
      });

      it('return selects extension', () => {
        const result = handleStepInput(state, '', { return: true });

        expect(result.action).toBe('select-extension');
        if (result.action === 'select-extension') {
          expect(result.state.step).toBe('detecting-stack');
          expect(result.extension).toBe('roocode');
        }
      });
    });

    describe('confirm-generation step', () => {
      beforeEach(() => {
        state.step = 'confirm-generation';
        state.techStack = createMockTechStack();
        state.targetDir = '/path/to/target';
      });

      it('y confirms generation', () => {
        const result = handleStepInput(state, 'y', {});

        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.step).toBe('checking-existing');
        }
      });

      it('return confirms generation', () => {
        const result = handleStepInput(state, '', { return: true });

        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.step).toBe('checking-existing');
        }
      });

      it('n triggers back', () => {
        const result = handleStepInput(state, 'n', {});

        expect(result.action).toBe('back');
      });
    });

    describe('prompt-overwrite step', () => {
      beforeEach(() => {
        state.step = 'prompt-overwrite';
        state.filesToPrompt = createMockFilesToPrompt();
        state.currentFileIndex = 0;
      });

      it('o overwrites current file', () => {
        const result = handleStepInput(state, 'o', {});

        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.overwriteChoices.get('/path/to/file1.md')).toBe('overwrite');
          expect(result.state.currentFileIndex).toBe(1);
        }
      });

      it('s skips current file', () => {
        const result = handleStepInput(state, 's', {});

        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.overwriteChoices.get('/path/to/file1.md')).toBe('skip');
          expect(result.state.currentFileIndex).toBe(1);
        }
      });

      it('a overwrites all remaining', () => {
        state.currentFileIndex = 1;
        const result = handleStepInput(state, 'a', {});

        expect(result.action).toBe('transition');
        if (result.action === 'transition') {
          expect(result.state.step).toBe('generating');
          expect(result.state.overwriteChoices.get('/path/to/file2.md')).toBe('overwrite');
          expect(result.state.overwriteChoices.get('/path/to/file3.md')).toBe('overwrite');
        }
      });
    });

    describe('complete step', () => {
      beforeEach(() => {
        state.step = 'complete';
        state.generationResults = createMockGenerationResults();
      });

      it('return triggers back', () => {
        const result = handleStepInput(state, '', { return: true });
        expect(result.action).toBe('back');
      });
    });

    describe('error step', () => {
      beforeEach(() => {
        state.step = 'error';
        state.error = 'Test error';
      });

      it('return triggers back', () => {
        const result = handleStepInput(state, '', { return: true });
        expect(result.action).toBe('back');
      });
    });

    describe('unhandled inputs', () => {
      it('returns none for unrecognized input', () => {
        state.step = 'select-extension';
        const result = handleStepInput(state, 'x', {});
        expect(result.action).toBe('none');
      });

      it('returns none for detecting-stack step', () => {
        state.step = 'detecting-stack';
        const result = handleStepInput(state, '', { return: true });
        // Note: escape/q still work due to global handling, so we test non-escape
        expect(result.action).toBe('none');
      });

      it('returns none for generating step', () => {
        state.step = 'generating';
        const result = handleStepInput(state, '', { return: true });
        expect(result.action).toBe('none');
      });

      it('returns none for checking-existing step', () => {
        state.step = 'checking-existing';
        const result = handleStepInput(state, '', { return: true });
        expect(result.action).toBe('none');
      });
    });
  });

  describe('isValidExtension', () => {
    it('returns true for roocode', () => {
      expect(isValidExtension('roocode')).toBe(true);
    });

    it('returns true for kilocode', () => {
      expect(isValidExtension('kilocode')).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(isValidExtension('invalid')).toBe(false);
      expect(isValidExtension('')).toBe(false);
      expect(isValidExtension('ROOCODE')).toBe(false);
    });
  });

  describe('State immutability', () => {
    it('does not mutate original state on transitions', () => {
      const state = createInitialState();
      const originalStep = state.step;

      transitionToDetectingStack(state, 'roocode');

      expect(state.step).toBe(originalStep);
    });

    it('does not mutate overwriteChoices map', () => {
      const state = createInitialState();
      const originalSize = state.overwriteChoices.size;

      setOverwriteChoice(state, '/path/to/file.md', 'overwrite');

      expect(state.overwriteChoices.size).toBe(originalSize);
    });
  });
});

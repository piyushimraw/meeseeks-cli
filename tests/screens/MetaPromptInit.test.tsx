import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Key } from 'ink';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module for file system operations
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    readdirSync: vi.fn(),
  };
});

// Mock ink hooks
vi.mock('ink', async () => {
  const actual = await vi.importActual<typeof import('ink')>('ink');
  return {
    ...actual,
    useApp: () => ({ exit: vi.fn() }),
    useInput: vi.fn(),
  };
});

// Mock tech stack detector
vi.mock('../../src/utils/metaPrompt/techStackDetector.js', () => ({
  detectTechStack: vi.fn().mockResolvedValue({
    runtime: 'node',
    language: 'typescript',
    packageManager: 'npm',
    frameworks: ['react'],
    testFramework: 'vitest',
  }),
  hashTechStack: vi.fn().mockReturnValue('mock-hash'),
}));

// Mock embedded templates
vi.mock('../../src/utils/metaPrompt/embeddedTemplates.js', () => ({
  getEmbeddedTemplate: vi.fn().mockReturnValue('# Mock template content'),
  getEmbeddedModeTemplate: vi.fn().mockImplementation((extension: string, templateName: string) => {
    // Return valid JSON for modes config files
    if (templateName === 'roomodes' || templateName === 'kilocodemodes') {
      return JSON.stringify({
        customModes: [
          { slug: 'meeseeks-prime', name: 'Meeseeks: Prime' },
          { slug: 'meeseeks-orchestrate', name: 'Meeseeks: Orchestrate' },
        ]
      });
    }
    // Return markdown content for mode prompt files
    return '# Mock mode template content';
  }),
}));

// Mock prime analyzer
vi.mock('../../src/utils/metaPrompt/primeAnalyzer.js', () => ({
  generatePrimeStub: vi.fn().mockReturnValue('# Mock prime stub'),
  getAllPrimeFileNames: vi.fn().mockReturnValue(['ARCHITECTURE', 'CONVENTION', 'INTEGRATION', 'STACK', 'STRUCTURE']),
}));

import { MetaPromptInit } from '../../src/screens/MetaPromptInit.js';
import { useInput } from 'ink';

// Type for the input handler
type InputHandler = (input: string, key: Key) => void;

// Helper to create a Key object with defaults
const createKey = (overrides: Partial<Key> = {}): Key => ({
  upArrow: false,
  downArrow: false,
  leftArrow: false,
  rightArrow: false,
  pageDown: false,
  pageUp: false,
  return: false,
  escape: false,
  ctrl: false,
  shift: false,
  tab: false,
  backspace: false,
  delete: false,
  meta: false,
  ...overrides,
});

// Track created files for verification
let createdFiles: string[] = [];
let createdDirectories: string[] = [];

describe('MetaPromptInit', () => {
  let mockOnBack: () => void;
  let capturedInputHandler: InputHandler | null;

  beforeEach(() => {
    mockOnBack = vi.fn();
    capturedInputHandler = null;
    createdFiles = [];
    createdDirectories = [];

    // Reset all mocks
    vi.clearAllMocks();

    // Setup useInput mock to capture the handler
    vi.mocked(useInput).mockImplementation((handler: InputHandler) => {
      capturedInputHandler = handler;
    });

    // Mock process.cwd() to return a test project root
    vi.spyOn(process, 'cwd').mockReturnValue('/test-project');

    // Setup fs mocks with tracking
    vi.mocked(fs.existsSync).mockImplementation((filePath) => {
      // Return false for all files (no existing files)
      return false;
    });

    vi.mocked(fs.mkdirSync).mockImplementation((dirPath) => {
      createdDirectories.push(dirPath as string);
      return undefined;
    });

    vi.mocked(fs.writeFileSync).mockImplementation((filePath, content) => {
      createdFiles.push(filePath as string);
    });

    vi.mocked(fs.readFileSync).mockImplementation(() => '');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('displays extension selection on initial render', () => {
      const { lastFrame } = render(<MetaPromptInit onBack={mockOnBack} />);

      expect(lastFrame()).toContain('Meta Prompting Setup');
      expect(lastFrame()).toContain('Select extension to configure');
      expect(lastFrame()).toContain('RooCode');
      expect(lastFrame()).toContain('KiloCode');
    });
  });

  describe('User Story 1: KiloCode mode-only generation', () => {
    // Helper to simulate complete KiloCode setup flow
    const simulateKiloCodeSetup = async () => {
      const { lastFrame, rerender } = render(<MetaPromptInit onBack={mockOnBack} />);

      // Navigate to KiloCode (second option)
      capturedInputHandler?.('', createKey({ downArrow: true }));

      // Select KiloCode
      capturedInputHandler?.('', createKey({ return: true }));

      // Wait for tech stack detection
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Detected Tech Stack');
      }, { timeout: 1000 });

      // Confirm generation
      capturedInputHandler?.('y', createKey());

      // Wait for generation to complete
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Setup Complete');
      }, { timeout: 2000 });

      return { lastFrame, createdFiles, createdDirectories };
    };

    // T004: KiloCode setup should create .kilocodemodes file in project root
    // This tests existing functionality that should continue to work
    it('T004: KiloCode setup creates .kilocodemodes in project root', async () => {
      await simulateKiloCodeSetup();

      // Verify .kilocodemodes file was created in project root
      const kilocodemodesPath = path.join('/test-project', '.kilocodemodes');
      expect(createdFiles).toContain(kilocodemodesPath);
    });

    // T005: KiloCode setup should create mode prompts in .meeseeks/modes/ directory
    // This tests existing functionality that should continue to work
    it('T005: KiloCode setup creates mode prompts in .meeseeks/modes/', async () => {
      await simulateKiloCodeSetup();

      const modesDir = path.join('/test-project', '.meeseeks', 'modes');

      // Verify mode directory was created
      expect(createdDirectories.some(dir => dir.includes('.meeseeks/modes') || dir.includes('.meeseeks\\modes'))).toBe(true);

      // Verify mode prompt files were created
      const expectedModeFiles = [
        'meeseeks-prime.prompt.md',
        'meeseeks-orchestrate.prompt.md',
        'meeseeks-discuss.prompt.md',
        'meeseeks-plan.prompt.md',
        'meeseeks-generate-verification.prompt.md',
        'meeseeks-execute.prompt.md',
        'meeseeks-verify.prompt.md',
      ];

      for (const modeFile of expectedModeFiles) {
        const modeFilePath = path.join(modesDir, modeFile);
        expect(createdFiles.some(f => f.includes(modeFile))).toBe(true);
      }
    });

    // T006: KiloCode setup should NOT create any files in .kilocode/workflows/ (except context/)
    it('T006: KiloCode setup does NOT create command files in .kilocode/workflows/', async () => {
      await simulateKiloCodeSetup();

      // Get all files created in .kilocode/workflows/ directory
      const workflowFiles = createdFiles.filter(f =>
        (f.includes('.kilocode/workflows') || f.includes('.kilocode\\workflows')) &&
        !f.includes('context')
      );

      // Filter out metadata files (like .prime-meta.json)
      const commandFiles = workflowFiles.filter(f =>
        f.endsWith('.prompt.md') || (f.endsWith('.md') && !f.includes('.prime-meta'))
      );

      // Should NOT have any command files like meeseeks:prime.prompt.md, meeseeks:plan.prompt.md, etc.
      expect(commandFiles).toHaveLength(0);

      // Specifically verify these command files are NOT created
      const forbiddenCommands = [
        'meeseeks:prime.prompt.md',
        'meeseeks:plan.prompt.md',
        'meeseeks:define-acceptance.prompt.md',
        'meeseeks:execute.prompt.md',
        'meeseeks:verify.prompt.md',
        'meeseeks:status.prompt.md',
      ];

      for (const cmd of forbiddenCommands) {
        expect(createdFiles.some(f => f.includes(cmd))).toBe(false);
      }
    });
  });

  /**
   * User Story 2: Generate Custom Modes for RooCode
   *
   * As a RooCode user, I want meeseeks to generate .roomodes and mode prompt files
   * instead of command files, so I can use custom modes for the meeseeks workflow.
   *
   * Expected behavior (mirroring KiloCode):
   * - .roomodes in project root
   * - Mode prompts in .meeseeks/modes/
   * - NO command files in .roo/commands/
   */
  describe('User Story 2: RooCode mode-only generation', () => {
    // Helper to simulate complete RooCode setup flow
    const simulateRooCodeSetup = async () => {
      const { lastFrame, rerender } = render(<MetaPromptInit onBack={mockOnBack} />);

      // RooCode is first option, just press enter to select
      capturedInputHandler?.('', createKey({ return: true }));

      // Wait for tech stack detection
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Detected Tech Stack');
      }, { timeout: 1000 });

      // Confirm generation
      capturedInputHandler?.('y', createKey());

      // Wait for generation to complete
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Setup Complete');
      }, { timeout: 2000 });

      return { lastFrame, createdFiles, createdDirectories };
    };

    /**
     * T011: RooCode setup should create .roomodes file in project root
     *
     * Expected behavior: When RooCode extension is selected, the generator should
     * create a .roomodes file in the project root directory (similar to how
     * KiloCode creates .kilocodemodes).
     */
    describe('T011: RooCode creates .roomodes in project root', () => {
      it('should create .roomodes file in project root during RooCode setup', async () => {
        await simulateRooCodeSetup();

        // Verify .roomodes file was created in project root
        const roommodesPath = path.join('/test-project', '.roomodes');

        // RooCode mode generation is implemented (T015)
        expect(createdFiles).toContain(roommodesPath);
      });

      it('should create .roomodes with valid JSON customModes array', async () => {
        // This test verifies the content structure, not just file existence
        const mockWriteFileSync = vi.mocked(fs.writeFileSync);

        await simulateRooCodeSetup();

        // Find the .roomodes write call
        const roommodesCall = mockWriteFileSync.mock.calls.find(call =>
          String(call[0]).endsWith('.roomodes')
        );

        // RooCode mode generation is implemented (T015)
        expect(roommodesCall).toBeDefined();

        if (roommodesCall) {
          const content = String(roommodesCall[1]);
          const parsed = JSON.parse(content);
          expect(parsed.customModes).toBeDefined();
          expect(Array.isArray(parsed.customModes)).toBe(true);
          expect(parsed.customModes.length).toBeGreaterThan(0);

          // Verify meeseeks modes are defined
          const modeNames = parsed.customModes.map((m: any) => m.slug);
          expect(modeNames).toContain('meeseeks-prime');
        }
      });
    });

    /**
     * T012: RooCode setup should create mode prompts in .meeseeks/modes/ directory
     *
     * Expected behavior: When RooCode extension is selected, the generator should
     * create mode prompt files in .meeseeks/modes/ directory (same location as
     * KiloCode mode prompts for consistency).
     */
    describe('T012: RooCode creates mode prompts in .meeseeks/modes/', () => {
      const MODE_FILES = [
        'meeseeks-prime.prompt.md',
        'meeseeks-orchestrate.prompt.md',
        'meeseeks-discuss.prompt.md',
        'meeseeks-plan.prompt.md',
        'meeseeks-generate-verification.prompt.md',
        'meeseeks-execute.prompt.md',
        'meeseeks-verify.prompt.md',
      ];

      it('should create .meeseeks/modes/ directory for RooCode', async () => {
        await simulateRooCodeSetup();

        // Verify .meeseeks/modes/ directory was created
        const meeseeksModesDirCreated = createdDirectories.some(dir =>
          dir.includes('.meeseeks/modes') || dir.includes('.meeseeks\\modes')
        );

        // RooCode mode generation is implemented (T016)
        expect(meeseeksModesDirCreated).toBe(true);
      });

      it('should create all 7 mode prompt files for RooCode', async () => {
        await simulateRooCodeSetup();

        // Verify all mode prompt files were created in .meeseeks/modes/
        for (const modeFile of MODE_FILES) {
          const modeFileCreated = createdFiles.some(f =>
            (f.includes('.meeseeks/modes') || f.includes('.meeseeks\\modes')) &&
            f.includes(modeFile)
          );

          // RooCode mode generation is implemented (T016)
          expect(modeFileCreated).toBe(true);
        }
      });

      it('should use .meeseeks/modes/ NOT .roo/modes/ for mode prompts', async () => {
        await simulateRooCodeSetup();

        // Mode files should NOT be in .roo/modes/
        const wrongLocationFiles = createdFiles.filter(f =>
          (f.includes('.roo/modes') || f.includes('.roo\\modes')) &&
          f.includes('meeseeks-')
        );
        expect(wrongLocationFiles).toHaveLength(0);

        // Mode files should be in .meeseeks/modes/
        const correctLocationFiles = createdFiles.filter(f =>
          (f.includes('.meeseeks/modes') || f.includes('.meeseeks\\modes')) &&
          f.includes('meeseeks-')
        );

        // RooCode mode generation is implemented (T016)
        expect(correctLocationFiles).toHaveLength(MODE_FILES.length);
      });
    });

    /**
     * T013: RooCode setup should NOT create any files in .roo/commands/
     *
     * Expected behavior: When RooCode extension is selected with mode-only generation,
     * the generator should NOT create command files in .roo/commands/ directory.
     *
     * The new mode-based approach uses .roomodes + .meeseeks/modes/ instead.
     */
    describe('T013: RooCode does NOT create command files', () => {
      const COMMAND_FILES = [
        'prime.md',
        'plan.md',
        'define-acceptance.md',
        'execute.md',
        'verify.md',
        'status.md',
      ];

      it.fails('should NOT create any files in .roo/commands/ directory', async () => {
        await simulateRooCodeSetup();

        // Verify NO files were created in .roo/commands/
        const commandDirFiles = createdFiles.filter(f =>
          f.includes('.roo/commands') || f.includes('.roo\\commands')
        );

        // This test will FAIL until RooCode implementation is updated
        // Currently RooCode generates command files in .roo/commands/
        expect(commandDirFiles).toHaveLength(0);
      });

      it.fails('should NOT create legacy command files (prime.md, plan.md, etc.)', async () => {
        await simulateRooCodeSetup();

        // Check for each legacy command file
        for (const cmdFile of COMMAND_FILES) {
          const cmdFileCreated = createdFiles.some(f =>
            f.includes('.roo') &&
            f.includes('commands') &&
            f.endsWith(cmdFile)
          );

          // This test will FAIL until RooCode implementation is updated
          // Each command file should NOT be created
          expect(cmdFileCreated).toBe(false);
        }
      });

      it.fails('should only generate mode files and context files, not command files', async () => {
        await simulateRooCodeSetup();

        // Categorize all created files
        const categorized = {
          roomodes: createdFiles.filter(f => f.endsWith('.roomodes')),
          modePrompts: createdFiles.filter(f =>
            (f.includes('.meeseeks/modes') || f.includes('.meeseeks\\modes')) &&
            f.includes('meeseeks-') &&
            f.endsWith('.prompt.md')
          ),
          primeFiles: createdFiles.filter(f =>
            (f.includes('.roo') || f.includes('.kilocode')) &&
            ['ARCHITECTURE.md', 'CONVENTION.md', 'INTEGRATION.md', 'STACK.md', 'STRUCTURE.md']
              .some(name => f.endsWith(name))
          ),
          commandFiles: createdFiles.filter(f =>
            f.includes('.roo/commands') || f.includes('.roo\\commands')
          ),
        };

        // Expected for RooCode with modes:
        // - 1 .roomodes file
        // - 7 mode prompt files
        // - 5 prime files (context)
        // - 0 command files

        // This test will FAIL until RooCode implementation is updated
        expect(categorized.roomodes).toHaveLength(1);
        expect(categorized.modePrompts).toHaveLength(7);
        expect(categorized.primeFiles).toHaveLength(5);
        expect(categorized.commandFiles).toHaveLength(0);
      });
    });
  });
});

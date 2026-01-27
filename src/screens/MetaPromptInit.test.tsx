import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Key } from 'ink';

// Mock fs module for file operations
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
  },
}));

// Mock the ink hooks
vi.mock('ink', async () => {
  const actual = await vi.importActual<typeof import('ink')>('ink');
  return {
    ...actual,
    useApp: () => ({ exit: vi.fn() }),
    useInput: vi.fn(),
  };
});

// Mock tech stack detector
vi.mock('../utils/metaPrompt/techStackDetector.js', () => ({
  detectTechStack: vi.fn().mockResolvedValue({
    runtime: 'Node.js',
    language: 'TypeScript',
    packageManager: 'npm',
    frameworks: ['React', 'Ink'],
    testFramework: 'Vitest',
    buildTool: 'Vite',
  }),
  hashTechStack: vi.fn().mockReturnValue('abc123'),
}));

// Mock embedded templates
vi.mock('../utils/metaPrompt/embeddedTemplates.js', () => ({
  getEmbeddedTemplate: vi.fn().mockReturnValue('# Template content'),
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
    return '# Mode template content';
  }),
}));

import * as fs from 'fs';
import { MetaPromptInit } from './MetaPromptInit.js';
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

// Track files written during test
let filesWritten: Map<string, string>;

describe('MetaPromptInit', () => {
  let mockOnBack: () => void;
  let capturedInputHandler: InputHandler | null;

  beforeEach(() => {
    mockOnBack = vi.fn();
    capturedInputHandler = null;
    filesWritten = new Map();

    vi.mocked(useInput).mockImplementation((handler: InputHandler) => {
      capturedInputHandler = handler;
    });

    // Default mock behavior - no existing files
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.writeFileSync).mockImplementation((path: any, content: any) => {
      filesWritten.set(path.toString(), content.toString());
    });
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.readFileSync).mockReturnValue('');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('displays the meta prompting setup header', () => {
      const { lastFrame } = render(<MetaPromptInit onBack={mockOnBack} />);

      expect(lastFrame()).toContain('Meta Prompting Setup');
    });

    it('displays extension options', () => {
      const { lastFrame } = render(<MetaPromptInit onBack={mockOnBack} />);

      expect(lastFrame()).toContain('RooCode');
      expect(lastFrame()).toContain('KiloCode');
    });

    it('displays keyboard hints for extension selection', () => {
      const { lastFrame } = render(<MetaPromptInit onBack={mockOnBack} />);

      expect(lastFrame()).toContain('Navigate');
      expect(lastFrame()).toContain('Select');
    });
  });

  describe('User Story 3: Prime context files generation', () => {
    // T018: RooCode setup should create prime files in .roo/ context directory
    it('RooCode setup creates prime files in .roo/ directory', async () => {
      render(<MetaPromptInit onBack={mockOnBack} />);

      // Ensure input handler was captured
      expect(capturedInputHandler).not.toBeNull();

      // Initial state - RooCode should be first option (index 0)
      // Press Enter to select RooCode
      capturedInputHandler?.('', createKey({ return: true }));

      // Wait for async tech stack detection
      await vi.waitFor(() => {
        // Check if we moved past detecting-stack step
        // The component should have set up targetDir
      }, { timeout: 1000 });

      // Wait a tick for the async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate confirming generation (press 'y')
      capturedInputHandler?.('y', createKey());

      // Wait for file generation
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify that prime files were written to .roo/ directory
      // Check that mkdirSync was called for .roo directory
      const mkdirCalls = vi.mocked(fs.mkdirSync).mock.calls;
      const rooDirectoryCreated = mkdirCalls.some(call => {
        const dirPath = call[0]?.toString() || '';
        return dirPath.includes('.roo');
      });

      expect(rooDirectoryCreated).toBe(true);

      // Verify writeFileSync was called with paths in .roo/
      const writeFileCalls = vi.mocked(fs.writeFileSync).mock.calls;
      const primeFileNames = ['ARCHITECTURE.md', 'CONVENTION.md', 'INTEGRATION.md', 'STACK.md', 'STRUCTURE.md'];

      for (const fileName of primeFileNames) {
        const primeFileWritten = writeFileCalls.some(call => {
          const filePath = call[0]?.toString() || '';
          return filePath.includes('.roo') && filePath.endsWith(fileName);
        });

        expect(primeFileWritten).toBe(true);
      }
    });

    // T019: KiloCode setup should create prime files in .kilocode/workflows/context/
    it('KiloCode setup creates prime files in .kilocode/workflows/context/ directory', async () => {
      render(<MetaPromptInit onBack={mockOnBack} />);

      // Ensure input handler was captured
      expect(capturedInputHandler).not.toBeNull();

      // Navigate to KiloCode (second option - press down arrow once)
      capturedInputHandler?.('', createKey({ downArrow: true }));

      // Press Enter to select KiloCode
      capturedInputHandler?.('', createKey({ return: true }));

      // Wait for async tech stack detection
      await vi.waitFor(() => {
        // Check if we moved past detecting-stack step
      }, { timeout: 1000 });

      // Wait a tick for the async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate confirming generation (press 'y')
      capturedInputHandler?.('y', createKey());

      // Wait for file generation
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify that prime files were written to .kilocode/workflows/context/ directory
      // Check that mkdirSync was called for .kilocode/workflows/context directory
      const mkdirCalls = vi.mocked(fs.mkdirSync).mock.calls;
      const kilocodeContextDirCreated = mkdirCalls.some(call => {
        const dirPath = call[0]?.toString() || '';
        return dirPath.includes('.kilocode') && dirPath.includes('workflows') && dirPath.includes('context');
      });

      expect(kilocodeContextDirCreated).toBe(true);

      // Verify writeFileSync was called with paths in .kilocode/workflows/context/
      const writeFileCalls = vi.mocked(fs.writeFileSync).mock.calls;
      const primeFileNames = ['ARCHITECTURE.md', 'CONVENTION.md', 'INTEGRATION.md', 'STACK.md', 'STRUCTURE.md'];

      for (const fileName of primeFileNames) {
        const primeFileWritten = writeFileCalls.some(call => {
          const filePath = call[0]?.toString() || '';
          return filePath.includes('.kilocode/workflows/context') && filePath.endsWith(fileName);
        });

        expect(primeFileWritten).toBe(true);
      }
    });
  });

  /**
   * User Story 2: Generate Custom Modes for RooCode
   *
   * As a RooCode user, I want meeseeks to generate .roomodes and mode prompt files
   * instead of command files, so I can use custom modes for the meeseeks workflow.
   *
   * This mirrors the KiloCode mode generation that creates:
   * - .kilocodemodes in project root
   * - Mode prompts in .meeseeks/modes/
   *
   * For RooCode, we expect:
   * - .roomodes in project root
   * - Mode prompts in .meeseeks/modes/
   * - NO command files in .roo/commands/
   */
  describe('User Story 2: RooCode mode-only generation', () => {
    const MODE_FILES = [
      'prime',
      'orchestrate',
      'discuss',
      'plan',
      'generate-verification',
      'execute',
      'verify',
    ];

    const COMMAND_FILES = [
      'prime',
      'plan',
      'define-acceptance',
      'execute',
      'verify',
      'status',
    ];

    /**
     * T011: RooCode setup should create .roomodes file in project root
     *
     * Expected behavior: When RooCode extension is selected, the generator should
     * create a .roomodes file in the project root directory (similar to how
     * KiloCode creates .kilocodemodes).
     */
    describe('T011: RooCode creates .roomodes in project root', () => {
      it('should create .roomodes file in project root during RooCode setup', async () => {
        render(<MetaPromptInit onBack={mockOnBack} />);

        // Ensure input handler was captured
        expect(capturedInputHandler).not.toBeNull();

        // Select RooCode (first option)
        capturedInputHandler?.('', createKey({ return: true }));

        // Wait for async tech stack detection
        await new Promise(resolve => setTimeout(resolve, 100));

        // Confirm generation
        capturedInputHandler?.('y', createKey());

        // Wait for file generation
        await new Promise(resolve => setTimeout(resolve, 200));

        // Verify .roomodes was created in project root
        const writeFileCalls = vi.mocked(fs.writeFileSync).mock.calls;
        const roommodesWritten = writeFileCalls.some(call => {
          const filePath = call[0]?.toString() || '';
          // Should be in project root, not in .roo/
          return filePath.endsWith('.roomodes') && !filePath.includes('.roo/');
        });

        // RooCode mode generation is implemented (T015)
        expect(roommodesWritten).toBe(true);
      });

      it('should write valid JSON with customModes array to .roomodes', async () => {
        render(<MetaPromptInit onBack={mockOnBack} />);

        expect(capturedInputHandler).not.toBeNull();

        // Select RooCode and confirm
        capturedInputHandler?.('', createKey({ return: true }));
        await new Promise(resolve => setTimeout(resolve, 100));
        capturedInputHandler?.('y', createKey());
        await new Promise(resolve => setTimeout(resolve, 200));

        // Find the .roomodes file content
        const roommodesContent = [...filesWritten.entries()].find(([path]) =>
          path.endsWith('.roomodes')
        )?.[1];

        // RooCode mode generation is implemented (T015)
        expect(roommodesContent).toBeDefined();

        // If implemented correctly, content should be valid JSON with customModes
        if (roommodesContent) {
          const parsed = JSON.parse(roommodesContent);
          expect(parsed.customModes).toBeDefined();
          expect(Array.isArray(parsed.customModes)).toBe(true);
          expect(parsed.customModes.length).toBeGreaterThan(0);
        }
      });
    });

    /**
     * T012: RooCode setup should create mode prompts in .meeseeks/modes/
     *
     * Expected behavior: When RooCode extension is selected, the generator should
     * create mode prompt files in .meeseeks/modes/ directory (same location as
     * KiloCode mode prompts for consistency).
     */
    describe('T012: RooCode creates mode prompts in .meeseeks/modes/', () => {
      it('should create .meeseeks/modes/ directory for RooCode', async () => {
        render(<MetaPromptInit onBack={mockOnBack} />);

        expect(capturedInputHandler).not.toBeNull();

        // Select RooCode and confirm
        capturedInputHandler?.('', createKey({ return: true }));
        await new Promise(resolve => setTimeout(resolve, 100));
        capturedInputHandler?.('y', createKey());
        await new Promise(resolve => setTimeout(resolve, 200));

        // Verify .meeseeks/modes/ directory was created
        const mkdirCalls = vi.mocked(fs.mkdirSync).mock.calls;
        const meeseeksModesDirCreated = mkdirCalls.some(call => {
          const dirPath = call[0]?.toString() || '';
          return dirPath.includes('.meeseeks') && dirPath.includes('modes');
        });

        // RooCode mode generation is implemented (T016)
        expect(meeseeksModesDirCreated).toBe(true);
      });

      it('should create all 7 mode prompt files for RooCode', async () => {
        render(<MetaPromptInit onBack={mockOnBack} />);

        expect(capturedInputHandler).not.toBeNull();

        // Select RooCode and confirm
        capturedInputHandler?.('', createKey({ return: true }));
        await new Promise(resolve => setTimeout(resolve, 100));
        capturedInputHandler?.('y', createKey());
        await new Promise(resolve => setTimeout(resolve, 200));

        // Verify all mode prompt files were created
        const writeFileCalls = vi.mocked(fs.writeFileSync).mock.calls;

        for (const modeName of MODE_FILES) {
          const modeFileWritten = writeFileCalls.some(call => {
            const filePath = call[0]?.toString() || '';
            return filePath.includes('.meeseeks/modes') &&
                   filePath.includes(`meeseeks-${modeName}.prompt.md`);
          });

          // RooCode mode generation is implemented (T016)
          expect(modeFileWritten).toBe(true);
        }
      });

      it('should use .meeseeks/modes/ not .roo/modes/ for mode prompts', async () => {
        render(<MetaPromptInit onBack={mockOnBack} />);

        expect(capturedInputHandler).not.toBeNull();

        // Select RooCode and confirm
        capturedInputHandler?.('', createKey({ return: true }));
        await new Promise(resolve => setTimeout(resolve, 100));
        capturedInputHandler?.('y', createKey());
        await new Promise(resolve => setTimeout(resolve, 200));

        // Mode files should be in .meeseeks/modes/ NOT .roo/modes/
        const writeFileCalls = vi.mocked(fs.writeFileSync).mock.calls;

        // Check for any mode files in wrong location (.roo/modes/)
        const wrongLocationModeFiles = writeFileCalls.filter(call => {
          const filePath = call[0]?.toString() || '';
          return filePath.includes('.roo/modes') && filePath.includes('meeseeks-');
        });

        expect(wrongLocationModeFiles.length).toBe(0);

        // Check for mode files in correct location (.meeseeks/modes/)
        const correctLocationModeFiles = writeFileCalls.filter(call => {
          const filePath = call[0]?.toString() || '';
          return filePath.includes('.meeseeks/modes') && filePath.includes('meeseeks-');
        });

        // RooCode mode generation is implemented (T016)
        expect(correctLocationModeFiles.length).toBe(MODE_FILES.length);
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
      it.fails('should not create any files in .roo/commands/ directory', async () => {
        render(<MetaPromptInit onBack={mockOnBack} />);

        expect(capturedInputHandler).not.toBeNull();

        // Select RooCode and confirm
        capturedInputHandler?.('', createKey({ return: true }));
        await new Promise(resolve => setTimeout(resolve, 100));
        capturedInputHandler?.('y', createKey());
        await new Promise(resolve => setTimeout(resolve, 200));

        // Verify NO files were written to .roo/commands/
        const writeFileCalls = vi.mocked(fs.writeFileSync).mock.calls;
        const commandFilesWritten = writeFileCalls.filter(call => {
          const filePath = call[0]?.toString() || '';
          return filePath.includes('.roo/commands') || filePath.includes('.roo\\commands');
        });

        // This test will FAIL until RooCode implementation is updated
        // Currently RooCode generates command files in .roo/commands/
        expect(commandFilesWritten.length).toBe(0);
      });

      it.fails('should not create legacy command files (prime.md, plan.md, etc.)', async () => {
        render(<MetaPromptInit onBack={mockOnBack} />);

        expect(capturedInputHandler).not.toBeNull();

        // Select RooCode and confirm
        capturedInputHandler?.('', createKey({ return: true }));
        await new Promise(resolve => setTimeout(resolve, 100));
        capturedInputHandler?.('y', createKey());
        await new Promise(resolve => setTimeout(resolve, 200));

        // Check for each legacy command file
        const writeFileCalls = vi.mocked(fs.writeFileSync).mock.calls;

        for (const cmdName of COMMAND_FILES) {
          const cmdFileWritten = writeFileCalls.some(call => {
            const filePath = call[0]?.toString() || '';
            // RooCode command files are named like prime.md, plan.md, etc.
            return filePath.includes('.roo') &&
                   filePath.includes('commands') &&
                   (filePath.endsWith(`${cmdName}.md`) || filePath.endsWith(`${cmdName}.prompt.md`));
          });

          // This test will FAIL until RooCode implementation is updated
          // Each command file should NOT be created
          expect(cmdFileWritten).toBe(false);
        }
      });

      it.fails('should only create mode files and context files, not command files', async () => {
        render(<MetaPromptInit onBack={mockOnBack} />);

        expect(capturedInputHandler).not.toBeNull();

        // Select RooCode and confirm
        capturedInputHandler?.('', createKey({ return: true }));
        await new Promise(resolve => setTimeout(resolve, 100));
        capturedInputHandler?.('y', createKey());
        await new Promise(resolve => setTimeout(resolve, 200));

        const writeFileCalls = vi.mocked(fs.writeFileSync).mock.calls;

        // Categorize written files
        const categorizedFiles = {
          roomodes: 0,
          modePrompts: 0,
          primeFiles: 0,
          commandFiles: 0,
          other: 0,
        };

        for (const call of writeFileCalls) {
          const filePath = call[0]?.toString() || '';

          if (filePath.endsWith('.roomodes')) {
            categorizedFiles.roomodes++;
          } else if (filePath.includes('.meeseeks/modes') && filePath.includes('meeseeks-')) {
            categorizedFiles.modePrompts++;
          } else if (filePath.match(/\.(roo|kilocode).*(ARCHITECTURE|CONVENTION|INTEGRATION|STACK|STRUCTURE)\.md$/)) {
            categorizedFiles.primeFiles++;
          } else if (filePath.includes('.roo/commands') || filePath.includes('.roo\\commands')) {
            categorizedFiles.commandFiles++;
          } else {
            categorizedFiles.other++;
          }
        }

        // Expected: 1 .roomodes, 7 mode prompts, 5 prime files, 0 command files
        // This test will FAIL until RooCode implementation is updated
        expect(categorizedFiles.roomodes).toBe(1);
        expect(categorizedFiles.modePrompts).toBe(MODE_FILES.length);
        expect(categorizedFiles.commandFiles).toBe(0);
      });
    });
  });
});

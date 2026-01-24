import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { detectTechStack, hashTechStack } from './techStackDetector.js';
import type { TechStack } from './types.js';

// Mock fs module
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    promises: {
      access: vi.fn(),
      readFile: vi.fn(),
    },
  };
});

describe('techStackDetector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hashTechStack', () => {
    it('generates consistent hash for same tech stack', () => {
      const stack: TechStack = {
        runtime: 'Node.js',
        language: 'TypeScript',
        frameworks: ['React', 'Express'],
        testFramework: 'Vitest',
        buildTool: 'Vite',
      };

      const hash1 = hashTechStack(stack);
      const hash2 = hashTechStack(stack);

      expect(hash1).toBe(hash2);
    });

    it('generates different hash for different tech stacks', () => {
      const stack1: TechStack = {
        runtime: 'Node.js',
        language: 'TypeScript',
        frameworks: ['React'],
        testFramework: 'Vitest',
      };

      const stack2: TechStack = {
        runtime: 'Node.js',
        language: 'JavaScript',
        frameworks: ['React'],
        testFramework: 'Jest',
      };

      const hash1 = hashTechStack(stack1);
      const hash2 = hashTechStack(stack2);

      expect(hash1).not.toBe(hash2);
    });

    it('sorts frameworks for consistent hashing', () => {
      const stack1: TechStack = {
        runtime: 'Node.js',
        frameworks: ['React', 'Express', 'Fastify'],
      };

      const stack2: TechStack = {
        runtime: 'Node.js',
        frameworks: ['Fastify', 'React', 'Express'],
      };

      const hash1 = hashTechStack(stack1);
      const hash2 = hashTechStack(stack2);

      expect(hash1).toBe(hash2);
    });

    it('handles empty frameworks array', () => {
      const stack: TechStack = {
        runtime: 'Node.js',
        frameworks: [],
      };

      const hash = hashTechStack(stack);

      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('handles minimal tech stack', () => {
      const stack: TechStack = {
        runtime: 'unknown',
        frameworks: [],
      };

      const hash = hashTechStack(stack);

      expect(typeof hash).toBe('string');
    });

    it('includes optional fields in hash calculation', () => {
      const stackWithBuildTool: TechStack = {
        runtime: 'Node.js',
        frameworks: [],
        buildTool: 'Vite',
      };

      const stackWithoutBuildTool: TechStack = {
        runtime: 'Node.js',
        frameworks: [],
      };

      const hash1 = hashTechStack(stackWithBuildTool);
      const hash2 = hashTechStack(stackWithoutBuildTool);

      expect(hash1).not.toBe(hash2);
    });

    it('generates hash in base36 format', () => {
      const stack: TechStack = {
        runtime: 'Node.js',
        frameworks: ['React'],
      };

      const hash = hashTechStack(stack);

      // Base36 uses only alphanumeric characters and optional leading minus
      expect(hash).toMatch(/^-?[a-z0-9]+$/);
    });
  });

  describe('detectTechStack', () => {
    it('returns unknown runtime when no manifest files found', async () => {
      const mockAccess = fs.promises.access as ReturnType<typeof vi.fn>;
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const stack = await detectTechStack('/fake/project');

      expect(stack.runtime).toBe('unknown');
      expect(stack.frameworks).toEqual([]);
    });

    it('detects Node.js runtime from package.json', async () => {
      const mockAccess = fs.promises.access as ReturnType<typeof vi.fn>;
      const mockReadFile = fs.promises.readFile as ReturnType<typeof vi.fn>;

      mockAccess.mockImplementation(async (filePath: string) => {
        if (filePath.endsWith('package.json')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      mockReadFile.mockResolvedValue(
        JSON.stringify({
          dependencies: {
            react: '^18.0.0',
          },
          devDependencies: {
            vitest: '^1.0.0',
          },
        })
      );

      const stack = await detectTechStack('/fake/project');

      expect(stack.runtime).toBe('Node.js');
      expect(stack.frameworks).toContain('React');
      expect(stack.testFramework).toBe('Vitest');
    });

    it('detects TypeScript language from tsconfig.json', async () => {
      const mockAccess = fs.promises.access as ReturnType<typeof vi.fn>;
      const mockReadFile = fs.promises.readFile as ReturnType<typeof vi.fn>;

      mockAccess.mockImplementation(async (filePath: string) => {
        if (
          filePath.endsWith('package.json') ||
          filePath.endsWith('tsconfig.json')
        ) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      mockReadFile.mockResolvedValue(
        JSON.stringify({
          dependencies: {},
          devDependencies: {
            typescript: '^5.0.0',
          },
        })
      );

      const stack = await detectTechStack('/fake/project');

      expect(stack.language).toBe('TypeScript');
    });

    it('detects npm package manager from package-lock.json', async () => {
      const mockAccess = fs.promises.access as ReturnType<typeof vi.fn>;
      const mockReadFile = fs.promises.readFile as ReturnType<typeof vi.fn>;

      mockAccess.mockImplementation(async (filePath: string) => {
        if (
          filePath.endsWith('package.json') ||
          filePath.endsWith('package-lock.json')
        ) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      mockReadFile.mockResolvedValue(
        JSON.stringify({
          dependencies: {},
        })
      );

      const stack = await detectTechStack('/fake/project');

      expect(stack.packageManager).toBe('npm');
    });

    it('detects yarn package manager from yarn.lock', async () => {
      const mockAccess = fs.promises.access as ReturnType<typeof vi.fn>;
      const mockReadFile = fs.promises.readFile as ReturnType<typeof vi.fn>;

      mockAccess.mockImplementation(async (filePath: string) => {
        if (filePath.endsWith('package.json') || filePath.endsWith('yarn.lock')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      mockReadFile.mockResolvedValue(
        JSON.stringify({
          dependencies: {},
        })
      );

      const stack = await detectTechStack('/fake/project');

      expect(stack.packageManager).toBe('yarn');
    });

    it('detects pnpm package manager from pnpm-lock.yaml', async () => {
      const mockAccess = fs.promises.access as ReturnType<typeof vi.fn>;
      const mockReadFile = fs.promises.readFile as ReturnType<typeof vi.fn>;

      mockAccess.mockImplementation(async (filePath: string) => {
        if (
          filePath.endsWith('package.json') ||
          filePath.endsWith('pnpm-lock.yaml')
        ) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      mockReadFile.mockResolvedValue(
        JSON.stringify({
          dependencies: {},
        })
      );

      const stack = await detectTechStack('/fake/project');

      expect(stack.packageManager).toBe('pnpm');
    });

    it('detects multiple frameworks from dependencies', async () => {
      const mockAccess = fs.promises.access as ReturnType<typeof vi.fn>;
      const mockReadFile = fs.promises.readFile as ReturnType<typeof vi.fn>;

      mockAccess.mockImplementation(async (filePath: string) => {
        if (filePath.endsWith('package.json')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      mockReadFile.mockResolvedValue(
        JSON.stringify({
          dependencies: {
            react: '^18.0.0',
            express: '^4.18.0',
            next: '^14.0.0',
          },
          devDependencies: {},
        })
      );

      const stack = await detectTechStack('/fake/project');

      expect(stack.frameworks).toContain('React');
      expect(stack.frameworks).toContain('Express');
      expect(stack.frameworks).toContain('Next.js');
    });

    it('detects test frameworks from devDependencies', async () => {
      const mockAccess = fs.promises.access as ReturnType<typeof vi.fn>;
      const mockReadFile = fs.promises.readFile as ReturnType<typeof vi.fn>;

      mockAccess.mockImplementation(async (filePath: string) => {
        if (filePath.endsWith('package.json')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      mockReadFile.mockResolvedValue(
        JSON.stringify({
          dependencies: {},
          devDependencies: {
            jest: '^29.0.0',
          },
        })
      );

      const stack = await detectTechStack('/fake/project');

      expect(stack.testFramework).toBe('Jest');
    });

    it('detects build tools from devDependencies', async () => {
      const mockAccess = fs.promises.access as ReturnType<typeof vi.fn>;
      const mockReadFile = fs.promises.readFile as ReturnType<typeof vi.fn>;

      mockAccess.mockImplementation(async (filePath: string) => {
        if (filePath.endsWith('package.json')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      mockReadFile.mockResolvedValue(
        JSON.stringify({
          dependencies: {},
          devDependencies: {
            vite: '^5.0.0',
          },
        })
      );

      const stack = await detectTechStack('/fake/project');

      expect(stack.buildTool).toBe('Vite');
    });

    it('detects Python runtime from requirements.txt', async () => {
      const mockAccess = fs.promises.access as ReturnType<typeof vi.fn>;
      const mockReadFile = fs.promises.readFile as ReturnType<typeof vi.fn>;

      mockAccess.mockImplementation(async (filePath: string) => {
        if (filePath.endsWith('requirements.txt')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      mockReadFile.mockResolvedValue('django==4.0\npytest==7.0');

      const stack = await detectTechStack('/fake/project');

      expect(stack.runtime).toBe('Python');
      expect(stack.language).toBe('Python');
      expect(stack.packageManager).toBe('pip');
      expect(stack.frameworks).toContain('Django');
      expect(stack.testFramework).toBe('pytest');
    });

    it('detects Python runtime from pyproject.toml', async () => {
      const mockAccess = fs.promises.access as ReturnType<typeof vi.fn>;

      mockAccess.mockImplementation(async (filePath: string) => {
        if (filePath.endsWith('pyproject.toml')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      const stack = await detectTechStack('/fake/project');

      expect(stack.runtime).toBe('Python');
      expect(stack.language).toBe('Python');
      expect(stack.packageManager).toBe('poetry');
    });

    it('detects Rust runtime from Cargo.toml', async () => {
      const mockAccess = fs.promises.access as ReturnType<typeof vi.fn>;

      mockAccess.mockImplementation(async (filePath: string) => {
        if (filePath.endsWith('Cargo.toml')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      const stack = await detectTechStack('/fake/project');

      expect(stack.runtime).toBe('Rust');
      expect(stack.language).toBe('Rust');
      expect(stack.packageManager).toBe('cargo');
    });

    it('detects Go runtime from go.mod', async () => {
      const mockAccess = fs.promises.access as ReturnType<typeof vi.fn>;

      mockAccess.mockImplementation(async (filePath: string) => {
        if (filePath.endsWith('go.mod')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      const stack = await detectTechStack('/fake/project');

      expect(stack.runtime).toBe('Go');
      expect(stack.language).toBe('Go');
      expect(stack.packageManager).toBeUndefined();
    });

    it('prioritizes vitest over jest for test framework detection', async () => {
      const mockAccess = fs.promises.access as ReturnType<typeof vi.fn>;
      const mockReadFile = fs.promises.readFile as ReturnType<typeof vi.fn>;

      mockAccess.mockImplementation(async (filePath: string) => {
        if (filePath.endsWith('package.json')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      mockReadFile.mockResolvedValue(
        JSON.stringify({
          dependencies: {},
          devDependencies: {
            vitest: '^1.0.0',
            jest: '^29.0.0',
          },
        })
      );

      const stack = await detectTechStack('/fake/project');

      expect(stack.testFramework).toBe('Vitest');
    });

    it('handles malformed package.json gracefully', async () => {
      const mockAccess = fs.promises.access as ReturnType<typeof vi.fn>;
      const mockReadFile = fs.promises.readFile as ReturnType<typeof vi.fn>;

      mockAccess.mockImplementation(async (filePath: string) => {
        if (filePath.endsWith('package.json')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      mockReadFile.mockResolvedValue('{ invalid json }');

      const stack = await detectTechStack('/fake/project');

      // Should not throw, returns default
      expect(stack.runtime).toBe('unknown');
    });
  });
});

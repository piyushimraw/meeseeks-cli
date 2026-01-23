import * as fs from 'fs';
import * as path from 'path';
import type { TechStack } from './types.js';

/**
 * Check if a file exists at the given path
 */
async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely read and parse JSON file
 */
async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Detect package manager from lock files
 */
async function detectPackageManager(projectRoot: string): Promise<'npm' | 'yarn' | 'pnpm' | undefined> {
  if (await exists(path.join(projectRoot, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await exists(path.join(projectRoot, 'yarn.lock'))) return 'yarn';
  if (await exists(path.join(projectRoot, 'package-lock.json'))) return 'npm';
  if (await exists(path.join(projectRoot, 'package.json'))) return 'npm'; // Default to npm
  return undefined;
}

/**
 * Detect test framework from dependencies
 */
function detectTestFramework(deps: Record<string, string>): string | undefined {
  // Prioritize newer/faster tools
  if (deps.vitest) return 'Vitest';
  if (deps.jest) return 'Jest';
  if (deps.mocha) return 'Mocha';
  if (deps.ava) return 'AVA';
  if (deps.tap) return 'Tap';
  if (deps.jasmine) return 'Jasmine';
  return undefined;
}

/**
 * Detect build tool from dependencies
 */
function detectBuildTool(deps: Record<string, string>): string | undefined {
  if (deps.vite) return 'Vite';
  if (deps.esbuild) return 'esbuild';
  if (deps.webpack) return 'Webpack';
  if (deps.rollup) return 'Rollup';
  if (deps.parcel) return 'Parcel';
  if (deps.turbo) return 'Turborepo';
  return undefined;
}

/**
 * Detect frameworks from dependencies
 */
function detectFrameworks(deps: Record<string, string>): string[] {
  const frameworks: string[] = [];

  // Frontend frameworks
  if (deps.next) frameworks.push('Next.js');
  if (deps.react) frameworks.push('React');
  if (deps.vue) frameworks.push('Vue');
  if (deps.svelte) frameworks.push('Svelte');
  if (deps['@angular/core']) frameworks.push('Angular');
  if (deps['solid-js']) frameworks.push('Solid');

  // Backend frameworks
  if (deps.express) frameworks.push('Express');
  if (deps.fastify) frameworks.push('Fastify');
  if (deps.koa) frameworks.push('Koa');
  if (deps.hono) frameworks.push('Hono');
  if (deps.nestjs || deps['@nestjs/core']) frameworks.push('NestJS');

  // TUI/CLI
  if (deps.ink) frameworks.push('Ink');
  if (deps.commander) frameworks.push('Commander');

  return frameworks;
}

/**
 * Detect TypeScript or JavaScript
 */
async function detectLanguage(projectRoot: string): Promise<'TypeScript' | 'JavaScript' | undefined> {
  if (await exists(path.join(projectRoot, 'tsconfig.json'))) return 'TypeScript';
  if (await exists(path.join(projectRoot, 'jsconfig.json'))) return 'JavaScript';
  // Check package.json for typescript dependency
  const pkg = await readJsonFile<{ devDependencies?: Record<string, string> }>(
    path.join(projectRoot, 'package.json')
  );
  if (pkg?.devDependencies?.typescript) return 'TypeScript';
  return undefined;
}

/**
 * Detect tech stack from project manifest files
 */
export async function detectTechStack(projectRoot: string): Promise<TechStack> {
  const stack: TechStack = {
    runtime: 'unknown',
    frameworks: [],
  };

  // JavaScript/TypeScript (package.json)
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (await exists(packageJsonPath)) {
    const pkg = await readJsonFile<{
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    }>(packageJsonPath);

    if (pkg) {
      stack.runtime = 'Node.js';
      stack.packageManager = await detectPackageManager(projectRoot);
      stack.language = await detectLanguage(projectRoot);

      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      stack.frameworks = detectFrameworks(allDeps);
      stack.testFramework = detectTestFramework(allDeps);
      stack.buildTool = detectBuildTool(allDeps);
    }
  }

  // Python (requirements.txt or pyproject.toml)
  const requirementsPath = path.join(projectRoot, 'requirements.txt');
  const pyprojectPath = path.join(projectRoot, 'pyproject.toml');

  if (await exists(requirementsPath)) {
    stack.runtime = 'Python';
    stack.language = 'Python';
    stack.packageManager = 'pip';

    const reqs = await fs.promises.readFile(requirementsPath, 'utf-8');
    if (reqs.includes('django')) stack.frameworks.push('Django');
    if (reqs.includes('flask')) stack.frameworks.push('Flask');
    if (reqs.includes('fastapi')) stack.frameworks.push('FastAPI');
    if (reqs.includes('pytest')) stack.testFramework = 'pytest';
  } else if (await exists(pyprojectPath)) {
    stack.runtime = 'Python';
    stack.language = 'Python';
    stack.packageManager = 'poetry';
  }

  // Rust (Cargo.toml)
  const cargoPath = path.join(projectRoot, 'Cargo.toml');
  if (await exists(cargoPath)) {
    stack.runtime = 'Rust';
    stack.language = 'Rust';
    stack.packageManager = 'cargo';
    // Could parse TOML for framework detection, but keeping it simple
  }

  // Go (go.mod)
  const goModPath = path.join(projectRoot, 'go.mod');
  if (await exists(goModPath)) {
    stack.runtime = 'Go';
    stack.language = 'Go';
    stack.packageManager = undefined; // Go modules
  }

  return stack;
}

/**
 * Generate a hash of the tech stack for change detection
 */
export function hashTechStack(stack: TechStack): string {
  const data = JSON.stringify({
    runtime: stack.runtime,
    language: stack.language,
    frameworks: stack.frameworks.sort(),
    testFramework: stack.testFramework,
    buildTool: stack.buildTool,
  });
  // Simple hash for change detection (not cryptographic)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

# Feature: Test Watcher - Automated Test Generation

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types, and models. Import from the right files etc.

## Feature Description

A file watcher feature that monitors source files matching a glob pattern and automatically generates or updates tests using the selected AI model. The feature respects project-specific testing rules defined in `.meeseeks/rules/test.md`, `AGENTS.md`, or `CLAUDE.md`.

## User Story

As a developer
I want to watch my source files and automatically generate/update tests when they change
So that I can maintain test coverage without manual effort while following project-specific testing rules

## Problem Statement

Developers spend significant time manually writing and maintaining tests. When source code changes, tests often become outdated or incomplete. This feature addresses this by:
1. Automatically detecting file changes via glob patterns
2. Loading project-specific testing rules
3. Generating contextually-aware tests using AI
4. Writing/updating test files alongside source code

## Solution Statement

Implement a new "Test Watcher" feature accessible from the main menu that:
1. Accepts a glob pattern to watch (e.g., `src/**/*.ts`)
2. Uses `chokidar` for efficient file watching
3. Uses `fast-glob` for pattern matching
4. Loads testing rules from standard locations
5. Generates tests using GitHub Copilot API with the selected model
6. Writes tests to appropriate locations (co-located or separate directory)

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**:
- Screen system (new TestWatcher screen)
- Menu system (new menu item)
- Utils (new file watching, rules loading, test generation utilities)
- Types (new interfaces and types)
**Dependencies**:
- `chokidar` ^4.0.0 (file watching)
- `fast-glob` ^3.3.0 (glob pattern matching)

---

## CONTEXT REFERENCES

### Relevant Codebase Files - IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `/Users/piyush.shrivastava/projects/meeseeks/src/types/index.ts` (lines 1-93) - Why: Contains all type definitions; add new watcher types here following existing patterns
- `/Users/piyush.shrivastava/projects/meeseeks/src/screens/QAPlan.tsx` (lines 1-583) - Why: Reference implementation for AI-powered feature with state machine, loading states, error handling
- `/Users/piyush.shrivastava/projects/meeseeks/src/components/Menu.tsx` (lines 27-58) - Why: Shows how to add new menu items with categories
- `/Users/piyush.shrivastava/projects/meeseeks/src/index.tsx` (lines 33-49) - Why: Shows how to add new screen to renderScreen switch
- `/Users/piyush.shrivastava/projects/meeseeks/src/utils/copilot.ts` (lines 282-339) - Why: chatWithCopilot function for AI integration
- `/Users/piyush.shrivastava/projects/meeseeks/src/utils/settings.ts` (lines 1-70) - Why: Config persistence pattern for saving watcher settings
- `/Users/piyush.shrivastava/projects/meeseeks/src/context/CopilotContext.tsx` - Why: Shows how to use CopilotProvider and get auth state

### New Files to Create

- `src/screens/TestWatcher.tsx` - Main UI screen for the test watcher feature
- `src/utils/fileWatcher.ts` - File watching utilities using chokidar + fast-glob
- `src/utils/rulesLoader.ts` - Load testing rules from standard locations
- `src/utils/testGenerator.ts` - Generate tests using AI with rules context

### Relevant Documentation - YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Chokidar GitHub](https://github.com/paulmillr/chokidar)
  - Specific section: API and Options
  - Why: v4+ is ESM-only, TypeScript native, uses `watch()` method with event callbacks

- [fast-glob GitHub](https://github.com/mrmlnc/fast-glob)
  - Specific section: API and Pattern Syntax
  - Why: Use `fg.glob()` async method for pattern matching

- [Ink Documentation](https://github.com/vadimdemedes/ink)
  - Specific section: Components and Hooks
  - Why: TUI components for the watcher screen

### Patterns to Follow

**Naming Conventions:**
- Interfaces: PascalCase (e.g., `WatcherConfig`, `FileChangeEvent`)
- Functions: camelCase (e.g., `startWatcher`, `loadTestingRules`)
- Constants: UPPER_SNAKE_CASE (e.g., `DEFAULT_GLOB_PATTERN`)
- React Components: PascalCase with `.tsx` extension
- Utility files: camelCase with `.ts` extension

**Error Handling Pattern (from copilot.ts):**
```typescript
interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

**State Machine Pattern (from QAPlan.tsx):**
```typescript
type WatcherState = 'idle' | 'configuring' | 'watching' | 'generating' | 'error';
```

**File I/O Pattern (from knowledgeBase.ts):**
```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Use fs.existsSync() for checks
// Use fs.readFileSync(path, 'utf-8') for reading
// Use fs.writeFileSync(path, content, 'utf-8') for writing
```

**Screen Component Pattern:**
```typescript
interface ScreenProps {
  onBack: () => void;
}

export const ScreenName: React.FC<ScreenProps> = ({onBack}) => {
  // State, effects, input handling
  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Header */}
      <Text color={palette.orange}>{'+-[ Screen Title ]' + '-'.repeat(40) + '+'}</Text>
      {/* Content */}
      <Box flexDirection="column" paddingLeft={2} paddingY={1}>
        {renderContent()}
      </Box>
      {/* Footer */}
      <Text color={palette.orange}>{'+-' + '-'.repeat(60) + '+'}</Text>
      {/* Navigation hints */}
      <Box marginTop={1} marginLeft={2}>
        <Text color={palette.dim}>Esc/b Go back</Text>
      </Box>
    </Box>
  );
};
```

**Color Palette (use consistently):**
```typescript
const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
  red: '#FF4444',
  dim: '#666666',
};
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation - Dependencies & Types

Set up the foundational dependencies and type definitions needed for the feature.

**Tasks:**
- Install chokidar and fast-glob dependencies
- Add new types for watcher configuration, file events, rules, and generated tests
- Update Screen type union to include new screen

### Phase 2: Core Utilities

Implement the core utilities for file watching, rules loading, and test generation.

**Tasks:**
- Create fileWatcher.ts with chokidar + fast-glob integration
- Create rulesLoader.ts for loading testing rules from standard locations
- Create testGenerator.ts for AI-powered test generation

### Phase 3: UI Implementation

Create the TestWatcher screen with full state machine and user interactions.

**Tasks:**
- Create TestWatcher.tsx screen component
- Implement configuration flow (glob pattern input, output location)
- Implement watching state with real-time file change display
- Implement test generation feedback and progress

### Phase 4: Integration

Integrate the new feature into the application.

**Tasks:**
- Add menu item to Menu.tsx
- Add screen case to index.tsx renderScreen
- Update imports

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

---

### Task 1: ADD dependencies to package.json

- **IMPLEMENT**: Add chokidar and fast-glob to dependencies
- **PATTERN**: Follow existing dependency format in package.json
- **COMMAND**: `npm install chokidar@^4.0.0 fast-glob@^3.3.0`
- **VALIDATE**: `npm ls chokidar fast-glob`

---

### Task 2: UPDATE types in src/types/index.ts

- **IMPLEMENT**: Add new types for the watcher feature at the end of the file
- **PATTERN**: Follow existing type patterns (PascalCase interfaces)
- **IMPORTS**: None needed (types file)

**Add the following types:**

```typescript
// Test Watcher Types
export interface WatcherConfig {
  globPattern: string;
  outputPattern: 'colocated' | 'separate';
  outputDir?: string;  // Only used when outputPattern is 'separate'
  testSuffix: string;  // e.g., '.test.ts' or '.spec.ts'
}

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  timestamp: string;
}

export interface TestRule {
  source: 'meeseeks' | 'agents' | 'claude';
  content: string;
  filePath: string;
}

export interface GeneratedTest {
  sourceFile: string;
  testFile: string;
  content: string;
  generatedAt: string;
}

export interface WatcherStatus {
  isWatching: boolean;
  watchedFiles: number;
  lastEvent?: FileChangeEvent;
  lastGenerated?: GeneratedTest;
}
```

- **VALIDATE**: `npm run build` (TypeScript compilation should succeed)

---

### Task 3: UPDATE Screen type in src/types/index.ts

- **IMPLEMENT**: Add 'test-watcher' to the Screen union type on line 1
- **PATTERN**: Pipe-separated union values
- **GOTCHA**: Keep existing values, just append new one

**Change from:**
```typescript
export type Screen = 'main' | 'copilot-connect' | 'qa-plan' | 'git-changes' | 'knowledge-base' | 'model-select';
```

**To:**
```typescript
export type Screen = 'main' | 'copilot-connect' | 'qa-plan' | 'git-changes' | 'knowledge-base' | 'model-select' | 'test-watcher';
```

- **VALIDATE**: `npm run build`

---

### Task 4: CREATE src/utils/fileWatcher.ts

- **IMPLEMENT**: File watching utility using chokidar and fast-glob
- **PATTERN**: Follow knowledgeBase.ts for file I/O patterns
- **IMPORTS**: chokidar, fast-glob, fs, path

**Create the file with:**

```typescript
import chokidar, { type FSWatcher } from 'chokidar';
import fg from 'fast-glob';
import * as fs from 'fs';
import * as path from 'path';
import type { FileChangeEvent, WatcherConfig } from '../types/index.js';

// Active watcher instance
let activeWatcher: FSWatcher | null = null;

/**
 * Resolve glob pattern to list of files
 */
export async function resolveGlobPattern(
  pattern: string,
  cwd: string = process.cwd()
): Promise<string[]> {
  try {
    const files = await fg.glob(pattern, {
      cwd,
      absolute: true,
      onlyFiles: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*'],
    });
    return files;
  } catch {
    return [];
  }
}

/**
 * Start watching files matching the pattern
 */
export function startWatcher(
  config: WatcherConfig,
  cwd: string = process.cwd(),
  onFileChange: (event: FileChangeEvent) => void,
  onReady?: (watchedCount: number) => void,
  onError?: (error: string) => void
): void {
  // Stop any existing watcher
  stopWatcher();

  try {
    // Get initial files to watch
    resolveGlobPattern(config.globPattern, cwd).then((files) => {
      if (files.length === 0) {
        onError?.('No files match the specified pattern');
        return;
      }

      // Create watcher with chokidar
      activeWatcher = chokidar.watch(files, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100,
        },
      });

      // Set up event handlers
      activeWatcher.on('add', (filePath) => {
        onFileChange({
          type: 'add',
          path: filePath,
          timestamp: new Date().toISOString(),
        });
      });

      activeWatcher.on('change', (filePath) => {
        onFileChange({
          type: 'change',
          path: filePath,
          timestamp: new Date().toISOString(),
        });
      });

      activeWatcher.on('unlink', (filePath) => {
        onFileChange({
          type: 'unlink',
          path: filePath,
          timestamp: new Date().toISOString(),
        });
      });

      activeWatcher.on('ready', () => {
        onReady?.(files.length);
      });

      activeWatcher.on('error', (error) => {
        onError?.(error.message);
      });
    });
  } catch (err) {
    onError?.(err instanceof Error ? err.message : 'Failed to start watcher');
  }
}

/**
 * Stop the active watcher
 */
export function stopWatcher(): void {
  if (activeWatcher) {
    activeWatcher.close();
    activeWatcher = null;
  }
}

/**
 * Check if watcher is currently active
 */
export function isWatcherActive(): boolean {
  return activeWatcher !== null;
}

/**
 * Get the test file path for a source file
 */
export function getTestFilePath(
  sourceFile: string,
  config: WatcherConfig
): string {
  const parsed = path.parse(sourceFile);
  const testFileName = `${parsed.name}${config.testSuffix}`;

  if (config.outputPattern === 'colocated') {
    return path.join(parsed.dir, testFileName);
  } else {
    // Separate directory
    const outputDir = config.outputDir || 'tests';
    const relativePath = path.relative(process.cwd(), parsed.dir);
    return path.join(process.cwd(), outputDir, relativePath, testFileName);
  }
}

/**
 * Read source file content
 */
export function readSourceFile(filePath: string): string | null {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Write test file content
 */
export function writeTestFile(testPath: string, content: string): boolean {
  try {
    const dir = path.dirname(testPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(testPath, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if test file already exists
 */
export function testFileExists(testPath: string): boolean {
  return fs.existsSync(testPath);
}

/**
 * Read existing test file content
 */
export function readTestFile(testPath: string): string | null {
  try {
    if (fs.existsSync(testPath)) {
      return fs.readFileSync(testPath, 'utf-8');
    }
  } catch {
    // Ignore errors
  }
  return null;
}
```

- **VALIDATE**: `npm run build`

---

### Task 5: CREATE src/utils/rulesLoader.ts

- **IMPLEMENT**: Utility to load testing rules from standard locations
- **PATTERN**: Follow settings.ts for file reading patterns
- **IMPORTS**: fs, path

**Create the file with:**

```typescript
import * as fs from 'fs';
import * as path from 'path';
import type { TestRule } from '../types/index.js';

// Standard rule file locations in priority order
const RULE_LOCATIONS = [
  { path: '.meeseeks/rules/test.md', source: 'meeseeks' as const },
  { path: 'AGENTS.md', source: 'agents' as const },
  { path: 'CLAUDE.md', source: 'claude' as const },
];

/**
 * Load testing rules from standard locations
 * Returns rules in priority order (first found takes precedence)
 */
export function loadTestingRules(
  projectRoot: string = process.cwd()
): TestRule[] {
  const rules: TestRule[] = [];

  for (const location of RULE_LOCATIONS) {
    const fullPath = path.join(projectRoot, location.path);

    try {
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Extract test-related rules if it's AGENTS.md or CLAUDE.md
        let relevantContent = content;
        if (location.source !== 'meeseeks') {
          relevantContent = extractTestingSection(content);
        }

        if (relevantContent.trim()) {
          rules.push({
            source: location.source,
            content: relevantContent,
            filePath: fullPath,
          });
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return rules;
}

/**
 * Extract testing-related sections from a markdown file
 * Looks for sections with "test" in the heading
 */
function extractTestingSection(content: string): string {
  const lines = content.split('\n');
  const sections: string[] = [];
  let inTestSection = false;
  let currentSection: string[] = [];

  for (const line of lines) {
    // Check for heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // Save previous section if it was a test section
      if (inTestSection && currentSection.length > 0) {
        sections.push(currentSection.join('\n'));
      }

      // Check if new section is test-related
      const headingText = headingMatch[2].toLowerCase();
      inTestSection = headingText.includes('test') ||
                      headingText.includes('testing') ||
                      headingText.includes('unit') ||
                      headingText.includes('spec');
      currentSection = inTestSection ? [line] : [];
    } else if (inTestSection) {
      currentSection.push(line);
    }
  }

  // Don't forget the last section
  if (inTestSection && currentSection.length > 0) {
    sections.push(currentSection.join('\n'));
  }

  return sections.join('\n\n');
}

/**
 * Format rules for inclusion in AI prompt
 */
export function formatRulesForPrompt(rules: TestRule[]): string {
  if (rules.length === 0) {
    return '';
  }

  const formattedRules = rules.map((rule) => {
    const sourceLabel = {
      meeseeks: 'Project Testing Rules (.meeseeks/rules/test.md)',
      agents: 'Agent Rules (AGENTS.md)',
      claude: 'Claude Rules (CLAUDE.md)',
    }[rule.source];

    return `### ${sourceLabel}\n\n${rule.content}`;
  });

  return `## Testing Rules\n\nFollow these project-specific testing rules:\n\n${formattedRules.join('\n\n')}`;
}

/**
 * Check if any rules files exist in the project
 */
export function hasTestingRules(projectRoot: string = process.cwd()): boolean {
  for (const location of RULE_LOCATIONS) {
    const fullPath = path.join(projectRoot, location.path);
    if (fs.existsSync(fullPath)) {
      return true;
    }
  }
  return false;
}

/**
 * Get list of found rule files
 */
export function getFoundRuleFiles(projectRoot: string = process.cwd()): string[] {
  const found: string[] = [];

  for (const location of RULE_LOCATIONS) {
    const fullPath = path.join(projectRoot, location.path);
    if (fs.existsSync(fullPath)) {
      found.push(location.path);
    }
  }

  return found;
}
```

- **VALIDATE**: `npm run build`

---

### Task 6: CREATE src/utils/testGenerator.ts

- **IMPLEMENT**: AI-powered test generation utility
- **PATTERN**: Follow QAPlan.tsx lines 108-181 for AI integration
- **IMPORTS**: chatWithCopilot from copilot.ts, types

**Create the file with:**

```typescript
import { chatWithCopilot, type ChatMessage } from './copilot.js';
import { loadTestingRules, formatRulesForPrompt } from './rulesLoader.js';
import { readSourceFile, readTestFile, testFileExists } from './fileWatcher.js';
import type { GeneratedTest, WatcherConfig } from '../types/index.js';

export interface TestGenerationResult {
  success: boolean;
  test?: GeneratedTest;
  error?: string;
}

/**
 * Generate or update tests for a source file
 */
export async function generateTestsForFile(
  sourceFilePath: string,
  testFilePath: string,
  token: string,
  model: string,
  projectRoot: string = process.cwd()
): Promise<TestGenerationResult> {
  // Read source file
  const sourceContent = readSourceFile(sourceFilePath);
  if (!sourceContent) {
    return { success: false, error: 'Could not read source file' };
  }

  // Load testing rules
  const rules = loadTestingRules(projectRoot);
  const rulesPrompt = formatRulesForPrompt(rules);

  // Check if test file exists
  const existingTests = testFileExists(testFilePath)
    ? readTestFile(testFilePath)
    : null;

  // Build the prompt
  const messages = buildTestGenerationPrompt(
    sourceFilePath,
    sourceContent,
    existingTests,
    rulesPrompt
  );

  // Call AI to generate tests
  const result = await chatWithCopilot(token, messages, model);

  if (!result.success || !result.content) {
    return { success: false, error: result.error || 'Failed to generate tests' };
  }

  // Extract code from response (handle markdown code blocks)
  const testContent = extractCodeFromResponse(result.content);

  return {
    success: true,
    test: {
      sourceFile: sourceFilePath,
      testFile: testFilePath,
      content: testContent,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Build the prompt messages for test generation
 */
function buildTestGenerationPrompt(
  sourceFilePath: string,
  sourceContent: string,
  existingTests: string | null,
  rulesPrompt: string
): ChatMessage[] {
  const fileName = sourceFilePath.split('/').pop() || 'file';
  const fileExtension = fileName.split('.').pop() || '';

  // Determine test framework hints based on file extension
  let frameworkHint = '';
  if (fileExtension === 'ts' || fileExtension === 'tsx') {
    frameworkHint = 'Use Jest or Vitest with TypeScript. Include proper type annotations.';
  } else if (fileExtension === 'js' || fileExtension === 'jsx') {
    frameworkHint = 'Use Jest or Vitest.';
  } else if (fileExtension === 'py') {
    frameworkHint = 'Use pytest with proper fixtures and assertions.';
  }

  let systemPrompt = `You are an expert test engineer. Generate comprehensive, well-structured tests for the provided source code.

Guidelines:
- Write clear, readable tests with descriptive names
- Cover edge cases and error scenarios
- Use appropriate mocking where needed
- Follow the Arrange-Act-Assert pattern
- ${frameworkHint}
- Output ONLY the test code, no explanations
- Include necessary imports at the top`;

  if (rulesPrompt) {
    systemPrompt += `\n\n${rulesPrompt}`;
  }

  let userPrompt = `Generate tests for the following file: ${fileName}\n\n`;
  userPrompt += '```\n' + sourceContent + '\n```\n\n';

  if (existingTests) {
    userPrompt += `Existing tests (update and add to these, do not remove working tests):\n\n`;
    userPrompt += '```\n' + existingTests + '\n```\n\n';
    userPrompt += 'Add any missing test cases and update existing ones if the source code has changed. Preserve tests that are still valid.';
  } else {
    userPrompt += 'Generate a complete test file covering all exported functions, classes, and significant logic.';
  }

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

/**
 * Extract code from AI response (handles markdown code blocks)
 */
function extractCodeFromResponse(response: string): string {
  // Check for markdown code block
  const codeBlockMatch = response.match(/```(?:typescript|javascript|python|ts|js|py)?\n([\s\S]*?)```/);

  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // If no code block, return as-is (already plain code)
  return response.trim();
}

/**
 * Infer test framework from existing project files
 */
export function inferTestFramework(projectRoot: string = process.cwd()): string {
  const fs = require('fs');
  const path = require('path');

  // Check package.json for test frameworks
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps['vitest']) return 'vitest';
      if (deps['jest']) return 'jest';
      if (deps['mocha']) return 'mocha';
    } catch {
      // Ignore parse errors
    }
  }

  // Check for pytest in Python projects
  const pyprojectPath = path.join(projectRoot, 'pyproject.toml');
  if (fs.existsSync(pyprojectPath)) {
    return 'pytest';
  }

  return 'unknown';
}
```

- **VALIDATE**: `npm run build`

---

### Task 7: CREATE src/screens/TestWatcher.tsx

- **IMPLEMENT**: Main UI screen for the test watcher feature
- **PATTERN**: Follow QAPlan.tsx for state machine, UI structure, and input handling
- **IMPORTS**: React, Ink components, contexts, utilities

**Create the file with:**

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useCopilot } from '../context/CopilotContext.js';
import {
  startWatcher,
  stopWatcher,
  isWatcherActive,
  getTestFilePath,
  writeTestFile,
  resolveGlobPattern,
} from '../utils/fileWatcher.js';
import { generateTestsForFile } from '../utils/testGenerator.js';
import { getFoundRuleFiles } from '../utils/rulesLoader.js';
import type { FileChangeEvent, WatcherConfig, GeneratedTest } from '../types/index.js';

const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
  red: '#FF4444',
  dim: '#666666',
};

type WatcherState =
  | 'idle'
  | 'input-pattern'
  | 'select-output'
  | 'starting'
  | 'watching'
  | 'generating'
  | 'error';

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const LoadingSpinner: React.FC<{ text: string; subtext?: string }> = ({ text, subtext }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % spinnerFrames.length);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box flexDirection="column">
      <Text color={palette.yellow}>
        {spinnerFrames[frame]} {text}
      </Text>
      {subtext && (
        <Box marginTop={1}>
          <Text color={palette.dim}>{subtext}</Text>
        </Box>
      )}
    </Box>
  );
};

interface TestWatcherProps {
  onBack: () => void;
}

export const TestWatcher: React.FC<TestWatcherProps> = ({ onBack }) => {
  const { authState, getToken } = useCopilot();
  const [state, setState] = useState<WatcherState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Configuration
  const [globPattern, setGlobPattern] = useState('src/**/*.ts');
  const [outputIndex, setOutputIndex] = useState(0);
  const [config, setConfig] = useState<WatcherConfig | null>(null);

  // Watching state
  const [watchedCount, setWatchedCount] = useState(0);
  const [recentEvents, setRecentEvents] = useState<FileChangeEvent[]>([]);
  const [lastGenerated, setLastGenerated] = useState<GeneratedTest | null>(null);
  const [generatingFile, setGeneratingFile] = useState<string | null>(null);
  const [rulesFound, setRulesFound] = useState<string[]>([]);

  // Load rules info on mount
  useEffect(() => {
    setRulesFound(getFoundRuleFiles());
  }, []);

  // Cleanup watcher on unmount
  useEffect(() => {
    return () => {
      stopWatcher();
    };
  }, []);

  const outputOptions = [
    { label: 'Co-located', value: 'colocated' as const, desc: 'src/file.ts → src/file.test.ts' },
    { label: 'Separate directory', value: 'separate' as const, desc: 'src/file.ts → tests/file.test.ts' },
  ];

  const handleFileChange = useCallback(async (event: FileChangeEvent) => {
    // Skip if already generating or if it's a delete event
    if (state === 'generating' || event.type === 'unlink' || !config) return;

    // Add to recent events
    setRecentEvents((prev) => [event, ...prev].slice(0, 5));

    // Generate tests for the changed file
    const token = getToken();
    if (!token) return;

    setGeneratingFile(event.path);
    setState('generating');

    const testPath = getTestFilePath(event.path, config);
    const result = await generateTestsForFile(
      event.path,
      testPath,
      token,
      authState.selectedModel
    );

    if (result.success && result.test) {
      // Write the test file
      const written = writeTestFile(testPath, result.test.content);
      if (written) {
        setLastGenerated(result.test);
      } else {
        setError(`Failed to write test file: ${testPath}`);
      }
    } else {
      setError(result.error || 'Failed to generate tests');
    }

    setGeneratingFile(null);
    setState('watching');
  }, [state, config, getToken, authState.selectedModel]);

  const startWatching = useCallback(async () => {
    if (!config) return;

    setState('starting');

    // Verify pattern matches files
    const files = await resolveGlobPattern(config.globPattern);
    if (files.length === 0) {
      setError('No files match the specified pattern');
      setState('error');
      return;
    }

    startWatcher(
      config,
      process.cwd(),
      handleFileChange,
      (count) => {
        setWatchedCount(count);
        setState('watching');
      },
      (err) => {
        setError(err);
        setState('error');
      }
    );
  }, [config, handleFileChange]);

  useInput((input, key) => {
    // Handle back/escape navigation
    if (key.escape || input === 'b') {
      if (state === 'watching' || state === 'generating') {
        stopWatcher();
        setState('idle');
        return;
      }
      if (state === 'input-pattern') {
        setState('idle');
        return;
      }
      if (state === 'select-output') {
        setState('input-pattern');
        return;
      }
      if (state === 'error') {
        setState('idle');
        setError(null);
        return;
      }
      onBack();
      return;
    }

    // Idle state - press 'w' to start
    if (state === 'idle' && input === 'w' && authState.isConnected) {
      setState('input-pattern');
      return;
    }

    // Output selection
    if (state === 'select-output') {
      if (key.upArrow) {
        setOutputIndex((prev) => (prev > 0 ? prev - 1 : 1));
      } else if (key.downArrow) {
        setOutputIndex((prev) => (prev < 1 ? prev + 1 : 0));
      } else if (key.return) {
        const selectedOutput = outputOptions[outputIndex];
        const newConfig: WatcherConfig = {
          globPattern,
          outputPattern: selectedOutput.value,
          outputDir: selectedOutput.value === 'separate' ? 'tests' : undefined,
          testSuffix: '.test.ts',
        };
        setConfig(newConfig);
        startWatching();
      }
      return;
    }

    // Stop watching with 's'
    if ((state === 'watching' || state === 'generating') && input === 's') {
      stopWatcher();
      setState('idle');
      return;
    }
  });

  const handlePatternSubmit = (value: string) => {
    if (value.trim()) {
      setGlobPattern(value.trim());
      setState('select-output');
    }
  };

  const renderContent = () => {
    switch (state) {
      case 'idle':
        return (
          <Box flexDirection="column">
            <Text color={palette.cyan} bold>
              Test Watcher
            </Text>

            <Box marginTop={1} flexDirection="column">
              <Text>Automatically generate tests when source files change.</Text>

              <Box marginTop={1} flexDirection="column" marginLeft={2}>
                <Text color={palette.green}>- Watch files matching a glob pattern</Text>
                <Text color={palette.green}>- Generate tests using AI ({authState.selectedModel})</Text>
                <Text color={palette.green}>- Follow project testing rules</Text>
              </Box>

              {rulesFound.length > 0 && (
                <Box marginTop={1}>
                  <Text color={palette.dim}>
                    Found rules: {rulesFound.join(', ')}
                  </Text>
                </Box>
              )}
            </Box>

            {authState.isConnected ? (
              <Box marginTop={2}>
                <Text color={palette.yellow}>Press 'w' to start watching</Text>
              </Box>
            ) : (
              <Box marginTop={2} flexDirection="column">
                <Text color={palette.red}>Not connected to Copilot</Text>
                <Text color={palette.dim}>Please connect to Copilot first from the main menu</Text>
              </Box>
            )}
          </Box>
        );

      case 'input-pattern':
        return (
          <Box flexDirection="column">
            <Text color={palette.cyan} bold>
              Enter Glob Pattern
            </Text>
            <Text color={palette.dim}>
              Specify which files to watch (e.g., src/**/*.ts)
            </Text>

            <Box marginTop={1}>
              <Text color={palette.yellow}>Pattern: </Text>
              <TextInput
                value={globPattern}
                onChange={setGlobPattern}
                onSubmit={handlePatternSubmit}
              />
            </Box>

            <Box marginTop={2}>
              <Text color={palette.dim}>Enter to confirm  Esc to go back</Text>
            </Box>
          </Box>
        );

      case 'select-output':
        return (
          <Box flexDirection="column">
            <Text color={palette.cyan} bold>
              Select Test Output Location
            </Text>
            <Text color={palette.dim}>
              Pattern: {globPattern}
            </Text>

            <Box flexDirection="column" marginTop={1}>
              {outputOptions.map((opt, index) => (
                <Box key={opt.value} flexDirection="column">
                  <Box>
                    <Text color={index === outputIndex ? palette.cyan : undefined}>
                      {index === outputIndex ? '> ' : '  '}
                      {opt.label}
                    </Text>
                  </Box>
                  <Box marginLeft={4}>
                    <Text color={palette.dim}>{opt.desc}</Text>
                  </Box>
                </Box>
              ))}
            </Box>

            <Box marginTop={2}>
              <Text color={palette.dim}>Up/Down to select  Enter to confirm  Esc to go back</Text>
            </Box>
          </Box>
        );

      case 'starting':
        return <LoadingSpinner text="Starting watcher..." subtext={`Pattern: ${globPattern}`} />;

      case 'watching':
      case 'generating':
        return (
          <Box flexDirection="column">
            <Box>
              <Text color={palette.green} bold>
                {state === 'generating' ? '⚡ ' : '👀 '}
                Watching {watchedCount} files
              </Text>
            </Box>
            <Text color={palette.dim}>Pattern: {globPattern}</Text>

            {state === 'generating' && generatingFile && (
              <Box marginTop={1}>
                <LoadingSpinner
                  text="Generating tests..."
                  subtext={generatingFile.split('/').pop()}
                />
              </Box>
            )}

            {lastGenerated && (
              <Box marginTop={1} flexDirection="column">
                <Text color={palette.green}>Last generated:</Text>
                <Text color={palette.dim}>
                  {lastGenerated.sourceFile.split('/').pop()} → {lastGenerated.testFile.split('/').pop()}
                </Text>
              </Box>
            )}

            {recentEvents.length > 0 && (
              <Box marginTop={1} flexDirection="column">
                <Text color={palette.yellow}>Recent changes:</Text>
                {recentEvents.slice(0, 3).map((evt, i) => (
                  <Text key={i} color={palette.dim}>
                    [{evt.type}] {evt.path.split('/').pop()}
                  </Text>
                ))}
              </Box>
            )}

            <Box marginTop={2}>
              <Text color={palette.yellow}>Press 's' to stop  Esc to go back</Text>
            </Box>
          </Box>
        );

      case 'error':
        return (
          <Box flexDirection="column">
            <Text color={palette.red} bold>
              Error
            </Text>
            <Box marginTop={1}>
              <Text color={palette.red}>{error}</Text>
            </Box>
            <Box marginTop={2}>
              <Text color={palette.yellow}>Press Esc to go back</Text>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={palette.orange}>
        {'+-[ Test Watcher ]' + '-'.repeat(44) + '+'}
      </Text>

      <Box flexDirection="column" paddingLeft={2} paddingY={1}>
        {renderContent()}
      </Box>

      <Text color={palette.orange}>{'+-' + '-'.repeat(60) + '+'}</Text>

      <Box marginTop={1} marginLeft={2}>
        <Text color={palette.dim}>Esc/b Go back</Text>
      </Box>
    </Box>
  );
};
```

- **VALIDATE**: `npm run build`

---

### Task 8: UPDATE src/components/Menu.tsx - Add menu item

- **IMPLEMENT**: Add new menu item for Test Watcher in the 'agents' category
- **PATTERN**: Follow existing menu item structure (lines 40-45)
- **GOTCHA**: Insert after 'Create a QA Plan' item, before the tools section

**Add after line 45 (after QA Plan item):**

```typescript
  {
    label: 'Test Watcher',
    value: 'test-watcher',
    description: 'Auto-generate tests on file changes',
    category: 'agents',
  },
```

- **VALIDATE**: `npm run build`

---

### Task 9: UPDATE src/index.tsx - Add screen import and case

- **IMPLEMENT**: Import TestWatcher component and add case to renderScreen
- **PATTERN**: Follow existing import and case patterns

**Add import after line 10:**
```typescript
import {TestWatcher} from './screens/TestWatcher.js';
```

**Add case in renderScreen() after 'model-select' case (after line 44):**
```typescript
      case 'test-watcher':
        return <TestWatcher onBack={handleBack} />;
```

- **VALIDATE**: `npm run build`

---

### Task 10: VALIDATE full build and type checking

- **IMPLEMENT**: Run full build to ensure all types are correct
- **VALIDATE**: `npm run build && echo "Build successful!"`

---

## TESTING STRATEGY

### Manual Testing

Since the project has no test framework, validation will be manual:

1. **Start the application**: `npm start`
2. **Navigate to Test Watcher**: Select from menu
3. **Configure watcher**:
   - Enter glob pattern (e.g., `src/**/*.ts`)
   - Select output location
4. **Trigger file change**: Modify a source file
5. **Verify test generation**: Check if test file is created/updated
6. **Test rules loading**: Create `.meeseeks/rules/test.md` and verify it's used

### Edge Cases to Test

- Invalid glob pattern (should show error)
- No files matching pattern (should show error)
- Not connected to Copilot (should show disabled state)
- File deleted while watching (should handle gracefully)
- Rapid successive changes (should debounce)

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npm run build
```

### Level 2: Application Start

```bash
npm start
# Verify app starts without errors
# Navigate to Test Watcher screen
```

### Level 3: Feature Verification

```bash
# Create a test source file
mkdir -p test-project/src
echo "export function add(a: number, b: number) { return a + b; }" > test-project/src/math.ts

# Start meeseeks in test-project directory
cd test-project && npm start
# 1. Connect to Copilot
# 2. Select Test Watcher
# 3. Enter pattern: src/**/*.ts
# 4. Select co-located output
# 5. Modify math.ts
# 6. Verify math.test.ts is generated
```

### Level 4: Rules Loading

```bash
# Create rules file
mkdir -p test-project/.meeseeks/rules
echo "# Testing Rules\n\n- Use describe/it blocks\n- Include edge cases" > test-project/.meeseeks/rules/test.md

# Repeat test and verify rules are mentioned in generated tests
```

---

## ACCEPTANCE CRITERIA

- [x] Feature implements file watching with glob patterns
- [x] Tests are generated using selected AI model
- [x] Rules from .meeseeks/rules/test.md are loaded and used
- [x] Rules from AGENTS.md are loaded and used (test-related sections)
- [x] Rules from CLAUDE.md are loaded and used (test-related sections)
- [x] Tests can be written co-located or in separate directory
- [x] UI shows real-time file change events
- [x] UI shows generation progress
- [x] Error states are handled gracefully
- [x] Build passes with zero errors
- [x] No regressions in existing functionality

---

## COMPLETION CHECKLIST

- [ ] All dependencies installed (chokidar, fast-glob)
- [ ] All types added to types/index.ts
- [ ] Screen type updated
- [ ] fileWatcher.ts created and working
- [ ] rulesLoader.ts created and working
- [ ] testGenerator.ts created and working
- [ ] TestWatcher.tsx screen created
- [ ] Menu item added
- [ ] Screen case added to index.tsx
- [ ] Full build passes
- [ ] Manual testing confirms feature works
- [ ] Rules loading verified

---

## NOTES

### Design Decisions

1. **Chokidar v4+**: Chosen for TypeScript-native support and minimal dependencies. The v4+ API is slightly different from v3 (no glob support built-in, hence fast-glob).

2. **fast-glob**: Chosen over `glob` for better performance and TypeScript support. Used to resolve patterns before passing to chokidar.

3. **Rules Priority**: `.meeseeks/rules/test.md` takes priority because it's the most specific. AGENTS.md and CLAUDE.md are searched for test-related sections.

4. **Test File Naming**: Uses `.test.ts` suffix by default, matching common conventions. Could be made configurable in future.

5. **Debouncing**: Uses chokidar's `awaitWriteFinish` option to debounce rapid changes.

### Known Limitations

1. **No Test Framework Detection**: Currently doesn't auto-detect the test framework; relies on AI to infer from file extension.

2. **Single File Generation**: Generates tests one file at a time. Batch processing could be added later.

3. **No Diff-Based Updates**: When updating existing tests, the entire test file is regenerated. A more sophisticated approach could diff and merge.

### Future Enhancements

1. Add test framework selection in configuration
2. Add batch processing mode for multiple file changes
3. Add diff-based test updates to preserve manual modifications
4. Add test execution and coverage reporting
5. Add support for custom test templates

### Research Sources

- [Chokidar GitHub](https://github.com/paulmillr/chokidar) - File watching library
- [fast-glob GitHub](https://github.com/mrmlnc/fast-glob) - Glob pattern matching
- [AI Test Generation Best Practices](https://www.frugaltesting.com/blog/ai-powered-test-automation-best-practices-and-tools-you-need-to-know)

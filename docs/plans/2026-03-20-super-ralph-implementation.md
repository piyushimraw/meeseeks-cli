# Super Ralph Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Super Ralph" feature to Meeseeks CLI that orchestrates autonomous feature development through brainstorm, plan, and ralph loop execution stages, shelling out to Claude Code (`claude -p`).

**Architecture:** Meeseeks owns the interactive brainstorming UI (Ink), generates structured JSON artifacts, and spawns `claude -p` as a child process for plan generation and ralph loop execution. Session state lives in `.super-ralph/`, task artifacts in `tasks/`, plans in `docs/plans/`.

**Tech Stack:** TypeScript, React 18 + Ink 5, Node.js child_process.spawn, vitest

---

## Task 1: Add Super Ralph Types

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/types/superRalph.ts`
- Create: `src/types/superRalph.test.ts`

**Step 1: Write the type definition file**

Create `src/types/superRalph.ts` with all Super Ralph types:

```typescript
// === Session Types ===

export type SuperRalphSessionStatus =
  | 'created'
  | 'scoping'
  | 'brainstorming'
  | 'planning'
  | 'executing'
  | 'paused'
  | 'completed';

export type PhaseStatus = 'pending' | 'brainstorming' | 'planning' | 'executing' | 'completed' | 'failed';

export interface SuperRalphPhase {
  id: number;
  title: string;
  status: PhaseStatus;
}

export interface SuperRalphSession {
  id: string;
  task: string;
  status: SuperRalphSessionStatus;
  currentPhase: number;
  phases: SuperRalphPhase[];
  aiTool: 'claude-code';
  createdAt: string;
  updatedAt: string;
}

// === Brainstorm Types ===

export interface BrainstormQuestion {
  id: string;
  question: string;
  type: 'template' | 'llm-generated';
  answer?: string;
  skipped?: boolean;
}

export interface BrainstormOutput {
  phase: number;
  title: string;
  decisions: string[];
  constraints: string[];
  acceptanceCriteria: string[];
  dependencies: string[];
  contextSources: string[];
}

// === Plan Types ===

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

export interface SuperRalphTask {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  dependencies: string[];
  passes: boolean;
}

export interface SuperRalphPlan {
  phase: number;
  title: string;
  tasks: SuperRalphTask[];
  feedbackLoops: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

// === Execution Types ===

export interface ExecutionProgress {
  phase: number;
  iteration: number;
  maxIterations: number;
  tasksCompleted: string[];
  tasksRemaining: string[];
  currentTask: string | null;
  failures: ExecutionFailure[];
  filesChanged: string[];
}

export interface ExecutionFailure {
  taskId: string;
  iteration: number;
  error: string;
  timestamp: string;
}

// === Learnings Types ===

export interface PhaseLearnings {
  phase: number;
  title: string;
  patternsDiscovered: string[];
  mistakesAvoided: string[];
  conventionsEstablished: string[];
}

// === Config Types ===

export interface SuperRalphConfig {
  maxIterationsPerPhase: number;
  maxConsecutiveFailures: number;
  notifications: boolean;
}

export const DEFAULT_SUPER_RALPH_CONFIG: SuperRalphConfig = {
  maxIterationsPerPhase: 10,
  maxConsecutiveFailures: 2,
  notifications: true,
};

// === Scope Assessment Types ===

export interface ScopeAssessment {
  isMultiPhase: boolean;
  reasoning: string;
  proposedPhases: { title: string; description: string }[];
}

// === Context Gathering Types ===

export interface GatheredContext {
  codebaseStructure: string;
  gitHistory: string;
  projectDocs: string;
  figmaContext?: string;
  externalDocs?: string;
}

// === Claude CLI Types ===

export interface ClaudeCliResult {
  success: boolean;
  output: string;
  exitCode: number;
  error?: string;
}
```

**Step 2: Write the test file to validate type exports**

Create `src/types/superRalph.test.ts`:

```typescript
import {describe, it, expect} from 'vitest';
import {
  DEFAULT_SUPER_RALPH_CONFIG,
  type SuperRalphSession,
  type BrainstormOutput,
  type SuperRalphPlan,
  type ExecutionProgress,
  type PhaseLearnings,
  type ScopeAssessment,
  type GatheredContext,
  type ClaudeCliResult,
} from './superRalph.js';

describe('Super Ralph Types', () => {
  it('should export DEFAULT_SUPER_RALPH_CONFIG with correct defaults', () => {
    expect(DEFAULT_SUPER_RALPH_CONFIG).toEqual({
      maxIterationsPerPhase: 10,
      maxConsecutiveFailures: 2,
      notifications: true,
    });
  });

  it('should allow creating a valid session object', () => {
    const session: SuperRalphSession = {
      id: 'test-session',
      task: 'Build a dashboard',
      status: 'created',
      currentPhase: 0,
      phases: [],
      aiTool: 'claude-code',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(session.status).toBe('created');
    expect(session.aiTool).toBe('claude-code');
  });

  it('should allow creating a valid brainstorm output', () => {
    const output: BrainstormOutput = {
      phase: 1,
      title: 'Layout',
      decisions: ['Use CSS Grid'],
      constraints: ['Must be responsive'],
      acceptanceCriteria: ['Renders at 768px'],
      dependencies: [],
      contextSources: ['src/components/Layout.tsx'],
    };
    expect(output.phase).toBe(1);
  });

  it('should allow creating a valid plan', () => {
    const plan: SuperRalphPlan = {
      phase: 1,
      title: 'Layout',
      tasks: [{
        id: 'task-001',
        title: 'Create layout',
        description: 'Build responsive layout',
        acceptanceCriteria: ['Renders correctly'],
        dependencies: [],
        passes: false,
      }],
      feedbackLoops: ['typecheck', 'test'],
      riskLevel: 'low',
    };
    expect(plan.tasks).toHaveLength(1);
    expect(plan.tasks[0].passes).toBe(false);
  });

  it('should allow creating a valid execution progress', () => {
    const progress: ExecutionProgress = {
      phase: 1,
      iteration: 3,
      maxIterations: 10,
      tasksCompleted: ['task-001'],
      tasksRemaining: ['task-002'],
      currentTask: 'task-002',
      failures: [],
      filesChanged: ['src/Layout.tsx'],
    };
    expect(progress.iteration).toBe(3);
  });

  it('should allow creating valid phase learnings', () => {
    const learnings: PhaseLearnings = {
      phase: 1,
      title: 'Layout',
      patternsDiscovered: ['CSS Grid works well'],
      mistakesAvoided: ['Avoided Flexbox for 2D'],
      conventionsEstablished: ['Use --sr-* prefix'],
    };
    expect(learnings.patternsDiscovered).toHaveLength(1);
  });
});
```

**Step 3: Run the test to verify it passes**

Run: `npx vitest run src/types/superRalph.test.ts`
Expected: PASS

**Step 4: Add Screen type for super-ralph**

In `src/types/index.ts`, add `'super-ralph'` to the Screen union:

```typescript
export type Screen = 'main' | 'copilot-connect' | 'qa-plan' | 'git-changes' | 'knowledge-base' | 'model-select' | 'test-watcher' | 'settings' | 'sprint' | 'workflow' | 'plan-generator' | 'meta-init' | 'super-ralph';
```

**Step 5: Commit**

```bash
git add src/types/superRalph.ts src/types/superRalph.test.ts src/types/index.ts
git commit -m "feat: add Super Ralph type definitions"
```

---

## Task 2: Claude CLI Utility

Shell out to `claude -p` via child_process.spawn. This is the execution engine for plan generation and ralph loop iterations.

**Files:**
- Create: `src/utils/claudeCli.ts`
- Create: `src/utils/claudeCli.test.ts`

**Step 1: Write the failing test**

Create `src/utils/claudeCli.test.ts`:

```typescript
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {buildClaudeArgs, parseClaudeOutput, isClaudeInstalled} from './claudeCli.js';

describe('claudeCli', () => {
  describe('buildClaudeArgs', () => {
    it('should build args for print mode with prompt', () => {
      const args = buildClaudeArgs({prompt: 'Hello world'});
      expect(args).toEqual(['-p', 'Hello world', '--permission-mode', 'acceptEdits']);
    });

    it('should include --output-format json when requested', () => {
      const args = buildClaudeArgs({prompt: 'Hello', outputJson: true});
      expect(args).toContain('--output-format');
      expect(args).toContain('json');
    });

    it('should include --max-turns when specified', () => {
      const args = buildClaudeArgs({prompt: 'Hello', maxTurns: 5});
      expect(args).toContain('--max-turns');
      expect(args).toContain('5');
    });
  });

  describe('parseClaudeOutput', () => {
    it('should parse successful output', () => {
      const result = parseClaudeOutput(0, 'Some output text', '');
      expect(result).toEqual({
        success: true,
        output: 'Some output text',
        exitCode: 0,
      });
    });

    it('should parse failed output', () => {
      const result = parseClaudeOutput(1, '', 'Error occurred');
      expect(result).toEqual({
        success: false,
        output: '',
        exitCode: 1,
        error: 'Error occurred',
      });
    });

    it('should handle non-zero exit with stdout content', () => {
      const result = parseClaudeOutput(1, 'partial output', 'something went wrong');
      expect(result.success).toBe(false);
      expect(result.output).toBe('partial output');
      expect(result.error).toBe('something went wrong');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/claudeCli.test.ts`
Expected: FAIL — modules not found

**Step 3: Write minimal implementation**

Create `src/utils/claudeCli.ts`:

```typescript
import {spawn, spawnSync} from 'node:child_process';
import type {ClaudeCliResult} from '../types/superRalph.js';

export interface ClaudeCliOptions {
  prompt: string;
  outputJson?: boolean;
  maxTurns?: number;
  cwd?: string;
}

export function buildClaudeArgs(options: ClaudeCliOptions): string[] {
  const args = ['-p', options.prompt, '--permission-mode', 'acceptEdits'];

  if (options.outputJson) {
    args.push('--output-format', 'json');
  }

  if (options.maxTurns) {
    args.push('--max-turns', String(options.maxTurns));
  }

  return args;
}

export function parseClaudeOutput(exitCode: number, stdout: string, stderr: string): ClaudeCliResult {
  if (exitCode === 0) {
    return {
      success: true,
      output: stdout,
      exitCode,
    };
  }

  return {
    success: false,
    output: stdout,
    exitCode,
    error: stderr,
  };
}

export function isClaudeInstalled(): boolean {
  try {
    const result = spawnSync('claude', ['--version'], {
      encoding: 'utf-8',
      timeout: 5000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

export function runClaude(options: ClaudeCliOptions): Promise<ClaudeCliResult> {
  return new Promise((resolve) => {
    const args = buildClaudeArgs(options);
    const child = spawn('claude', args, {
      cwd: options.cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve(parseClaudeOutput(code ?? 1, stdout, stderr));
    });

    child.on('error', (err) => {
      resolve({
        success: false,
        output: '',
        exitCode: 1,
        error: `Failed to spawn claude: ${err.message}`,
      });
    });
  });
}
```

Note: Uses `spawn` (not `exec`) which is safe from shell injection — arguments are passed as an array, not interpolated into a shell string.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/claudeCli.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/claudeCli.ts src/utils/claudeCli.test.ts
git commit -m "feat: add Claude CLI utility for shelling out to claude -p"
```

---

## Task 3: Session Management

Manage `.super-ralph/` session state — create, load, update, list sessions.

**Files:**
- Create: `src/utils/superRalph/session.ts`
- Create: `src/utils/superRalph/session.test.ts`

**Step 1: Write the failing test**

Create `src/utils/superRalph/session.test.ts`:

```typescript
import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  createSession,
  loadSession,
  updateSession,
  generateSessionId,
  getSessionDir,
  getTasksDir,
} from './session.js';
import type {SuperRalphSession} from '../../types/superRalph.js';

describe('session', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  describe('generateSessionId', () => {
    it('should generate a slug from task description', () => {
      const id = generateSessionId('Build the analytics dashboard');
      expect(id).toMatch(/^build-the-analytics-dashboard-/);
    });

    it('should truncate long descriptions', () => {
      const id = generateSessionId('This is a very long task description that should be truncated to a reasonable length');
      expect(id.length).toBeLessThan(80);
    });

    it('should handle special characters', () => {
      const id = generateSessionId('Fix bug #123 (urgent!)');
      expect(id).not.toMatch(/[#()!]/);
    });
  });

  describe('getSessionDir', () => {
    it('should return correct path under .super-ralph/sessions/', () => {
      const dir = getSessionDir(tmpDir, 'my-session');
      expect(dir).toBe(path.join(tmpDir, '.super-ralph', 'sessions', 'my-session'));
    });
  });

  describe('getTasksDir', () => {
    it('should return correct path under tasks/', () => {
      const dir = getTasksDir(tmpDir, 'my-session');
      expect(dir).toBe(path.join(tmpDir, 'tasks', 'super-ralph-my-session'));
    });
  });

  describe('createSession', () => {
    it('should create session directories and write session.json', () => {
      const session = createSession(tmpDir, 'Build a dashboard');
      expect(session.task).toBe('Build a dashboard');
      expect(session.status).toBe('created');
      expect(session.phases).toEqual([]);
      expect(session.aiTool).toBe('claude-code');

      const sessionDir = getSessionDir(tmpDir, session.id);
      expect(fs.existsSync(path.join(sessionDir, 'session.json'))).toBe(true);

      const tasksDir = getTasksDir(tmpDir, session.id);
      expect(fs.existsSync(tasksDir)).toBe(true);
    });
  });

  describe('loadSession', () => {
    it('should load an existing session', () => {
      const created = createSession(tmpDir, 'Test task');
      const loaded = loadSession(tmpDir, created.id);
      expect(loaded).toEqual(created);
    });

    it('should return null for non-existent session', () => {
      const loaded = loadSession(tmpDir, 'nonexistent');
      expect(loaded).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('should update session fields and write to disk', () => {
      const session = createSession(tmpDir, 'Test task');
      const updated = updateSession(tmpDir, session.id, {
        status: 'brainstorming',
        currentPhase: 1,
        phases: [{id: 1, title: 'Phase 1', status: 'brainstorming'}],
      });

      expect(updated.status).toBe('brainstorming');
      expect(updated.currentPhase).toBe(1);
      expect(updated.phases).toHaveLength(1);

      // Verify persisted
      const loaded = loadSession(tmpDir, session.id);
      expect(loaded?.status).toBe('brainstorming');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/superRalph/session.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `src/utils/superRalph/session.ts`:

```typescript
import fs from 'node:fs';
import path from 'node:path';
import type {SuperRalphSession, SuperRalphPhase} from '../../types/superRalph.js';

export function generateSessionId(taskDescription: string): string {
  const slug = taskDescription
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
  const timestamp = Date.now().toString(36);
  return `${slug}-${timestamp}`;
}

export function getSessionDir(projectRoot: string, sessionId: string): string {
  return path.join(projectRoot, '.super-ralph', 'sessions', sessionId);
}

export function getTasksDir(projectRoot: string, sessionId: string): string {
  return path.join(projectRoot, 'tasks', `super-ralph-${sessionId}`);
}

export function createSession(projectRoot: string, task: string): SuperRalphSession {
  const id = generateSessionId(task);
  const now = new Date().toISOString();

  const session: SuperRalphSession = {
    id,
    task,
    status: 'created',
    currentPhase: 0,
    phases: [],
    aiTool: 'claude-code',
    createdAt: now,
    updatedAt: now,
  };

  const sessionDir = getSessionDir(projectRoot, id);
  const tasksDir = getTasksDir(projectRoot, id);
  const learningsDir = path.join(sessionDir, 'learnings');

  fs.mkdirSync(sessionDir, {recursive: true});
  fs.mkdirSync(tasksDir, {recursive: true});
  fs.mkdirSync(learningsDir, {recursive: true});
  fs.writeFileSync(
    path.join(sessionDir, 'session.json'),
    JSON.stringify(session, null, 2),
  );

  return session;
}

export function loadSession(projectRoot: string, sessionId: string): SuperRalphSession | null {
  const sessionFile = path.join(getSessionDir(projectRoot, sessionId), 'session.json');
  if (!fs.existsSync(sessionFile)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
}

export function updateSession(
  projectRoot: string,
  sessionId: string,
  updates: Partial<Pick<SuperRalphSession, 'status' | 'currentPhase' | 'phases'>>,
): SuperRalphSession {
  const session = loadSession(projectRoot, sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const updated: SuperRalphSession = {
    ...session,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(getSessionDir(projectRoot, sessionId), 'session.json'),
    JSON.stringify(updated, null, 2),
  );

  return updated;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/superRalph/session.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/superRalph/session.ts src/utils/superRalph/session.test.ts
git commit -m "feat: add Super Ralph session management"
```

---

## Task 4: Context Gathering Utility

Gather context from codebase, git, project docs, Figma, and external URLs.

**Files:**
- Create: `src/utils/superRalph/contextGatherer.ts`
- Create: `src/utils/superRalph/contextGatherer.test.ts`

**Step 1: Write the failing test**

Create `src/utils/superRalph/contextGatherer.test.ts`:

```typescript
import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  gatherCodebaseStructure,
  gatherProjectDocs,
  buildContextPrompt,
} from './contextGatherer.js';

describe('contextGatherer', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-ctx-'));
    // Create minimal project structure
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Test Project');
    fs.mkdirSync(path.join(tmpDir, 'src'), {recursive: true});
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.ts'), 'export const main = () => {};');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  describe('gatherCodebaseStructure', () => {
    it('should return a string describing the project structure', () => {
      const structure = gatherCodebaseStructure(tmpDir);
      expect(structure).toContain('src');
      expect(structure).toContain('README.md');
    });
  });

  describe('gatherProjectDocs', () => {
    it('should read README.md when present', () => {
      const docs = gatherProjectDocs(tmpDir);
      expect(docs).toContain('# Test Project');
    });

    it('should handle missing docs gracefully', () => {
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-empty-'));
      const docs = gatherProjectDocs(emptyDir);
      expect(docs).toBe('');
      fs.rmSync(emptyDir, {recursive: true, force: true});
    });

    it('should read CLAUDE.md when present', () => {
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Claude Instructions');
      const docs = gatherProjectDocs(tmpDir);
      expect(docs).toContain('# Claude Instructions');
    });
  });

  describe('buildContextPrompt', () => {
    it('should combine all context into a single prompt string', () => {
      const prompt = buildContextPrompt({
        codebaseStructure: 'src/\n  index.ts',
        gitHistory: 'abc123 Initial commit',
        projectDocs: '# README',
      });
      expect(prompt).toContain('## Codebase Structure');
      expect(prompt).toContain('src/');
      expect(prompt).toContain('## Git History');
      expect(prompt).toContain('## Project Documentation');
    });

    it('should include figma context when provided', () => {
      const prompt = buildContextPrompt({
        codebaseStructure: '',
        gitHistory: '',
        projectDocs: '',
        figmaContext: 'Figma design has 3 components',
      });
      expect(prompt).toContain('## Figma Design Context');
    });

    it('should omit figma section when not provided', () => {
      const prompt = buildContextPrompt({
        codebaseStructure: '',
        gitHistory: '',
        projectDocs: '',
      });
      expect(prompt).not.toContain('## Figma Design Context');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/superRalph/contextGatherer.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/utils/superRalph/contextGatherer.ts`:

```typescript
import fs from 'node:fs';
import path from 'node:path';
import type {GatheredContext} from '../../types/superRalph.js';

const DOC_FILES = ['README.md', 'CLAUDE.md', 'AGENTS.md'];

export function gatherCodebaseStructure(projectRoot: string, maxDepth: number = 3): string {
  const lines: string[] = [];

  function walk(dir: string, prefix: string, depth: number) {
    if (depth > maxDepth) return;
    const entries = fs.readdirSync(dir, {withFileTypes: true})
      .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'dist')
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

    for (const entry of entries) {
      lines.push(`${prefix}${entry.name}${entry.isDirectory() ? '/' : ''}`);
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), prefix + '  ', depth + 1);
      }
    }
  }

  walk(projectRoot, '', 0);
  return lines.join('\n');
}

export function gatherProjectDocs(projectRoot: string): string {
  const sections: string[] = [];

  for (const docFile of DOC_FILES) {
    const filePath = path.join(projectRoot, docFile);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      sections.push(`### ${docFile}\n\n${content}`);
    }
  }

  // Check for existing PRDs in tasks/
  const tasksDir = path.join(projectRoot, 'tasks');
  if (fs.existsSync(tasksDir)) {
    const prdFiles = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json') || f.endsWith('.md'));
    if (prdFiles.length > 0) {
      sections.push(`### Existing PRDs\n\nFound in tasks/: ${prdFiles.join(', ')}`);
    }
  }

  return sections.join('\n\n');
}

export function buildContextPrompt(context: GatheredContext): string {
  const sections: string[] = [];

  if (context.codebaseStructure) {
    sections.push(`## Codebase Structure\n\n\`\`\`\n${context.codebaseStructure}\n\`\`\``);
  }

  if (context.gitHistory) {
    sections.push(`## Git History\n\n${context.gitHistory}`);
  }

  if (context.projectDocs) {
    sections.push(`## Project Documentation\n\n${context.projectDocs}`);
  }

  if (context.figmaContext) {
    sections.push(`## Figma Design Context\n\n${context.figmaContext}`);
  }

  if (context.externalDocs) {
    sections.push(`## External Documentation\n\n${context.externalDocs}`);
  }

  return sections.join('\n\n---\n\n');
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/superRalph/contextGatherer.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/superRalph/contextGatherer.ts src/utils/superRalph/contextGatherer.test.ts
git commit -m "feat: add Super Ralph context gathering utility"
```

---

## Task 5: Brainstorming Engine

Template questions + LLM-generated follow-ups. Outputs structured JSON.

**Files:**
- Create: `src/utils/superRalph/brainstorm.ts`
- Create: `src/utils/superRalph/brainstorm.test.ts`

**Step 1: Write the failing test**

Create `src/utils/superRalph/brainstorm.test.ts`:

```typescript
import {describe, it, expect} from 'vitest';
import {
  getTemplateQuestions,
  buildScopeAssessmentPrompt,
  buildFollowUpPrompt,
  buildBrainstormOutput,
  parseScopeAssessment,
} from './brainstorm.js';
import type {BrainstormQuestion, BrainstormOutput, ScopeAssessment} from '../../types/superRalph.js';

describe('brainstorm', () => {
  describe('getTemplateQuestions', () => {
    it('should return 4 standard template questions', () => {
      const questions = getTemplateQuestions();
      expect(questions).toHaveLength(4);
      expect(questions.every(q => q.type === 'template')).toBe(true);
    });

    it('should include functional requirements question', () => {
      const questions = getTemplateQuestions();
      expect(questions[0].question).toContain('should this do');
    });

    it('should include constraints question', () => {
      const questions = getTemplateQuestions();
      expect(questions[1].question).toContain('constraint');
    });

    it('should include acceptance criteria question', () => {
      const questions = getTemplateQuestions();
      expect(questions[2].question).toContain('success');
    });

    it('should include dependencies question', () => {
      const questions = getTemplateQuestions();
      expect(questions[3].question).toContain('dependenc');
    });
  });

  describe('buildScopeAssessmentPrompt', () => {
    it('should include the task description', () => {
      const prompt = buildScopeAssessmentPrompt('Build a dashboard', 'context here');
      expect(prompt).toContain('Build a dashboard');
    });

    it('should include the context', () => {
      const prompt = buildScopeAssessmentPrompt('Build a dashboard', 'project uses React');
      expect(prompt).toContain('project uses React');
    });

    it('should ask for JSON response', () => {
      const prompt = buildScopeAssessmentPrompt('task', 'ctx');
      expect(prompt).toContain('JSON');
    });
  });

  describe('parseScopeAssessment', () => {
    it('should parse valid JSON from LLM output', () => {
      const llmOutput = '```json\n{"isMultiPhase":true,"reasoning":"Too big","proposedPhases":[{"title":"Phase 1","description":"Layout"}]}\n```';
      const result = parseScopeAssessment(llmOutput);
      expect(result.isMultiPhase).toBe(true);
      expect(result.proposedPhases).toHaveLength(1);
    });

    it('should handle raw JSON without code fences', () => {
      const llmOutput = '{"isMultiPhase":false,"reasoning":"Small task","proposedPhases":[{"title":"Single Phase","description":"Everything"}]}';
      const result = parseScopeAssessment(llmOutput);
      expect(result.isMultiPhase).toBe(false);
    });

    it('should throw on invalid JSON', () => {
      expect(() => parseScopeAssessment('not json at all')).toThrow();
    });
  });

  describe('buildFollowUpPrompt', () => {
    it('should include previous Q&A context', () => {
      const answered: BrainstormQuestion[] = [
        {id: 'q1', question: 'What should it do?', type: 'template', answer: 'Show charts'},
      ];
      const prompt = buildFollowUpPrompt('Build dashboard', answered);
      expect(prompt).toContain('What should it do?');
      expect(prompt).toContain('Show charts');
    });

    it('should ask for a single follow-up question', () => {
      const prompt = buildFollowUpPrompt('task', []);
      expect(prompt).toContain('one follow-up question');
    });
  });

  describe('buildBrainstormOutput', () => {
    it('should create structured output from answered questions', () => {
      const questions: BrainstormQuestion[] = [
        {id: 'q1', question: 'What should it do?', type: 'template', answer: 'Show user analytics'},
        {id: 'q2', question: 'Constraints?', type: 'template', answer: 'Must use React, responsive'},
        {id: 'q3', question: 'Success criteria?', type: 'template', answer: 'Charts render under 2s'},
        {id: 'q4', question: 'Dependencies?', type: 'template', answer: 'None'},
      ];

      const output = buildBrainstormOutput(1, 'Dashboard', questions, ['src/components/']);
      expect(output.phase).toBe(1);
      expect(output.title).toBe('Dashboard');
      expect(output.contextSources).toEqual(['src/components/']);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/superRalph/brainstorm.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/utils/superRalph/brainstorm.ts`:

```typescript
import type {BrainstormQuestion, BrainstormOutput, ScopeAssessment} from '../../types/superRalph.js';

export function getTemplateQuestions(): BrainstormQuestion[] {
  return [
    {
      id: 'template-1',
      question: 'What exactly should this do? Describe the functional requirements.',
      type: 'template',
    },
    {
      id: 'template-2',
      question: 'What are the constraints? (tech stack, performance, compatibility, etc.)',
      type: 'template',
    },
    {
      id: 'template-3',
      question: 'What does success look like? Define the acceptance criteria.',
      type: 'template',
    },
    {
      id: 'template-4',
      question: 'What are the dependencies? (other phases, external APIs, libraries, etc.)',
      type: 'template',
    },
  ];
}

export function buildScopeAssessmentPrompt(task: string, context: string): string {
  return `You are assessing the scope of a development task.

## Task
${task}

## Project Context
${context}

## Instructions

Analyze this task and determine whether it should be broken into multiple phases or handled as a single phase.

Consider:
- Number of distinct components or modules involved
- Whether there are clear sequential dependencies
- Overall complexity and risk

Respond with JSON in this exact format:

\`\`\`json
{
  "isMultiPhase": boolean,
  "reasoning": "Your explanation of why this is or isn't multi-phase",
  "proposedPhases": [
    { "title": "Phase title", "description": "Brief description of what this phase covers" }
  ]
}
\`\`\`

If single phase, still include one entry in proposedPhases. Be concise.`;
}

export function parseScopeAssessment(llmOutput: string): ScopeAssessment {
  // Extract JSON from potential markdown code fences
  const jsonMatch = llmOutput.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : llmOutput.trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      isMultiPhase: parsed.isMultiPhase,
      reasoning: parsed.reasoning,
      proposedPhases: parsed.proposedPhases,
    };
  } catch {
    throw new Error(`Failed to parse scope assessment: ${jsonStr.slice(0, 200)}`);
  }
}

export function buildFollowUpPrompt(task: string, answeredQuestions: BrainstormQuestion[]): string {
  const qaContext = answeredQuestions
    .filter(q => q.answer && !q.skipped)
    .map(q => `Q: ${q.question}\nA: ${q.answer}`)
    .join('\n\n');

  return `You are brainstorming a development task with a developer.

## Task
${task}

## Previous Q&A
${qaContext || '(No questions answered yet)'}

## Instructions

Based on the task and answers so far, generate one follow-up question that would help clarify the implementation. Focus on details that would be important for writing code.

If you believe enough detail has been gathered, respond with exactly: BRAINSTORM_COMPLETE

Otherwise, respond with just the question text (no numbering, no prefix).`;
}

export function buildBrainstormOutput(
  phase: number,
  title: string,
  questions: BrainstormQuestion[],
  contextSources: string[],
): BrainstormOutput {
  const answered = questions.filter(q => q.answer && !q.skipped);

  // Extract structured data from answers
  const decisions: string[] = [];
  const constraints: string[] = [];
  const acceptanceCriteria: string[] = [];
  const dependencies: string[] = [];

  for (const q of answered) {
    const answer = q.answer!;
    if (q.id === 'template-1' || q.type === 'llm-generated') {
      decisions.push(answer);
    }
    if (q.id === 'template-2') {
      constraints.push(answer);
    }
    if (q.id === 'template-3') {
      acceptanceCriteria.push(answer);
    }
    if (q.id === 'template-4') {
      dependencies.push(answer);
    }
  }

  return {
    phase,
    title,
    decisions,
    constraints,
    acceptanceCriteria,
    dependencies,
    contextSources,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/superRalph/brainstorm.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/superRalph/brainstorm.ts src/utils/superRalph/brainstorm.test.ts
git commit -m "feat: add Super Ralph brainstorming engine"
```

---

## Task 6: Plan Generation Utility

Generate ralph-loop-friendly plans from brainstorm output.

**Files:**
- Create: `src/utils/superRalph/planGenerator.ts`
- Create: `src/utils/superRalph/planGenerator.test.ts`

**Step 1: Write the failing test**

Create `src/utils/superRalph/planGenerator.test.ts`:

```typescript
import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  buildPlanGenerationPrompt,
  parsePlan,
  generatePromptFile,
  savePlan,
} from './planGenerator.js';
import type {BrainstormOutput, SuperRalphPlan, PhaseLearnings} from '../../types/superRalph.js';

describe('planGenerator', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-plan-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  const sampleBrainstorm: BrainstormOutput = {
    phase: 1,
    title: 'Layout Component',
    decisions: ['Use CSS Grid'],
    constraints: ['Must be responsive'],
    acceptanceCriteria: ['Renders at 768px breakpoint'],
    dependencies: [],
    contextSources: ['src/components/'],
  };

  describe('buildPlanGenerationPrompt', () => {
    it('should include brainstorm decisions', () => {
      const prompt = buildPlanGenerationPrompt(sampleBrainstorm, 'project context');
      expect(prompt).toContain('Use CSS Grid');
    });

    it('should include acceptance criteria', () => {
      const prompt = buildPlanGenerationPrompt(sampleBrainstorm, 'ctx');
      expect(prompt).toContain('Renders at 768px breakpoint');
    });

    it('should include learnings when provided', () => {
      const learnings: PhaseLearnings = {
        phase: 0,
        title: 'Setup',
        patternsDiscovered: ['Use Ink Box for layout'],
        mistakesAvoided: [],
        conventionsEstablished: [],
      };
      const prompt = buildPlanGenerationPrompt(sampleBrainstorm, 'ctx', learnings);
      expect(prompt).toContain('Use Ink Box for layout');
    });

    it('should request JSON response format', () => {
      const prompt = buildPlanGenerationPrompt(sampleBrainstorm, 'ctx');
      expect(prompt).toContain('JSON');
    });
  });

  describe('parsePlan', () => {
    it('should parse valid plan JSON from LLM output', () => {
      const llmOutput = '```json\n' + JSON.stringify({
        phase: 1,
        title: 'Layout',
        tasks: [{
          id: 'task-001',
          title: 'Create component',
          description: 'Build it',
          acceptanceCriteria: ['Works'],
          dependencies: [],
          passes: false,
        }],
        feedbackLoops: ['typecheck'],
        riskLevel: 'low',
      }) + '\n```';

      const plan = parsePlan(llmOutput);
      expect(plan.tasks).toHaveLength(1);
      expect(plan.tasks[0].passes).toBe(false);
    });

    it('should throw on invalid JSON', () => {
      expect(() => parsePlan('not json')).toThrow();
    });
  });

  describe('generatePromptFile', () => {
    it('should generate markdown prompt with task list', () => {
      const plan: SuperRalphPlan = {
        phase: 1,
        title: 'Layout',
        tasks: [
          {id: 'task-001', title: 'Create layout', description: 'Build grid layout', acceptanceCriteria: ['Renders'], dependencies: [], passes: false},
          {id: 'task-002', title: 'Add tokens', description: 'Design tokens', acceptanceCriteria: ['Matches Figma'], dependencies: ['task-001'], passes: false},
        ],
        feedbackLoops: ['typecheck', 'test'],
        riskLevel: 'low',
      };
      const brainstorm = sampleBrainstorm;

      const prompt = generatePromptFile(plan, brainstorm);
      expect(prompt).toContain('task-001');
      expect(prompt).toContain('task-002');
      expect(prompt).toContain('typecheck');
      expect(prompt).toContain('Use CSS Grid');
    });
  });

  describe('savePlan', () => {
    it('should write plan.json and prompt.md to tasks dir', () => {
      const plan: SuperRalphPlan = {
        phase: 1,
        title: 'Layout',
        tasks: [],
        feedbackLoops: [],
        riskLevel: 'low',
      };

      fs.mkdirSync(tmpDir, {recursive: true});
      savePlan(tmpDir, 1, plan, '# Prompt content');

      expect(fs.existsSync(path.join(tmpDir, 'phase-1-plan.json'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'phase-1-prompt.md'))).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/superRalph/planGenerator.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/utils/superRalph/planGenerator.ts`:

```typescript
import fs from 'node:fs';
import path from 'node:path';
import type {BrainstormOutput, SuperRalphPlan, PhaseLearnings} from '../../types/superRalph.js';

export function buildPlanGenerationPrompt(
  brainstorm: BrainstormOutput,
  projectContext: string,
  learnings?: PhaseLearnings,
): string {
  const learningsSection = learnings
    ? `\n## Learnings from Previous Phases\n\n### Patterns Discovered\n${learnings.patternsDiscovered.map(p => `- ${p}`).join('\n')}\n\n### Mistakes Avoided\n${learnings.mistakesAvoided.map(m => `- ${m}`).join('\n')}\n\n### Conventions Established\n${learnings.conventionsEstablished.map(c => `- ${c}`).join('\n')}`
    : '';

  return `You are creating an implementation plan for a development phase.

## Phase: ${brainstorm.title}

## Decisions Made
${brainstorm.decisions.map(d => `- ${d}`).join('\n')}

## Constraints
${brainstorm.constraints.map(c => `- ${c}`).join('\n')}

## Acceptance Criteria
${brainstorm.acceptanceCriteria.map(a => `- ${a}`).join('\n')}

## Dependencies
${brainstorm.dependencies.map(d => `- ${d}`).join('\n') || 'None'}
${learningsSection}

## Project Context
${projectContext}

## Instructions

Create an implementation plan as a list of tasks. Each task should be small enough to complete in one ralph loop iteration (10-15 minutes of AI work). Order tasks by dependencies.

Respond with JSON in this exact format:

\`\`\`json
{
  "phase": ${brainstorm.phase},
  "title": "${brainstorm.title}",
  "tasks": [
    {
      "id": "task-001",
      "title": "Short task title",
      "description": "What to implement",
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
      "dependencies": [],
      "passes": false
    }
  ],
  "feedbackLoops": ["typecheck", "lint", "test"],
  "riskLevel": "low|medium|high"
}
\`\`\`

Keep tasks focused. Each task should have clear acceptance criteria.`;
}

export function parsePlan(llmOutput: string): SuperRalphPlan {
  const jsonMatch = llmOutput.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : llmOutput.trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error(`Failed to parse plan: ${jsonStr.slice(0, 200)}`);
  }
}

export function generatePromptFile(plan: SuperRalphPlan, brainstorm: BrainstormOutput): string {
  const taskList = plan.tasks
    .map(t => {
      const status = t.passes ? '[x]' : '[ ]';
      const deps = t.dependencies.length > 0 ? ` (depends on: ${t.dependencies.join(', ')})` : '';
      const criteria = t.acceptanceCriteria.map(c => `    - ${c}`).join('\n');
      return `- ${status} **${t.id}: ${t.title}**${deps}\n  ${t.description}\n  Acceptance criteria:\n${criteria}`;
    })
    .join('\n\n');

  const decisionsSection = brainstorm.decisions.map(d => `- ${d}`).join('\n');
  const constraintsSection = brainstorm.constraints.map(c => `- ${c}`).join('\n');

  return `# Phase ${plan.phase}: ${plan.title}

## Instructions

You are an AI coding agent executing tasks from a plan. For each iteration:

1. Read the task list below and find the first unchecked task whose dependencies are all completed.
2. Implement the task following its description and acceptance criteria.
3. Run all feedback loops: ${plan.feedbackLoops.join(', ')}.
4. If all feedback loops pass, mark the task as done in the progress file.
5. Commit your changes with a descriptive message.
6. If a feedback loop fails, fix the issue before proceeding.

## Decisions & Constraints

### Decisions
${decisionsSection}

### Constraints
${constraintsSection}

## Task List

${taskList}

## Feedback Loops

Run these after each task: ${plan.feedbackLoops.join(', ')}

## Completion

When all tasks are checked, respond with: PHASE_COMPLETE
`;
}

export function savePlan(tasksDir: string, phase: number, plan: SuperRalphPlan, promptContent: string): void {
  fs.mkdirSync(tasksDir, {recursive: true});
  fs.writeFileSync(
    path.join(tasksDir, `phase-${phase}-plan.json`),
    JSON.stringify(plan, null, 2),
  );
  fs.writeFileSync(
    path.join(tasksDir, `phase-${phase}-prompt.md`),
    promptContent,
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/superRalph/planGenerator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/superRalph/planGenerator.ts src/utils/superRalph/planGenerator.test.ts
git commit -m "feat: add Super Ralph plan generation utility"
```

---

## Task 7: Ralph Loop Executor

The core loop that spawns `claude -p` iterations with fresh context.

**Files:**
- Create: `src/utils/superRalph/executor.ts`
- Create: `src/utils/superRalph/executor.test.ts`

**Step 1: Write the failing test**

Create `src/utils/superRalph/executor.test.ts`:

```typescript
import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  buildIterationPrompt,
  loadProgress,
  saveProgress,
  createInitialProgress,
  shouldPauseLoop,
  updateProgressFromOutput,
} from './executor.js';
import type {SuperRalphPlan, ExecutionProgress} from '../../types/superRalph.js';

describe('executor', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-exec-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  const samplePlan: SuperRalphPlan = {
    phase: 1,
    title: 'Layout',
    tasks: [
      {id: 'task-001', title: 'Create layout', description: 'Build grid', acceptanceCriteria: ['Works'], dependencies: [], passes: false},
      {id: 'task-002', title: 'Add tokens', description: 'Tokens', acceptanceCriteria: ['Matches'], dependencies: ['task-001'], passes: false},
    ],
    feedbackLoops: ['typecheck', 'test'],
    riskLevel: 'low',
  };

  describe('createInitialProgress', () => {
    it('should create progress with all tasks remaining', () => {
      const progress = createInitialProgress(samplePlan, 10);
      expect(progress.phase).toBe(1);
      expect(progress.iteration).toBe(0);
      expect(progress.maxIterations).toBe(10);
      expect(progress.tasksCompleted).toEqual([]);
      expect(progress.tasksRemaining).toEqual(['task-001', 'task-002']);
      expect(progress.currentTask).toBeNull();
      expect(progress.failures).toEqual([]);
    });
  });

  describe('saveProgress / loadProgress', () => {
    it('should round-trip progress to disk', () => {
      const progress = createInitialProgress(samplePlan, 10);
      saveProgress(tmpDir, 1, progress);

      const loaded = loadProgress(tmpDir, 1);
      expect(loaded).toEqual(progress);
    });

    it('should return null when no progress file exists', () => {
      const loaded = loadProgress(tmpDir, 99);
      expect(loaded).toBeNull();
    });
  });

  describe('buildIterationPrompt', () => {
    it('should include the phase prompt and progress', () => {
      const progress = createInitialProgress(samplePlan, 10);
      const phasePrompt = '# Phase 1: Layout\n\nDo stuff.';

      const prompt = buildIterationPrompt(phasePrompt, progress);
      expect(prompt).toContain('Phase 1: Layout');
      expect(prompt).toContain('Iteration: 1 of 10');
    });

    it('should include completed tasks in progress section', () => {
      const progress = createInitialProgress(samplePlan, 10);
      progress.tasksCompleted = ['task-001'];
      progress.tasksRemaining = ['task-002'];

      const prompt = buildIterationPrompt('prompt', progress);
      expect(prompt).toContain('task-001');
    });

    it('should include failure context for self-heal', () => {
      const progress = createInitialProgress(samplePlan, 10);
      progress.failures = [{
        taskId: 'task-001',
        iteration: 1,
        error: 'TypeError: undefined is not a function',
        timestamp: new Date().toISOString(),
      }];

      const prompt = buildIterationPrompt('prompt', progress);
      expect(prompt).toContain('TypeError');
    });
  });

  describe('shouldPauseLoop', () => {
    it('should return false when no failures', () => {
      const progress = createInitialProgress(samplePlan, 10);
      expect(shouldPauseLoop(progress, 2)).toBe(false);
    });

    it('should return false after first failure on a task', () => {
      const progress = createInitialProgress(samplePlan, 10);
      progress.failures = [{
        taskId: 'task-001', iteration: 1, error: 'fail', timestamp: '',
      }];
      expect(shouldPauseLoop(progress, 2)).toBe(false);
    });

    it('should return true when same task fails N times', () => {
      const progress = createInitialProgress(samplePlan, 10);
      progress.failures = [
        {taskId: 'task-001', iteration: 1, error: 'fail', timestamp: ''},
        {taskId: 'task-001', iteration: 2, error: 'fail again', timestamp: ''},
      ];
      expect(shouldPauseLoop(progress, 2)).toBe(true);
    });

    it('should return true when max iterations reached', () => {
      const progress = createInitialProgress(samplePlan, 3);
      progress.iteration = 3;
      expect(shouldPauseLoop(progress, 2)).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/superRalph/executor.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/utils/superRalph/executor.ts`:

```typescript
import fs from 'node:fs';
import path from 'node:path';
import type {SuperRalphPlan, ExecutionProgress, ExecutionFailure} from '../../types/superRalph.js';
import {runClaude} from '../claudeCli.js';

export function createInitialProgress(plan: SuperRalphPlan, maxIterations: number): ExecutionProgress {
  return {
    phase: plan.phase,
    iteration: 0,
    maxIterations,
    tasksCompleted: [],
    tasksRemaining: plan.tasks.map(t => t.id),
    currentTask: null,
    failures: [],
    filesChanged: [],
  };
}

export function saveProgress(tasksDir: string, phase: number, progress: ExecutionProgress): void {
  fs.mkdirSync(tasksDir, {recursive: true});
  fs.writeFileSync(
    path.join(tasksDir, `phase-${phase}-progress.json`),
    JSON.stringify(progress, null, 2),
  );
}

export function loadProgress(tasksDir: string, phase: number): ExecutionProgress | null {
  const filePath = path.join(tasksDir, `phase-${phase}-progress.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function buildIterationPrompt(phasePrompt: string, progress: ExecutionProgress): string {
  const sections: string[] = [];

  sections.push(phasePrompt);

  sections.push(`\n## Current Progress\n`);
  sections.push(`Iteration: ${progress.iteration + 1} of ${progress.maxIterations}`);

  if (progress.tasksCompleted.length > 0) {
    sections.push(`\nCompleted tasks: ${progress.tasksCompleted.join(', ')}`);
  }

  if (progress.tasksRemaining.length > 0) {
    sections.push(`Remaining tasks: ${progress.tasksRemaining.join(', ')}`);
  }

  // Include failure context for self-heal attempts
  if (progress.failures.length > 0) {
    const recentFailures = progress.failures.slice(-3);
    sections.push(`\n## Recent Failures (fix these)\n`);
    for (const f of recentFailures) {
      sections.push(`- Task ${f.taskId} (iteration ${f.iteration}): ${f.error}`);
    }
  }

  return sections.join('\n');
}

export function shouldPauseLoop(progress: ExecutionProgress, maxConsecutiveFailures: number): boolean {
  // Pause if max iterations reached
  if (progress.iteration >= progress.maxIterations) {
    return true;
  }

  // Pause if same task has failed N times
  const failureCounts = new Map<string, number>();
  for (const f of progress.failures) {
    failureCounts.set(f.taskId, (failureCounts.get(f.taskId) || 0) + 1);
  }

  for (const count of failureCounts.values()) {
    if (count >= maxConsecutiveFailures) {
      return true;
    }
  }

  return false;
}

export function updateProgressFromOutput(
  progress: ExecutionProgress,
  output: string,
  iteration: number,
): ExecutionProgress {
  const updated = {...progress, iteration};

  // Check if output indicates task completion
  // Look for markers like "TASK_COMPLETE: task-001"
  const completionMatch = output.match(/TASK_COMPLETE:\s*(task-\d+)/g);
  if (completionMatch) {
    for (const match of completionMatch) {
      const taskId = match.replace('TASK_COMPLETE:', '').trim();
      if (!updated.tasksCompleted.includes(taskId)) {
        updated.tasksCompleted = [...updated.tasksCompleted, taskId];
        updated.tasksRemaining = updated.tasksRemaining.filter(id => id !== taskId);
      }
    }
  }

  // Check for PHASE_COMPLETE marker
  if (output.includes('PHASE_COMPLETE')) {
    updated.tasksRemaining = [];
  }

  return updated;
}

export interface ExecutionCallbacks {
  onIterationStart?: (iteration: number) => void;
  onIterationComplete?: (iteration: number, output: string) => void;
  onTaskComplete?: (taskId: string) => void;
  onFailure?: (failure: ExecutionFailure) => void;
  onPause?: (reason: string) => void;
  onPhaseComplete?: () => void;
}

export async function executePhase(
  tasksDir: string,
  phase: number,
  phasePrompt: string,
  plan: SuperRalphPlan,
  maxIterations: number,
  maxConsecutiveFailures: number,
  cwd: string,
  callbacks?: ExecutionCallbacks,
): Promise<ExecutionProgress> {
  let progress = loadProgress(tasksDir, phase) || createInitialProgress(plan, maxIterations);

  while (progress.tasksRemaining.length > 0) {
    if (shouldPauseLoop(progress, maxConsecutiveFailures)) {
      const reason = progress.iteration >= maxIterations
        ? 'Max iterations reached'
        : 'Too many consecutive failures on the same task';
      callbacks?.onPause?.(reason);
      break;
    }

    const iteration = progress.iteration + 1;
    callbacks?.onIterationStart?.(iteration);

    const prompt = buildIterationPrompt(phasePrompt, progress);
    const result = await runClaude({prompt, cwd});

    if (result.success) {
      progress = updateProgressFromOutput(progress, result.output, iteration);
      callbacks?.onIterationComplete?.(iteration, result.output);
    } else {
      const failure: ExecutionFailure = {
        taskId: progress.tasksRemaining[0] || 'unknown',
        iteration,
        error: result.error || 'Unknown error',
        timestamp: new Date().toISOString(),
      };
      progress = {
        ...progress,
        iteration,
        failures: [...progress.failures, failure],
      };
      callbacks?.onFailure?.(failure);
    }

    saveProgress(tasksDir, phase, progress);

    if (progress.tasksRemaining.length === 0) {
      callbacks?.onPhaseComplete?.();
    }
  }

  return progress;
}
```

Note: Uses `spawn` (not `exec`) via the `claudeCli` utility — safe from shell injection.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/superRalph/executor.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/superRalph/executor.ts src/utils/superRalph/executor.test.ts
git commit -m "feat: add Super Ralph loop executor"
```

---

## Task 8: Notification Utility

macOS notifications for phase completion, failures, etc.

**Files:**
- Create: `src/utils/superRalph/notifications.ts`
- Create: `src/utils/superRalph/notifications.test.ts`

**Step 1: Write the failing test**

Create `src/utils/superRalph/notifications.test.ts`:

```typescript
import {describe, it, expect} from 'vitest';
import {buildNotificationArgs, formatNotification} from './notifications.js';

describe('notifications', () => {
  describe('formatNotification', () => {
    it('should format phase complete notification', () => {
      const msg = formatNotification('phase-complete', {phase: 1, title: 'Layout'});
      expect(msg.title).toBe('Super Ralph');
      expect(msg.body).toContain('Phase 1');
      expect(msg.body).toContain('Layout');
    });

    it('should format failure notification', () => {
      const msg = formatNotification('failure', {taskId: 'task-001', error: 'Test failed'});
      expect(msg.title).toBe('Super Ralph - Action Required');
      expect(msg.body).toContain('task-001');
    });

    it('should format session complete notification', () => {
      const msg = formatNotification('session-complete', {task: 'Build dashboard'});
      expect(msg.body).toContain('Build dashboard');
    });
  });

  describe('buildNotificationArgs', () => {
    it('should build osascript args array for macOS', () => {
      const args = buildNotificationArgs('Title', 'Body text');
      expect(args[0]).toBe('-e');
      expect(args[1]).toContain('Title');
      expect(args[1]).toContain('Body text');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/superRalph/notifications.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/utils/superRalph/notifications.ts`:

```typescript
import {execFile} from 'node:child_process';

interface NotificationMessage {
  title: string;
  body: string;
}

type NotificationType = 'phase-complete' | 'failure' | 'session-complete';

export function formatNotification(type: NotificationType, data: Record<string, unknown>): NotificationMessage {
  switch (type) {
    case 'phase-complete':
      return {
        title: 'Super Ralph',
        body: `Phase ${data.phase}: "${data.title}" completed successfully.`,
      };
    case 'failure':
      return {
        title: 'Super Ralph - Action Required',
        body: `Task ${data.taskId} failed: ${data.error}`,
      };
    case 'session-complete':
      return {
        title: 'Super Ralph',
        body: `All phases complete for: ${data.task}`,
      };
  }
}

export function buildNotificationArgs(title: string, body: string): string[] {
  const escapedTitle = title.replace(/"/g, '\\"');
  const escapedBody = body.replace(/"/g, '\\"');
  return ['-e', `display notification "${escapedBody}" with title "${escapedTitle}"`];
}

export function sendNotification(type: NotificationType, data: Record<string, unknown>): void {
  const {title, body} = formatNotification(type, data);
  const args = buildNotificationArgs(title, body);
  // Uses execFile (not exec) to avoid shell injection — args passed as array
  execFile('osascript', args, () => {
    // Fire and forget — notifications are best-effort
  });
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/superRalph/notifications.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/superRalph/notifications.ts src/utils/superRalph/notifications.test.ts
git commit -m "feat: add Super Ralph notification utility"
```

---

## Task 9: Super Ralph State Hook

Complex state management for the Super Ralph screen, extracted as a testable hook following the existing `usePlanWizardState` pattern.

**Files:**
- Create: `src/hooks/useSuperRalphState.ts`
- Create: `src/hooks/useSuperRalphState.test.ts`

**Step 1: Write the failing test**

Create `src/hooks/useSuperRalphState.test.ts`:

```typescript
import {describe, it, expect} from 'vitest';
import {
  createInitialState,
  transitionToScoping,
  transitionToBrainstorming,
  transitionToPlanning,
  transitionToExecuting,
  transitionToPaused,
  transitionToCompleted,
  addQuestionAnswer,
  confirmPhaseBreakdown,
  type SuperRalphScreenState,
} from './useSuperRalphState.js';

describe('useSuperRalphState', () => {
  describe('createInitialState', () => {
    it('should create state in idle step', () => {
      const state = createInitialState();
      expect(state.step).toBe('idle');
      expect(state.sessionId).toBeNull();
      expect(state.taskDescription).toBe('');
    });
  });

  describe('transitionToScoping', () => {
    it('should move to scoping with task description', () => {
      const state = createInitialState();
      const next = transitionToScoping(state, 'Build a dashboard');
      expect(next.step).toBe('scoping');
      expect(next.taskDescription).toBe('Build a dashboard');
    });
  });

  describe('transitionToBrainstorming', () => {
    it('should move to brainstorming with session id', () => {
      const state = {...createInitialState(), step: 'scoping' as const, taskDescription: 'task'};
      const next = transitionToBrainstorming(state, 'session-123');
      expect(next.step).toBe('brainstorming');
      expect(next.sessionId).toBe('session-123');
    });
  });

  describe('addQuestionAnswer', () => {
    it('should add answer to current question', () => {
      const state: SuperRalphScreenState = {
        ...createInitialState(),
        step: 'brainstorming',
        currentQuestionIndex: 0,
        questions: [{id: 'q1', question: 'What?', type: 'template'}],
      };
      const next = addQuestionAnswer(state, 'Build charts');
      expect(next.questions[0].answer).toBe('Build charts');
      expect(next.currentQuestionIndex).toBe(1);
    });
  });

  describe('confirmPhaseBreakdown', () => {
    it('should store confirmed phases', () => {
      const state: SuperRalphScreenState = {
        ...createInitialState(),
        step: 'scoping',
      };
      const phases = [
        {title: 'Layout', description: 'Build layout'},
        {title: 'Components', description: 'Build components'},
      ];
      const next = confirmPhaseBreakdown(state, phases);
      expect(next.confirmedPhases).toEqual(phases);
    });
  });

  describe('transitionToExecuting', () => {
    it('should set step to executing', () => {
      const state = {...createInitialState(), step: 'planning' as const};
      const next = transitionToExecuting(state);
      expect(next.step).toBe('executing');
    });
  });

  describe('transitionToPaused', () => {
    it('should set step to paused with reason', () => {
      const state = {...createInitialState(), step: 'executing' as const};
      const next = transitionToPaused(state, 'Task failed twice');
      expect(next.step).toBe('paused');
      expect(next.pauseReason).toBe('Task failed twice');
    });
  });

  describe('transitionToCompleted', () => {
    it('should set step to completed', () => {
      const state = {...createInitialState(), step: 'executing' as const};
      const next = transitionToCompleted(state);
      expect(next.step).toBe('completed');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useSuperRalphState.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/hooks/useSuperRalphState.ts`:

```typescript
import type {BrainstormQuestion, ScopeAssessment, ExecutionProgress} from '../types/superRalph.js';

export type SuperRalphStep =
  | 'idle'
  | 'scoping'
  | 'scope-confirm'
  | 'brainstorming'
  | 'planning'
  | 'executing'
  | 'paused'
  | 'completed'
  | 'error';

export interface SuperRalphScreenState {
  step: SuperRalphStep;
  taskDescription: string;
  sessionId: string | null;
  // Scoping
  scopeAssessment: ScopeAssessment | null;
  confirmedPhases: {title: string; description: string}[];
  // Brainstorming
  currentPhaseIndex: number;
  questions: BrainstormQuestion[];
  currentQuestionIndex: number;
  // Execution
  executionProgress: ExecutionProgress | null;
  // Errors and pauses
  error: string | null;
  pauseReason: string | null;
  // Loading
  isLoading: boolean;
  loadingMessage: string;
}

export function createInitialState(): SuperRalphScreenState {
  return {
    step: 'idle',
    taskDescription: '',
    sessionId: null,
    scopeAssessment: null,
    confirmedPhases: [],
    currentPhaseIndex: 0,
    questions: [],
    currentQuestionIndex: 0,
    executionProgress: null,
    error: null,
    pauseReason: null,
    isLoading: false,
    loadingMessage: '',
  };
}

export function transitionToScoping(state: SuperRalphScreenState, taskDescription: string): SuperRalphScreenState {
  return {
    ...state,
    step: 'scoping',
    taskDescription,
    isLoading: true,
    loadingMessage: 'Analyzing task scope...',
  };
}

export function transitionToBrainstorming(state: SuperRalphScreenState, sessionId: string): SuperRalphScreenState {
  return {
    ...state,
    step: 'brainstorming',
    sessionId,
    isLoading: false,
    loadingMessage: '',
  };
}

export function transitionToPlanning(state: SuperRalphScreenState): SuperRalphScreenState {
  return {
    ...state,
    step: 'planning',
    isLoading: true,
    loadingMessage: 'Generating implementation plan...',
  };
}

export function transitionToExecuting(state: SuperRalphScreenState): SuperRalphScreenState {
  return {
    ...state,
    step: 'executing',
    isLoading: false,
    loadingMessage: '',
  };
}

export function transitionToPaused(state: SuperRalphScreenState, reason: string): SuperRalphScreenState {
  return {
    ...state,
    step: 'paused',
    pauseReason: reason,
    isLoading: false,
  };
}

export function transitionToCompleted(state: SuperRalphScreenState): SuperRalphScreenState {
  return {
    ...state,
    step: 'completed',
    isLoading: false,
  };
}

export function addQuestionAnswer(state: SuperRalphScreenState, answer: string): SuperRalphScreenState {
  const updatedQuestions = [...state.questions];
  updatedQuestions[state.currentQuestionIndex] = {
    ...updatedQuestions[state.currentQuestionIndex],
    answer,
  };

  return {
    ...state,
    questions: updatedQuestions,
    currentQuestionIndex: state.currentQuestionIndex + 1,
  };
}

export function skipQuestion(state: SuperRalphScreenState): SuperRalphScreenState {
  const updatedQuestions = [...state.questions];
  updatedQuestions[state.currentQuestionIndex] = {
    ...updatedQuestions[state.currentQuestionIndex],
    skipped: true,
  };

  return {
    ...state,
    questions: updatedQuestions,
    currentQuestionIndex: state.currentQuestionIndex + 1,
  };
}

export function confirmPhaseBreakdown(
  state: SuperRalphScreenState,
  phases: {title: string; description: string}[],
): SuperRalphScreenState {
  return {
    ...state,
    confirmedPhases: phases,
  };
}

export function setError(state: SuperRalphScreenState, error: string): SuperRalphScreenState {
  return {
    ...state,
    step: 'error',
    error,
    isLoading: false,
  };
}

export function addLlmQuestion(state: SuperRalphScreenState, question: string): SuperRalphScreenState {
  return {
    ...state,
    questions: [
      ...state.questions,
      {
        id: `llm-${state.questions.length + 1}`,
        question,
        type: 'llm-generated',
      },
    ],
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useSuperRalphState.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useSuperRalphState.ts src/hooks/useSuperRalphState.test.ts
git commit -m "feat: add Super Ralph screen state hook"
```

---

## Task 10: Learnings Utility

Save and load per-phase learnings.

**Files:**
- Create: `src/utils/superRalph/learnings.ts`
- Create: `src/utils/superRalph/learnings.test.ts`

**Step 1: Write the failing test**

Create `src/utils/superRalph/learnings.test.ts`:

```typescript
import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {saveLearnings, loadLearnings, buildLearningsPrompt} from './learnings.js';
import type {PhaseLearnings} from '../../types/superRalph.js';

describe('learnings', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-learn-'));
    fs.mkdirSync(path.join(tmpDir, 'learnings'), {recursive: true});
  });

  afterEach(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  const sampleLearnings: PhaseLearnings = {
    phase: 1,
    title: 'Layout',
    patternsDiscovered: ['CSS Grid works well for 2D layouts'],
    mistakesAvoided: ['Tried Flexbox first, Grid was better'],
    conventionsEstablished: ['Use --sr-* prefix for design tokens'],
  };

  describe('saveLearnings', () => {
    it('should write learnings JSON to session dir', () => {
      saveLearnings(tmpDir, sampleLearnings);
      const filePath = path.join(tmpDir, 'learnings', 'phase-1-learnings.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(content.phase).toBe(1);
    });
  });

  describe('loadLearnings', () => {
    it('should load learnings for a phase', () => {
      saveLearnings(tmpDir, sampleLearnings);
      const loaded = loadLearnings(tmpDir, 1);
      expect(loaded).toEqual(sampleLearnings);
    });

    it('should return null for non-existent phase', () => {
      const loaded = loadLearnings(tmpDir, 99);
      expect(loaded).toBeNull();
    });
  });

  describe('buildLearningsPrompt', () => {
    it('should generate a prompt asking LLM to extract learnings', () => {
      const prompt = buildLearningsPrompt(1, 'Layout', 'iteration output logs here');
      expect(prompt).toContain('Phase 1');
      expect(prompt).toContain('Layout');
      expect(prompt).toContain('JSON');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/superRalph/learnings.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/utils/superRalph/learnings.ts`:

```typescript
import fs from 'node:fs';
import path from 'node:path';
import type {PhaseLearnings} from '../../types/superRalph.js';

export function saveLearnings(sessionDir: string, learnings: PhaseLearnings): void {
  const learningsDir = path.join(sessionDir, 'learnings');
  fs.mkdirSync(learningsDir, {recursive: true});
  fs.writeFileSync(
    path.join(learningsDir, `phase-${learnings.phase}-learnings.json`),
    JSON.stringify(learnings, null, 2),
  );
}

export function loadLearnings(sessionDir: string, phase: number): PhaseLearnings | null {
  const filePath = path.join(sessionDir, 'learnings', `phase-${phase}-learnings.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function buildLearningsPrompt(phase: number, title: string, executionLog: string): string {
  return `You just completed Phase ${phase}: "${title}" of a development task.

## Execution Log
${executionLog}

## Instructions

Analyze the execution and extract learnings. Respond with JSON:

\`\`\`json
{
  "phase": ${phase},
  "title": "${title}",
  "patternsDiscovered": ["Pattern 1", "Pattern 2"],
  "mistakesAvoided": ["Mistake 1"],
  "conventionsEstablished": ["Convention 1"]
}
\`\`\`

Focus on insights that would help implement subsequent phases. Be concise.`;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/superRalph/learnings.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/superRalph/learnings.ts src/utils/superRalph/learnings.test.ts
git commit -m "feat: add Super Ralph learnings utility"
```

---

## Task 11: Super Ralph Screen Component

The main Ink TUI screen that orchestrates the full brainstorm, plan, execute flow.

**Files:**
- Create: `src/screens/SuperRalph.tsx`
- Create: `src/screens/SuperRalph.test.tsx`

**Step 1: Write the failing test**

Create `src/screens/SuperRalph.test.tsx`:

```typescript
import React from 'react';
import {describe, it, expect} from 'vitest';
import {render} from 'ink-testing-library';
import {SuperRalph} from './SuperRalph.js';

describe('SuperRalph', () => {
  it('should render the task input prompt on idle', () => {
    const {lastFrame} = render(<SuperRalph onBack={() => {}} />);
    const frame = lastFrame();
    expect(frame).toContain('Super Ralph');
    expect(frame).toContain('task');
  });

  it('should show back hint', () => {
    const {lastFrame} = render(<SuperRalph onBack={() => {}} />);
    const frame = lastFrame();
    expect(frame).toContain('Esc');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/screens/SuperRalph.test.tsx`
Expected: FAIL

**Step 3: Write the screen component**

Create `src/screens/SuperRalph.tsx`:

```typescript
import React, {useState, useCallback} from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import {
  createInitialState,
  transitionToScoping,
  transitionToBrainstorming,
  transitionToPlanning,
  transitionToExecuting,
  transitionToPaused,
  transitionToCompleted,
  addQuestionAnswer,
  skipQuestion,
  confirmPhaseBreakdown,
  setError,
  addLlmQuestion,
  type SuperRalphScreenState,
} from '../hooks/useSuperRalphState.js';
import {getTemplateQuestions} from '../utils/superRalph/brainstorm.js';

const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
  red: '#FF4444',
  dim: '#666666',
};

interface SuperRalphProps {
  onBack: () => void;
}

export const SuperRalph: React.FC<SuperRalphProps> = ({onBack}) => {
  const [state, setState] = useState<SuperRalphScreenState>(createInitialState());
  const [inputValue, setInputValue] = useState('');

  useInput((input, key) => {
    if (key.escape) {
      onBack();
      return;
    }
  });

  const handleTaskSubmit = useCallback((value: string) => {
    if (!value.trim()) return;
    setState(prev => transitionToScoping(prev, value.trim()));
    setInputValue('');
    // TODO: Trigger scope assessment via claude -p
  }, []);

  const handleAnswerSubmit = useCallback((value: string) => {
    if (value.toLowerCase() === 'skip') {
      setState(prev => skipQuestion(prev));
    } else if (value.toLowerCase() === 'done') {
      setState(prev => transitionToPlanning(prev));
    } else {
      setState(prev => addQuestionAnswer(prev, value));
    }
    setInputValue('');
  }, []);

  const renderContent = () => {
    switch (state.step) {
      case 'idle':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Text color={palette.yellow}>Describe your task:</Text>
            <Box marginTop={1}>
              <Text color={palette.cyan}>&gt; </Text>
              <TextInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleTaskSubmit}
                placeholder="e.g., Build the analytics dashboard from Figma"
              />
            </Box>
          </Box>
        );

      case 'scoping':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Box>
              <Text color={palette.cyan}>
                <Spinner type="dots" />
              </Text>
              <Text color={palette.yellow}> {state.loadingMessage}</Text>
            </Box>
          </Box>
        );

      case 'brainstorming': {
        if (state.currentQuestionIndex >= state.questions.length) {
          return (
            <Box flexDirection="column" marginTop={1}>
              <Text color={palette.green}>Brainstorming complete for this phase.</Text>
            </Box>
          );
        }

        const currentQuestion = state.questions[state.currentQuestionIndex];
        return (
          <Box flexDirection="column" marginTop={1}>
            <Text color={palette.yellow}>
              Phase {state.currentPhaseIndex + 1} — Question {state.currentQuestionIndex + 1}/{state.questions.length}
            </Text>
            <Box marginTop={1}>
              <Text color={palette.cyan}>{currentQuestion.question}</Text>
            </Box>
            <Box marginTop={1}>
              <Text color={palette.cyan}>&gt; </Text>
              <TextInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleAnswerSubmit}
                placeholder="Type answer, 'skip', or 'done'"
              />
            </Box>
          </Box>
        );
      }

      case 'planning':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Box>
              <Text color={palette.cyan}>
                <Spinner type="dots" />
              </Text>
              <Text color={palette.yellow}> {state.loadingMessage}</Text>
            </Box>
          </Box>
        );

      case 'executing':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Text color={palette.yellow} bold>Executing Ralph Loop</Text>
            {state.executionProgress && (
              <Box flexDirection="column" marginTop={1}>
                <Text>Phase: {state.executionProgress.phase}</Text>
                <Text>Iteration: {state.executionProgress.iteration}/{state.executionProgress.maxIterations}</Text>
                <Text>
                  Tasks: {state.executionProgress.tasksCompleted.length}/
                  {state.executionProgress.tasksCompleted.length + state.executionProgress.tasksRemaining.length}
                </Text>
              </Box>
            )}
          </Box>
        );

      case 'paused':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Text color={palette.red} bold>Paused: {state.pauseReason}</Text>
            <Text color={palette.dim}>Press Esc to go back.</Text>
          </Box>
        );

      case 'completed':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Text color={palette.green} bold>All phases completed!</Text>
            <Text color={palette.dim}>Press Esc to go back.</Text>
          </Box>
        );

      case 'error':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Text color={palette.red}>Error: {state.error}</Text>
            <Text color={palette.dim}>Press Esc to go back.</Text>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={palette.orange}>{'+-[ Super Ralph ]' + '-'.repeat(45) + '+'}</Text>

      <Box flexDirection="column" paddingLeft={1}>
        {renderContent()}
      </Box>

      <Box marginTop={1}>
        <Text color={palette.orange}>{'+-' + '-'.repeat(60) + '+'}</Text>
      </Box>

      <Box marginTop={1} marginLeft={2}>
        <Text color={palette.dim}>Esc Back</Text>
      </Box>
    </Box>
  );
};
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/screens/SuperRalph.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/screens/SuperRalph.tsx src/screens/SuperRalph.test.tsx
git commit -m "feat: add Super Ralph screen component"
```

---

## Task 12: Menu Integration & Routing

Add Super Ralph to the main menu and route to the screen.

**Files:**
- Modify: `src/components/Menu.tsx`
- Modify: `src/index.tsx`

**Step 1: Add menu item to `src/components/Menu.tsx`**

Add to the `menuItems` array, in the `'agents'` category (after the Test Watcher entry):

```typescript
  {
    label: 'Super Ralph',
    value: 'super-ralph',
    description: 'Autonomous feature development',
    category: 'agents',
  },
```

**Step 2: Add route to `src/index.tsx`**

Import the screen:

```typescript
import {SuperRalph} from './screens/SuperRalph.js';
```

Add case in the `renderScreen()` switch, before the `default` case:

```typescript
      case 'super-ralph':
        return <SuperRalph onBack={handleBack} />;
```

**Step 3: Verify the app builds**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/Menu.tsx src/index.tsx
git commit -m "feat: add Super Ralph to main menu and routing"
```

---

## Task 13: CLI Argument Support

Allow `meeseeks super-ralph "task description"` as a direct invocation.

**Files:**
- Modify: `src/index.tsx`

**Step 1: Add CLI argument parsing**

Before the `render()` call in `src/index.tsx`, add argument parsing:

```typescript
const args = process.argv.slice(2);
const isSuperRalph = args[0] === 'super-ralph';
const superRalphTask = isSuperRalph ? args.slice(1).join(' ') : undefined;
```

**Step 2: Update AppContent to accept initial screen prop**

```typescript
interface AppContentProps {
  initialScreen?: Screen;
  initialTask?: string;
}

const AppContent: React.FC<AppContentProps> = ({initialScreen, initialTask}) => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(initialScreen || 'main');
  // ... pass initialTask to SuperRalph via props when rendering
};
```

Update the `render()` call:

```typescript
render(
  <App
    initialScreen={isSuperRalph ? 'super-ralph' : undefined}
    initialTask={superRalphTask}
  />
);
```

**Step 3: Update SuperRalph props to accept optional initial task**

In `src/screens/SuperRalph.tsx`, add `initialTask?: string` to the props interface and use it to pre-fill the task description on mount.

**Step 4: Verify it builds**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/index.tsx src/screens/SuperRalph.tsx
git commit -m "feat: add CLI argument support for super-ralph subcommand"
```

---

## Summary

| Task | Component | Key Files |
|------|-----------|-----------|
| 1 | Types | `src/types/superRalph.ts` |
| 2 | Claude CLI | `src/utils/claudeCli.ts` |
| 3 | Session Management | `src/utils/superRalph/session.ts` |
| 4 | Context Gathering | `src/utils/superRalph/contextGatherer.ts` |
| 5 | Brainstorming Engine | `src/utils/superRalph/brainstorm.ts` |
| 6 | Plan Generation | `src/utils/superRalph/planGenerator.ts` |
| 7 | Ralph Loop Executor | `src/utils/superRalph/executor.ts` |
| 8 | Notifications | `src/utils/superRalph/notifications.ts` |
| 9 | State Hook | `src/hooks/useSuperRalphState.ts` |
| 10 | Learnings | `src/utils/superRalph/learnings.ts` |
| 11 | Screen Component | `src/screens/SuperRalph.tsx` |
| 12 | Menu + Routing | `src/components/Menu.tsx`, `src/index.tsx` |
| 13 | CLI Arguments | `src/index.tsx` |

All tasks follow TDD: write test, verify fails, implement, verify passes, commit.

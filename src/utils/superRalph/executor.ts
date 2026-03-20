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
  if (progress.iteration >= progress.maxIterations) {
    return true;
  }

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

  if (output.includes('PHASE_COMPLETE')) {
    updated.tasksRemaining = [];
  }

  return updated;
}

export interface ExecutionCallbacks {
  onIterationStart?: (iteration: number, promptPreview: string) => void;
  onIterationComplete?: (iteration: number, output: string) => void;
  onOutputChunk?: (chunk: string) => void;
  onAssistantText?: (text: string) => void;
  onToolUse?: (toolName: string, toolInput: string) => void;
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
    const prompt = buildIterationPrompt(phasePrompt, progress);

    // Show prompt preview (first task being worked on)
    const nextTask = progress.tasksRemaining[0] || 'unknown';
    const promptPreview = `Working on ${nextTask} | Prompt: ${prompt.length} chars`;
    callbacks?.onIterationStart?.(iteration, promptPreview);

    const result = await runClaude({
      prompt,
      cwd,
      onStdoutChunk: (chunk) => {
        callbacks?.onOutputChunk?.(chunk);
      },
      onAssistantText: (text) => {
        callbacks?.onAssistantText?.(text);
      },
      onToolUse: (toolName, toolInput) => {
        callbacks?.onToolUse?.(toolName, toolInput);
      },
    });

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

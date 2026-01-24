import * as fs from 'fs';
import * as path from 'path';
import type { HandoffState, ExistingWorkResult, MeeseeksMode } from './types.js';

// Default location for task artifacts
const MEESEEKS_TASKS_DIR = '.meeseeks/tasks';

/**
 * Get the task directory path for a given task key
 */
export function getTaskDir(projectRoot: string, taskKey: string): string {
  return path.join(projectRoot, MEESEEKS_TASKS_DIR, taskKey);
}

/**
 * Get the state.json path for a task
 */
export function getStateFilePath(projectRoot: string, taskKey: string): string {
  return path.join(getTaskDir(projectRoot, taskKey), 'state.json');
}

/**
 * Initialize task directory structure
 * Creates .meeseeks/tasks/{task-key}/ with empty state.json
 */
export function initializeTaskDir(
  projectRoot: string,
  taskKey: string,
  initialMode: MeeseeksMode = 'orchestrate'
): HandoffState {
  const taskDir = getTaskDir(projectRoot, taskKey);

  // Create directory if it doesn't exist
  if (!fs.existsSync(taskDir)) {
    fs.mkdirSync(taskDir, { recursive: true });
  }

  // Create initial state
  const initialState: HandoffState = {
    schemaVersion: '1.0',
    task_key: taskKey,
    current_mode: initialMode,
    files_created: [],
    checkpoint_data: {
      phase: 'initialized',
      completed_steps: [],
      next_action: 'start_' + initialMode,
    },
    last_updated: new Date().toISOString(),
  };

  // Write state file
  saveTaskState(projectRoot, taskKey, initialState);

  return initialState;
}

/**
 * Load task state from state.json
 * Returns null if file doesn't exist or is invalid
 */
export function loadTaskState(projectRoot: string, taskKey: string): HandoffState | null {
  const statePath = getStateFilePath(projectRoot, taskKey);

  try {
    if (fs.existsSync(statePath)) {
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content) as HandoffState;

      // Basic validation
      if (!state.schemaVersion || !state.task_key || !state.current_mode) {
        console.warn(`Invalid state file at ${statePath}: missing required fields`);
        return null;
      }

      return state;
    }
  } catch (error) {
    console.warn(`Failed to load task state from ${statePath}:`, error);
  }

  return null;
}

/**
 * Save task state to state.json
 * Updates last_updated timestamp automatically
 */
export function saveTaskState(
  projectRoot: string,
  taskKey: string,
  state: HandoffState
): void {
  const taskDir = getTaskDir(projectRoot, taskKey);
  const statePath = getStateFilePath(projectRoot, taskKey);

  // Ensure directory exists
  if (!fs.existsSync(taskDir)) {
    fs.mkdirSync(taskDir, { recursive: true });
  }

  // Update timestamp
  const updatedState: HandoffState = {
    ...state,
    last_updated: new Date().toISOString(),
  };

  fs.writeFileSync(statePath, JSON.stringify(updatedState, null, 2), 'utf-8');
}

/**
 * Update checkpoint data within current state
 * Convenience function for incremental progress tracking
 */
export function updateCheckpoint(
  projectRoot: string,
  taskKey: string,
  checkpoint: Partial<HandoffState['checkpoint_data']>
): HandoffState | null {
  const state = loadTaskState(projectRoot, taskKey);
  if (!state) return null;

  const updatedState: HandoffState = {
    ...state,
    checkpoint_data: {
      ...state.checkpoint_data,
      ...checkpoint,
    },
  };

  saveTaskState(projectRoot, taskKey, updatedState);
  return updatedState;
}

/**
 * Add a file to the files_created list
 */
export function addCreatedFile(
  projectRoot: string,
  taskKey: string,
  filePath: string
): HandoffState | null {
  const state = loadTaskState(projectRoot, taskKey);
  if (!state) return null;

  if (!state.files_created.includes(filePath)) {
    const updatedState: HandoffState = {
      ...state,
      files_created: [...state.files_created, filePath],
    };
    saveTaskState(projectRoot, taskKey, updatedState);
    return updatedState;
  }

  return state;
}

/**
 * Transition to next mode
 * Updates current_mode and resets checkpoint for new mode
 */
export function transitionToMode(
  projectRoot: string,
  taskKey: string,
  nextMode: MeeseeksMode
): HandoffState | null {
  const state = loadTaskState(projectRoot, taskKey);
  if (!state) return null;

  const updatedState: HandoffState = {
    ...state,
    current_mode: nextMode,
    checkpoint_data: {
      phase: 'transitioned',
      completed_steps: [],
      next_action: 'start_' + nextMode,
    },
  };

  saveTaskState(projectRoot, taskKey, updatedState);
  return updatedState;
}

/**
 * Detect existing work for a task key
 * Returns state if exists, used for resume functionality
 */
export function detectExistingWork(
  projectRoot: string,
  taskKey: string
): ExistingWorkResult {
  const taskDir = getTaskDir(projectRoot, taskKey);
  const state = loadTaskState(projectRoot, taskKey);

  if (state) {
    return {
      exists: true,
      state,
      taskDir,
    };
  }

  // Check if directory exists even without valid state
  if (fs.existsSync(taskDir)) {
    return {
      exists: true,
      taskDir,
    };
  }

  return { exists: false };
}

/**
 * List all active tasks (directories in .meeseeks/tasks/)
 */
export function listActiveTasks(projectRoot: string): string[] {
  const tasksDir = path.join(projectRoot, MEESEEKS_TASKS_DIR);

  if (!fs.existsSync(tasksDir)) {
    return [];
  }

  try {
    const entries = fs.readdirSync(tasksDir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  } catch {
    return [];
  }
}

/**
 * Clean up task directory after completion
 * Per CONTEXT.md: "delete task folder, keep plan in plans/"
 */
export function cleanupTask(projectRoot: string, taskKey: string): boolean {
  const taskDir = getTaskDir(projectRoot, taskKey);

  try {
    if (fs.existsSync(taskDir)) {
      fs.rmSync(taskDir, { recursive: true, force: true });
      return true;
    }
  } catch (error) {
    console.warn(`Failed to cleanup task ${taskKey}:`, error);
  }

  return false;
}

/**
 * Generate a slug from task description (for non-JIRA tasks)
 */
export function generateTaskSlug(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove special chars
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Collapse multiple hyphens
    .substring(0, 50)              // Limit length
    .replace(/^-|-$/g, '');        // Trim leading/trailing hyphens
}

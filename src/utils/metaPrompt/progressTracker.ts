/**
 * Progress Tracker Utilities
 *
 * Manages task execution progress tracking for meta-prompting workflows.
 * Tracks progress via:
 * 1. Inline checkboxes in plan files (- [ ] → - [x])
 * 2. Append-only progress log (.roo/progress.txt or .kilo/progress.txt)
 *
 * Used by /execute, /verify, and /status commands.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Task status extracted from plan file
 */
export interface TaskStatus {
  number: number;
  name: string;
  checked: boolean;
  line: number; // Line number in plan file (1-indexed)
}

/**
 * Plan progress summary
 */
export interface PlanProgress {
  planFile: string;
  totalTasks: number;
  completedTasks: number;
  percentComplete: number;
  tasks: TaskStatus[];
}

/**
 * Progress log entry
 */
export interface ProgressLogEntry {
  timestamp: string; // ISO 8601 UTC
  context: string; // "Plan" or "Task-N"
  status: 'START' | 'DONE' | 'ERROR' | 'FIX' | 'COMMIT' | 'SKIP';
  message: string;
}

/**
 * Parse task checkboxes from plan file
 *
 * Searches for markdown task lists:
 * - [ ] Task description
 * - [x] Task description
 *
 * @param planFilePath Absolute path to plan file
 * @returns Plan progress with task statuses
 */
export function parsePlanProgress(planFilePath: string): PlanProgress {
  if (!fs.existsSync(planFilePath)) {
    throw new Error(`Plan file not found: ${planFilePath}`);
  }

  const content = fs.readFileSync(planFilePath, 'utf-8');
  const lines = content.split('\n');

  const tasks: TaskStatus[] = [];
  let taskNumber = 0;

  // Regex to match task list items: - [ ] or - [x]
  const taskRegex = /^-\s+\[([ x])\]\s+(.+)$/;

  lines.forEach((line, index) => {
    const match = line.match(taskRegex);
    if (match) {
      taskNumber++;
      const checked = match[1] === 'x';
      const name = match[2].trim();

      tasks.push({
        number: taskNumber,
        name,
        checked,
        line: index + 1, // Convert to 1-indexed
      });
    }
  });

  const completedTasks = tasks.filter((t) => t.checked).length;
  const percentComplete =
    tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return {
    planFile: path.basename(planFilePath),
    totalTasks: tasks.length,
    completedTasks,
    percentComplete,
    tasks,
  };
}

/**
 * Update a task checkbox in the plan file
 *
 * Changes task from unchecked to checked:
 * - [ ] Task name → - [x] Task name
 *
 * @param planFilePath Absolute path to plan file
 * @param taskNumber Task number (1-indexed)
 * @param checked New checkbox state
 */
export function updateTaskCheckbox(
  planFilePath: string,
  taskNumber: number,
  checked: boolean
): void {
  if (!fs.existsSync(planFilePath)) {
    throw new Error(`Plan file not found: ${planFilePath}`);
  }

  const content = fs.readFileSync(planFilePath, 'utf-8');
  const lines = content.split('\n');

  const taskRegex = /^-\s+\[([ x])\]\s+(.+)$/;
  let currentTaskNum = 0;
  let modified = false;

  const updatedLines = lines.map((line) => {
    const match = line.match(taskRegex);
    if (match) {
      currentTaskNum++;
      if (currentTaskNum === taskNumber) {
        modified = true;
        const checkMark = checked ? 'x' : ' ';
        const taskName = match[2];
        return `- [${checkMark}] ${taskName}`;
      }
    }
    return line;
  });

  if (!modified) {
    throw new Error(
      `Task ${taskNumber} not found in plan file: ${planFilePath}`
    );
  }

  fs.writeFileSync(planFilePath, updatedLines.join('\n'), 'utf-8');
}

/**
 * Append entry to progress log
 *
 * Log format: [timestamp] [context] [status] message
 * Example: [2026-01-24T10:30:00Z] [Task-1] START: Create auth middleware
 *
 * @param extensionDir Extension directory (.roo or .kilo)
 * @param context "Plan" or "Task-N"
 * @param status Log entry status
 * @param message Log message
 */
export function appendProgressLog(
  extensionDir: string,
  context: string,
  status: ProgressLogEntry['status'],
  message: string
): void {
  const logFile = path.join(extensionDir, 'progress.txt');

  // Ensure extension directory exists
  if (!fs.existsSync(extensionDir)) {
    fs.mkdirSync(extensionDir, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${context}] ${status}: ${message}\n`;

  fs.appendFileSync(logFile, logEntry, 'utf-8');
}

/**
 * Read progress log entries
 *
 * @param extensionDir Extension directory (.roo or .kilo)
 * @param limit Maximum number of entries to return (from end of file)
 * @returns Array of progress log entries (most recent last)
 */
export function readProgressLog(
  extensionDir: string,
  limit?: number
): ProgressLogEntry[] {
  const logFile = path.join(extensionDir, 'progress.txt');

  if (!fs.existsSync(logFile)) {
    return [];
  }

  const content = fs.readFileSync(logFile, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);

  // Parse log entries
  const entries: ProgressLogEntry[] = lines
    .map((line) => {
      // Format: [timestamp] [context] status: message
      const match = line.match(
        /^\[(.+?)\]\s+\[(.+?)\]\s+(START|DONE|ERROR|FIX|COMMIT|SKIP):\s+(.+)$/
      );

      if (match) {
        return {
          timestamp: match[1],
          context: match[2],
          status: match[3] as ProgressLogEntry['status'],
          message: match[4],
        };
      }

      return null;
    })
    .filter((entry): entry is ProgressLogEntry => entry !== null);

  // Return last N entries if limit specified
  if (limit && limit > 0) {
    return entries.slice(-limit);
  }

  return entries;
}

/**
 * Get overall progress summary
 *
 * Combines plan file progress with log entries to show current state.
 *
 * @param planFilePath Absolute path to plan file
 * @param extensionDir Extension directory (.roo or .kilo)
 * @returns Progress summary with recent activity
 */
export function getProgress(
  planFilePath: string,
  extensionDir: string
): {
  progress: PlanProgress;
  recentActivity: ProgressLogEntry[];
  lastError?: ProgressLogEntry;
} {
  const progress = parsePlanProgress(planFilePath);
  const recentActivity = readProgressLog(extensionDir, 10);

  // Find most recent error (if any)
  const errors = recentActivity.filter((e) => e.status === 'ERROR');
  const lastError = errors.length > 0 ? errors[errors.length - 1] : undefined;

  return {
    progress,
    recentActivity,
    lastError,
  };
}

/**
 * Format progress status for display
 *
 * Creates visual progress bar: ██████░░░░ 60%
 *
 * @param completed Number of completed items
 * @param total Total number of items
 * @returns Formatted progress string
 */
export function formatProgressStatus(
  completed: number,
  total: number
): string {
  if (total === 0) {
    return '░░░░░░░░░░ 0%';
  }

  const percentage = Math.round((completed / total) * 100);
  const filled = Math.round((completed / total) * 10);
  const empty = 10 - filled;

  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percentage}%`;
}

/**
 * Clear progress log
 *
 * Used when starting a fresh execution cycle.
 *
 * @param extensionDir Extension directory (.roo or .kilo)
 */
export function clearProgressLog(extensionDir: string): void {
  const logFile = path.join(extensionDir, 'progress.txt');

  if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
  }
}

/**
 * Find active plan from progress log
 *
 * Returns the most recent plan that was started but not all tasks completed.
 *
 * @param extensionDir Extension directory (.roo or .kilo)
 * @param plansDir Plans directory (default: ./plans)
 * @returns Active plan filename or null
 */
export function findActivePlan(
  extensionDir: string,
  plansDir: string = './plans'
): string | null {
  const entries = readProgressLog(extensionDir);

  // Find most recent "Plan START" entry
  const planStarts = entries.filter(
    (e) => e.context === 'Plan' && e.status === 'START'
  );

  if (planStarts.length === 0) {
    return null;
  }

  const lastPlanStart = planStarts[planStarts.length - 1];
  const planFileName = lastPlanStart.message; // Message contains plan filename

  // Check if plan is complete
  const planPath = path.join(plansDir, planFileName);
  if (!fs.existsSync(planPath)) {
    return null;
  }

  const progress = parsePlanProgress(planPath);

  // If all tasks complete, no active plan
  if (progress.completedTasks === progress.totalTasks) {
    return null;
  }

  return planFileName;
}

/**
 * Get next uncompleted task from plan
 *
 * @param planFilePath Absolute path to plan file
 * @returns Next task to execute or null if all complete
 */
export function getNextTask(planFilePath: string): TaskStatus | null {
  const progress = parsePlanProgress(planFilePath);

  const nextTask = progress.tasks.find((task) => !task.checked);

  return nextTask || null;
}

/**
 * Format timestamp for display
 *
 * Converts ISO 8601 to human-readable format.
 *
 * @param isoTimestamp ISO 8601 timestamp
 * @returns Formatted timestamp (e.g., "2026-01-24 10:30:00 UTC")
 */
export function formatTimestamp(isoTimestamp: string): string {
  try {
    const date = new Date(isoTimestamp);
    return date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  } catch {
    return isoTimestamp;
  }
}

/**
 * Calculate elapsed time between timestamps
 *
 * @param startTimestamp ISO 8601 start timestamp
 * @param endTimestamp ISO 8601 end timestamp (default: now)
 * @returns Formatted duration (e.g., "15 minutes")
 */
export function calculateElapsedTime(
  startTimestamp: string,
  endTimestamp?: string
): string {
  try {
    const start = new Date(startTimestamp);
    const end = endTimestamp ? new Date(endTimestamp) : new Date();

    const diffMs = end.getTime() - start.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) {
      return '< 1 minute';
    } else if (diffMinutes === 1) {
      return '1 minute';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minutes`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      if (minutes === 0) {
        return hours === 1 ? '1 hour' : `${hours} hours`;
      }
      return `${hours}h ${minutes}m`;
    }
  } catch {
    return 'unknown';
  }
}

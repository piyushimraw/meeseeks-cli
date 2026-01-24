import type { MetaPromptExtension } from '../../types/index.js';

// Re-export MetaPromptExtension for convenience
export type { MetaPromptExtension } from '../../types/index.js';

// Tech Stack Detection
export interface TechStack {
  runtime: 'Node.js' | 'Python' | 'Rust' | 'Go' | 'unknown';
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'poetry' | 'cargo';
  frameworks: string[];
  testFramework?: string;
  buildTool?: string;
  language?: 'TypeScript' | 'JavaScript' | 'Python' | 'Rust' | 'Go';
}

// Prime File Generation
export interface PrimeFile {
  name: 'ARCHITECTURE' | 'CONVENTION' | 'INTEGRATION' | 'STACK' | 'STRUCTURE';
  content: string;
  generatedAt: string;
  sourceCommit?: string;  // For incremental updates
}

// Command Prompt Definition
export interface CommandPrompt {
  command: string;  // e.g., 'prime', 'plan', 'execute'
  description: string;
  agent: string;
  model: string;
  tools: string[];
  promptContent: string;
}

// Meta Prompt Configuration
export interface MetaPromptConfig {
  extension: MetaPromptExtension;
  targetDir: string;  // .roo/ or .kilo/
  projectRoot: string;
  techStack: TechStack;
  lastPrimeCommit?: string;  // For incremental detection
  generatedAt: string;
}

// Overwrite Options
export type OverwriteChoice = 'overwrite' | 'skip' | 'diff';

// File Generation Result
export interface FileGenerationResult {
  path: string;
  status: 'created' | 'updated' | 'skipped' | 'error';
  error?: string;
}

// Prime Metadata (stored in .prime-meta.json)
export interface PrimeMetadata {
  lastCommit: string;
  lastRun: string;
  filesGenerated: string[];
  techStackHash: string;  // Hash of detected stack for change detection
}

// Custom Mode Workflow Types (Phase 7.1)

/**
 * Mode names for KiloCode custom modes workflow
 */
export type MeeseeksMode =
  | 'orchestrate'
  | 'discuss'
  | 'plan'
  | 'generate-verification'
  | 'execute'
  | 'verify';

/**
 * Checkpoint data for resumable execution within a mode
 * Follows Microsoft Agent Framework checkpoint pattern
 */
export interface CheckpointData {
  phase: string;              // Current phase within mode (e.g., "requirements_complete")
  completed_steps: string[];  // What's been done
  next_action: string;        // What to do next
}

/**
 * State handoff structure between modes
 * Stored in .meeseeks/tasks/{task-key}/state.json
 * Follows Microsoft Agent Framework handoff orchestration pattern
 */
export interface HandoffState {
  schemaVersion: string;        // "1.0" - for future compatibility and migrations
  task_key: string;             // "PROJ-123" or generated slug
  current_mode: MeeseeksMode;   // Which mode should run next
  files_created: string[];      // Paths to artifacts created (context.md, plan.md, etc.)
  checkpoint_data: CheckpointData;
  last_updated: string;         // ISO 8601 timestamp
  trace_id?: string;            // Optional correlation ID for debugging
}

/**
 * Result of detecting existing work
 */
export interface ExistingWorkResult {
  exists: boolean;
  state?: HandoffState;
  taskDir?: string;
}

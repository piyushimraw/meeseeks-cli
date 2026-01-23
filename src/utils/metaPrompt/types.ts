import type { MetaPromptExtension } from '../../types/index.js';

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

// Meta Prompting Utilities - Barrel Export

// Types
export type {
  TechStack,
  PrimeFile,
  CommandPrompt,
  MetaPromptConfig,
  OverwriteChoice,
  FileGenerationResult,
  PrimeMetadata,
} from './types.js';

// Tech Stack Detection
export { detectTechStack, hashTechStack } from './techStackDetector.js';

// File Generation
export {
  ensureTargetDir,
  getTargetDir,
  checkExistingFile,
  writeFile,
  generateFile,
  loadPrimeMetadata,
  savePrimeMetadata,
  generateIndexMd,
  listGeneratedFiles,
} from './generator.js';

// Prime Analysis
export {
  loadPrimeTemplate,
  generateTemplateVariables,
  generatePrimeStub,
  getAllPrimeFileNames,
  parsePromptFrontmatter,
} from './primeAnalyzer.js';
export type { TemplateVariables, PromptFrontmatter } from './primeAnalyzer.js';

// Template Rendering
export {
  generateFrontmatter,
  renderTemplate,
  parsePromptFile,
  createPromptFile,
  applyExtensionTweaks,
} from './templateRenderer.js';

// Change Detection
export {
  getCurrentCommit,
  getChangedFilesSince,
  getAffectedPrimeFiles,
  detectChanges,
} from './changeDetector.js';
export type { ChangeDetectionResult } from './changeDetector.js';

// Plan Command
export {
  ensurePlansDir,
  generatePlanFilename,
  buildPlanContext,
} from './planCommand.js';
export type { PlanContext, PlanMetadata } from './planCommand.js';

// Progress Tracking
export {
  parsePlanProgress,
  updateTaskCheckbox,
  appendProgressLog,
  readProgressLog,
  getProgress,
  formatProgressStatus,
  clearProgressLog,
  findActivePlan,
  getNextTask,
  formatTimestamp,
  calculateElapsedTime,
} from './progressTracker.js';
export type {
  TaskStatus,
  PlanProgress,
  ProgressLogEntry,
} from './progressTracker.js';

// Meta Prompting Utilities - Barrel Export

// Types
export type {
  TechStack,
  PrimeFile,
  MetaPromptConfig,
  OverwriteChoice,
  FileGenerationResult,
  PrimeMetadata,
  // Custom Mode Workflow Types (Phase 7.1)
  MeeseeksMode,
  CheckpointData,
  HandoffState,
  ExistingWorkResult,
} from './types.js';

// Embedded Templates
export { getEmbeddedTemplate, ROOCODE_TEMPLATES, KILOCODE_TEMPLATES } from './embeddedTemplates.js';
export type { TemplateName, ExtensionType } from './embeddedTemplates.js';

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

// Task State Management (Phase 7.1 - Custom Modes)
export {
  getTaskDir,
  getStateFilePath,
  initializeTaskDir,
  loadTaskState,
  saveTaskState,
  updateCheckpoint,
  addCreatedFile,
  transitionToMode,
  detectExistingWork,
  listActiveTasks,
  cleanupTask,
  generateTaskSlug,
} from './taskState.js';

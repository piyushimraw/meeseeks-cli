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

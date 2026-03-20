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

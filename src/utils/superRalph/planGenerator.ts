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
  const jsonMatch = llmOutput.match(/\`\`\`(?:json)?\s*\n?([\s\S]*?)\n?\`\`\`/);
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

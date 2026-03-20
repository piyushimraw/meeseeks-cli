import type {BrainstormQuestion, BrainstormOutput, ScopeAssessment} from '../../types/superRalph.js';

export function getTemplateQuestions(): BrainstormQuestion[] {
  return [
    {
      id: 'template-1',
      question: 'What exactly should this do? Describe the functional requirements.',
      type: 'template',
    },
    {
      id: 'template-2',
      question: 'What are the constraints? (tech stack, performance, compatibility, etc.)',
      type: 'template',
    },
    {
      id: 'template-3',
      question: 'What does success look like? Define the acceptance criteria.',
      type: 'template',
    },
    {
      id: 'template-4',
      question: 'What are the dependencies? (other phases, external APIs, libraries, etc.)',
      type: 'template',
    },
  ];
}

export function buildScopeAssessmentPrompt(task: string, context: string): string {
  return `You are assessing the scope of a development task.

## Task
${task}

## Project Context
${context}

## Instructions

Analyze this task and determine whether it should be broken into multiple phases or handled as a single phase.

Consider:
- Number of distinct components or modules involved
- Whether there are clear sequential dependencies
- Overall complexity and risk

Respond with JSON in this exact format:

\`\`\`json
{
  "isMultiPhase": boolean,
  "reasoning": "Your explanation of why this is or isn't multi-phase",
  "proposedPhases": [
    { "title": "Phase title", "description": "Brief description of what this phase covers" }
  ]
}
\`\`\`

If single phase, still include one entry in proposedPhases. Be concise.`;
}

export function parseScopeAssessment(llmOutput: string): ScopeAssessment {
  const jsonMatch = llmOutput.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : llmOutput.trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      isMultiPhase: parsed.isMultiPhase,
      reasoning: parsed.reasoning,
      proposedPhases: parsed.proposedPhases,
    };
  } catch {
    throw new Error(`Failed to parse scope assessment: ${jsonStr.slice(0, 200)}`);
  }
}

export function buildFollowUpPrompt(task: string, answeredQuestions: BrainstormQuestion[]): string {
  const qaContext = answeredQuestions
    .filter(q => q.answer && !q.skipped)
    .map(q => `Q: ${q.question}\nA: ${q.answer}`)
    .join('\n\n');

  return `You are brainstorming a development task with a developer.

## Task
${task}

## Previous Q&A
${qaContext || '(No questions answered yet)'}

## Instructions

Based on the task and answers so far, generate one follow-up question that would help clarify the implementation. Focus on details that would be important for writing code.

If you believe enough detail has been gathered, respond with exactly: BRAINSTORM_COMPLETE

Otherwise, respond with just the question text (no numbering, no prefix).`;
}

export function buildBrainstormOutput(
  phase: number,
  title: string,
  questions: BrainstormQuestion[],
  contextSources: string[],
): BrainstormOutput {
  const answered = questions.filter(q => q.answer && !q.skipped);

  const decisions: string[] = [];
  const constraints: string[] = [];
  const acceptanceCriteria: string[] = [];
  const dependencies: string[] = [];

  for (const q of answered) {
    const answer = q.answer!;
    if (q.id === 'template-1' || q.type === 'llm-generated') {
      decisions.push(answer);
    }
    if (q.id === 'template-2') {
      constraints.push(answer);
    }
    if (q.id === 'template-3') {
      acceptanceCriteria.push(answer);
    }
    if (q.id === 'template-4') {
      dependencies.push(answer);
    }
  }

  return {
    phase,
    title,
    decisions,
    constraints,
    acceptanceCriteria,
    dependencies,
    contextSources,
  };
}

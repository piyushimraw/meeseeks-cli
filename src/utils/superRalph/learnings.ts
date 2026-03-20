import fs from 'node:fs';
import path from 'node:path';
import type {PhaseLearnings} from '../../types/superRalph.js';

export function saveLearnings(sessionDir: string, learnings: PhaseLearnings): void {
  const learningsDir = path.join(sessionDir, 'learnings');
  fs.mkdirSync(learningsDir, {recursive: true});
  fs.writeFileSync(
    path.join(learningsDir, `phase-${learnings.phase}-learnings.json`),
    JSON.stringify(learnings, null, 2),
  );
}

export function loadLearnings(sessionDir: string, phase: number): PhaseLearnings | null {
  const filePath = path.join(sessionDir, 'learnings', `phase-${phase}-learnings.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function buildLearningsPrompt(phase: number, title: string, executionLog: string): string {
  return `You just completed Phase ${phase}: "${title}" of a development task.

## Execution Log
${executionLog}

## Instructions

Analyze the execution and extract learnings. Respond with JSON:

\`\`\`json
{
  "phase": ${phase},
  "title": "${title}",
  "patternsDiscovered": ["Pattern 1", "Pattern 2"],
  "mistakesAvoided": ["Mistake 1"],
  "conventionsEstablished": ["Convention 1"]
}
\`\`\`

Focus on insights that would help implement subsequent phases. Be concise.`;
}

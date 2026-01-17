import { chatWithCopilot, type ChatMessage } from './copilot.js';
import { loadTestingRules, formatRulesForPrompt } from './rulesLoader.js';
import { readSourceFile, readTestFile, testFileExists } from './fileWatcher.js';
import type { GeneratedTest } from '../types/index.js';

export interface TestGenerationResult {
  success: boolean;
  test?: GeneratedTest;
  error?: string;
}

/**
 * Generate or update tests for a source file
 */
export async function generateTestsForFile(
  sourceFilePath: string,
  testFilePath: string,
  token: string,
  model: string,
  projectRoot: string = process.cwd()
): Promise<TestGenerationResult> {
  // Read source file
  const sourceContent = readSourceFile(sourceFilePath);
  if (!sourceContent) {
    return { success: false, error: 'Could not read source file' };
  }

  // Load testing rules
  const rules = loadTestingRules(projectRoot);
  const rulesPrompt = formatRulesForPrompt(rules);

  // Check if test file exists
  const existingTests = testFileExists(testFilePath)
    ? readTestFile(testFilePath)
    : null;

  // Build the prompt
  const messages = buildTestGenerationPrompt(
    sourceFilePath,
    sourceContent,
    existingTests,
    rulesPrompt
  );

  // Call AI to generate tests
  const result = await chatWithCopilot(token, messages, model);

  if (!result.success || !result.content) {
    return { success: false, error: result.error || 'Failed to generate tests' };
  }

  // Extract code from response (handle markdown code blocks)
  const testContent = extractCodeFromResponse(result.content);

  return {
    success: true,
    test: {
      sourceFile: sourceFilePath,
      testFile: testFilePath,
      content: testContent,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Build the prompt messages for test generation
 */
function buildTestGenerationPrompt(
  sourceFilePath: string,
  sourceContent: string,
  existingTests: string | null,
  rulesPrompt: string
): ChatMessage[] {
  const fileName = sourceFilePath.split('/').pop() || 'file';
  const fileExtension = fileName.split('.').pop() || '';

  // Determine test framework hints based on file extension
  let frameworkHint = '';
  if (fileExtension === 'ts' || fileExtension === 'tsx') {
    frameworkHint = 'Use Jest or Vitest with TypeScript. Include proper type annotations.';
  } else if (fileExtension === 'js' || fileExtension === 'jsx') {
    frameworkHint = 'Use Jest or Vitest.';
  } else if (fileExtension === 'py') {
    frameworkHint = 'Use pytest with proper fixtures and assertions.';
  }

  let systemPrompt = `You are an expert test engineer. Generate comprehensive, well-structured tests for the provided source code.

Guidelines:
- Write clear, readable tests with descriptive names
- Cover edge cases and error scenarios
- Use appropriate mocking where needed
- Follow the Arrange-Act-Assert pattern
- ${frameworkHint}
- Output ONLY the test code, no explanations
- Include necessary imports at the top`;

  if (rulesPrompt) {
    systemPrompt += `\n\n${rulesPrompt}`;
  }

  let userPrompt = `Generate tests for the following file: ${fileName}\n\n`;
  userPrompt += '```\n' + sourceContent + '\n```\n\n';

  if (existingTests) {
    userPrompt += `Existing tests (update and add to these, do not remove working tests):\n\n`;
    userPrompt += '```\n' + existingTests + '\n```\n\n';
    userPrompt += 'Add any missing test cases and update existing ones if the source code has changed. Preserve tests that are still valid.';
  } else {
    userPrompt += 'Generate a complete test file covering all exported functions, classes, and significant logic.';
  }

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

/**
 * Extract code from AI response (handles markdown code blocks)
 */
function extractCodeFromResponse(response: string): string {
  // Check for markdown code block
  const codeBlockMatch = response.match(/```(?:typescript|javascript|python|ts|js|py)?\n([\s\S]*?)```/);

  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // If no code block, return as-is (already plain code)
  return response.trim();
}

/**
 * Infer test framework from existing project files
 */
export function inferTestFramework(projectRoot: string = process.cwd()): string {
  const fs = require('fs');
  const path = require('path');

  // Check package.json for test frameworks
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps['vitest']) return 'vitest';
      if (deps['jest']) return 'jest';
      if (deps['mocha']) return 'mocha';
    } catch {
      // Ignore parse errors
    }
  }

  // Check for pytest in Python projects
  const pyprojectPath = path.join(projectRoot, 'pyproject.toml');
  if (fs.existsSync(pyprojectPath)) {
    return 'pytest';
  }

  return 'unknown';
}

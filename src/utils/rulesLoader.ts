import * as fs from 'fs';
import * as path from 'path';
import type { TestRule } from '../types/index.js';

// Standard rule file locations in priority order
const RULE_LOCATIONS = [
  { path: '.meeseeks/rules/test.md', source: 'meeseeks' as const },
  { path: 'AGENTS.md', source: 'agents' as const },
  { path: 'CLAUDE.md', source: 'claude' as const },
];

/**
 * Load testing rules from standard locations
 * Returns rules in priority order (first found takes precedence)
 */
export function loadTestingRules(
  projectRoot: string = process.cwd()
): TestRule[] {
  const rules: TestRule[] = [];

  for (const location of RULE_LOCATIONS) {
    const fullPath = path.join(projectRoot, location.path);

    try {
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Extract test-related rules if it's AGENTS.md or CLAUDE.md
        let relevantContent = content;
        if (location.source !== 'meeseeks') {
          relevantContent = extractTestingSection(content);
        }

        if (relevantContent.trim()) {
          rules.push({
            source: location.source,
            content: relevantContent,
            filePath: fullPath,
          });
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return rules;
}

/**
 * Extract testing-related sections from a markdown file
 * Looks for sections with "test" in the heading
 */
function extractTestingSection(content: string): string {
  const lines = content.split('\n');
  const sections: string[] = [];
  let inTestSection = false;
  let currentSection: string[] = [];

  for (const line of lines) {
    // Check for heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // Save previous section if it was a test section
      if (inTestSection && currentSection.length > 0) {
        sections.push(currentSection.join('\n'));
      }

      // Check if new section is test-related
      const headingText = headingMatch[2].toLowerCase();
      inTestSection = headingText.includes('test') ||
                      headingText.includes('testing') ||
                      headingText.includes('unit') ||
                      headingText.includes('spec');
      currentSection = inTestSection ? [line] : [];
    } else if (inTestSection) {
      currentSection.push(line);
    }
  }

  // Don't forget the last section
  if (inTestSection && currentSection.length > 0) {
    sections.push(currentSection.join('\n'));
  }

  return sections.join('\n\n');
}

/**
 * Format rules for inclusion in AI prompt
 */
export function formatRulesForPrompt(rules: TestRule[]): string {
  if (rules.length === 0) {
    return '';
  }

  const formattedRules = rules.map((rule) => {
    const sourceLabel = {
      meeseeks: 'Project Testing Rules (.meeseeks/rules/test.md)',
      agents: 'Agent Rules (AGENTS.md)',
      claude: 'Claude Rules (CLAUDE.md)',
    }[rule.source];

    return `### ${sourceLabel}\n\n${rule.content}`;
  });

  return `## Testing Rules\n\nFollow these project-specific testing rules:\n\n${formattedRules.join('\n\n')}`;
}

/**
 * Check if any rules files exist in the project
 */
export function hasTestingRules(projectRoot: string = process.cwd()): boolean {
  for (const location of RULE_LOCATIONS) {
    const fullPath = path.join(projectRoot, location.path);
    if (fs.existsSync(fullPath)) {
      return true;
    }
  }
  return false;
}

/**
 * Get list of found rule files
 */
export function getFoundRuleFiles(projectRoot: string = process.cwd()): string[] {
  const found: string[] = [];

  for (const location of RULE_LOCATIONS) {
    const fullPath = path.join(projectRoot, location.path);
    if (fs.existsSync(fullPath)) {
      found.push(location.path);
    }
  }

  return found;
}

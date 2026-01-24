import { describe, it, expect } from 'vitest';
import {
  generateTemplateVariables,
  generatePrimeStub,
  getAllPrimeFileNames,
  parsePromptFrontmatter,
} from './primeAnalyzer.js';
import type { TechStack } from './types.js';

describe('primeAnalyzer', () => {
  describe('generateTemplateVariables', () => {
    it('generates variables with roocode target directory', () => {
      const techStack: TechStack = {
        runtime: 'Node.js',
        language: 'TypeScript',
        frameworks: ['React'],
      };

      const result = generateTemplateVariables(techStack, '/project', 'roocode');

      expect(result.techStack).toEqual(techStack);
      expect(result.projectRoot).toBe('/project');
      expect(result.extension).toBe('roocode');
      expect(result.targetDir).toBe('.roo');
    });

    it('generates variables with kilocode target directory', () => {
      const techStack: TechStack = {
        runtime: 'Python',
        language: 'Python',
        frameworks: ['Django'],
      };

      const result = generateTemplateVariables(techStack, '/project', 'kilocode');

      expect(result.techStack).toEqual(techStack);
      expect(result.projectRoot).toBe('/project');
      expect(result.extension).toBe('kilocode');
      expect(result.targetDir).toBe('.kilo');
    });

    it('includes all tech stack properties', () => {
      const techStack: TechStack = {
        runtime: 'Node.js',
        language: 'TypeScript',
        packageManager: 'npm',
        frameworks: ['React', 'Express'],
        testFramework: 'Vitest',
        buildTool: 'Vite',
      };

      const result = generateTemplateVariables(techStack, '/project', 'roocode');

      expect(result.techStack?.runtime).toBe('Node.js');
      expect(result.techStack?.language).toBe('TypeScript');
      expect(result.techStack?.packageManager).toBe('npm');
      expect(result.techStack?.frameworks).toEqual(['React', 'Express']);
      expect(result.techStack?.testFramework).toBe('Vitest');
      expect(result.techStack?.buildTool).toBe('Vite');
    });
  });

  describe('generatePrimeStub', () => {
    const baseTechStack: TechStack = {
      runtime: 'Node.js',
      language: 'TypeScript',
      packageManager: 'npm',
      frameworks: ['React', 'Express'],
      testFramework: 'Vitest',
      buildTool: 'Vite',
    };

    it('generates ARCHITECTURE stub with tech stack info', () => {
      const result = generatePrimeStub('ARCHITECTURE', baseTechStack);

      expect(result).toContain('# Architecture');
      expect(result).toContain('Node.js');
      expect(result).toContain('React, Express');
      expect(result).toContain('Run `/prime` to analyze');
      expect(result).toContain('*Generated:');
    });

    it('generates CONVENTION stub with language info', () => {
      const result = generatePrimeStub('CONVENTION', baseTechStack);

      expect(result).toContain('# Coding Conventions');
      expect(result).toContain('TypeScript');
      expect(result).toContain('React, Express');
      expect(result).toContain('Run `/prime` to analyze coding conventions');
    });

    it('generates INTEGRATION stub with runtime and package manager', () => {
      const result = generatePrimeStub('INTEGRATION', baseTechStack);

      expect(result).toContain('# External Integrations');
      expect(result).toContain('Runtime: Node.js');
      expect(result).toContain('Package Manager: npm');
      expect(result).toContain('Run `/prime` to analyze external integrations');
    });

    it('generates STACK stub with all stack details', () => {
      const result = generatePrimeStub('STACK', baseTechStack);

      expect(result).toContain('# Technology Stack');
      expect(result).toContain('**Runtime:** Node.js');
      expect(result).toContain('**Language:** TypeScript');
      expect(result).toContain('**Package Manager:** npm');
      expect(result).toContain('**Frameworks:** React, Express');
      expect(result).toContain('**Test Framework:** Vitest');
      expect(result).toContain('**Build Tool:** Vite');
    });

    it('generates STRUCTURE stub with project type', () => {
      const result = generatePrimeStub('STRUCTURE', baseTechStack);

      expect(result).toContain('# Codebase Structure');
      expect(result).toContain('Node.js project');
      expect(result).toContain('React, Express');
      expect(result).toContain('Run `/prime` to analyze codebase structure');
    });

    it('handles missing optional fields gracefully', () => {
      const minimalStack: TechStack = {
        runtime: 'unknown',
        frameworks: [],
      };

      const stackResult = generatePrimeStub('STACK', minimalStack);

      expect(stackResult).toContain('**Language:** Unknown');
      expect(stackResult).toContain('**Package Manager:** Unknown');
      expect(stackResult).not.toContain('**Test Framework:**');
      expect(stackResult).not.toContain('**Build Tool:**');
    });

    it('handles empty frameworks array', () => {
      const stackWithNoFrameworks: TechStack = {
        runtime: 'Node.js',
        language: 'TypeScript',
        frameworks: [],
      };

      const result = generatePrimeStub('ARCHITECTURE', stackWithNoFrameworks);

      expect(result).toContain('Node.js');
      // Empty frameworks should render as empty string
      expect(result).toContain('with .');
    });

    it('includes ISO timestamp in generated output', () => {
      const result = generatePrimeStub('ARCHITECTURE', baseTechStack);

      // Check for ISO 8601 timestamp format
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('getAllPrimeFileNames', () => {
    it('returns all five prime file names', () => {
      const result = getAllPrimeFileNames();

      expect(result).toHaveLength(5);
      expect(result).toContain('ARCHITECTURE');
      expect(result).toContain('CONVENTION');
      expect(result).toContain('INTEGRATION');
      expect(result).toContain('STACK');
      expect(result).toContain('STRUCTURE');
    });

    it('returns names in consistent order', () => {
      const result1 = getAllPrimeFileNames();
      const result2 = getAllPrimeFileNames();

      expect(result1).toEqual(result2);
    });

    it('returns array (not set or other collection)', () => {
      const result = getAllPrimeFileNames();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('parsePromptFrontmatter', () => {
    it('parses complete frontmatter', () => {
      const template = `---
agent: codebase-analyst
model: claude-sonnet-4-20250514
tools:
  - file_search
  - read_file
description: Analyze codebase
output: ARCHITECTURE.md
---

# Prompt content here`;

      const result = parsePromptFrontmatter(template);

      expect(result).not.toBeNull();
      expect(result?.agent).toBe('codebase-analyst');
      expect(result?.model).toBe('claude-sonnet-4-20250514');
      expect(result?.description).toBe('Analyze codebase');
      expect(result?.output).toBe('ARCHITECTURE.md');
      expect(result?.tools).toEqual(['file_search', 'read_file']);
    });

    it('returns null when no frontmatter present', () => {
      const template = '# Just content, no frontmatter';

      const result = parsePromptFrontmatter(template);

      expect(result).toBeNull();
    });

    it('returns null when required fields missing', () => {
      const template = `---
agent: test-agent
---

Content`;

      const result = parsePromptFrontmatter(template);

      // Missing model, description, output
      expect(result).toBeNull();
    });

    it('handles empty tools array', () => {
      const template = `---
agent: test
model: gpt-4
description: Test
output: test.md
tools:
---

Content`;

      const result = parsePromptFrontmatter(template);

      // Current implementation starts with tools: [] and adds items
      // If no tool items follow, it stays empty
      expect(result?.tools).toEqual([]);
    });

    it('handles multiple tools', () => {
      const template = `---
agent: test
model: gpt-4
description: Test
output: test.md
tools:
  - read_file
  - write_file
  - execute_command
---

Content`;

      const result = parsePromptFrontmatter(template);

      expect(result?.tools).toEqual(['read_file', 'write_file', 'execute_command']);
    });

    it('handles frontmatter with extra whitespace', () => {
      const template = `---
agent:   codebase-analyst
model:   claude-sonnet-4-20250514
description:   Analyze the codebase
output:   output.md
tools:
  -   file_search
---

Content`;

      const result = parsePromptFrontmatter(template);

      expect(result?.agent).toBe('codebase-analyst');
      expect(result?.model).toBe('claude-sonnet-4-20250514');
      expect(result?.description).toBe('Analyze the codebase');
      expect(result?.output).toBe('output.md');
      expect(result?.tools).toContain('file_search');
    });

    it('handles frontmatter without closing delimiter at end', () => {
      const template = `---
agent: test
model: gpt-4
description: Test
output: test.md
tools:
  - read_file
---`;

      const result = parsePromptFrontmatter(template);

      expect(result).not.toBeNull();
      expect(result?.agent).toBe('test');
    });

    it('ignores content after frontmatter', () => {
      const template = `---
agent: test
model: gpt-4
description: Test
output: test.md
tools:
---

# This is ignored for frontmatter parsing
model: different-model`;

      const result = parsePromptFrontmatter(template);

      expect(result?.model).toBe('gpt-4');
    });

    it('handles special characters in values', () => {
      const template = `---
agent: test-agent_v2
model: claude-sonnet-4-20250514
description: Test with special chars: & < > "quotes"
output: my-output.md
tools:
---

Content`;

      const result = parsePromptFrontmatter(template);

      expect(result?.description).toBe('Test with special chars: & < > "quotes"');
    });
  });

  // Tests that require file system access
  describe.skip('loadPrimeTemplate - requires file system', () => {
    it('loads template from correct path for roocode', () => {});
    it('loads template from correct path for kilocode', () => {});
    it('throws error when template not found', () => {});
  });
});

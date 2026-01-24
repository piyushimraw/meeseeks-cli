import { describe, it, expect } from 'vitest';
import {
  generateFrontmatter,
  renderTemplate,
  parsePromptFile,
  createPromptFile,
  applyExtensionTweaks,
} from './templateRenderer.js';

describe('templateRenderer', () => {
  describe('generateFrontmatter', () => {
    it('generates basic frontmatter with required fields', () => {
      const meta = {
        agent: 'test-agent',
        model: 'gpt-4',
        tools: ['read_file', 'write_file'],
        description: 'Test description',
      };

      const result = generateFrontmatter(meta);

      expect(result).toContain('agent: test-agent');
      expect(result).toContain('model: gpt-4');
      expect(result).toContain('description: Test description');
      expect(result).toContain('tools:');
      expect(result).toContain('- read_file');
      expect(result).toContain('- write_file');
      expect(result).toMatch(/^---/);
      expect(result).toMatch(/---\n$/);
    });

    it('includes command field when provided', () => {
      const meta = {
        agent: 'test-agent',
        model: 'gpt-4',
        tools: [],
        description: 'Test',
        command: 'prime',
      };

      const result = generateFrontmatter(meta);

      expect(result).toContain('command: prime');
    });

    it('omits command field when not provided', () => {
      const meta = {
        agent: 'test-agent',
        model: 'gpt-4',
        tools: [],
        description: 'Test',
      };

      const result = generateFrontmatter(meta);

      expect(result).not.toContain('command:');
    });

    it('handles empty tools array', () => {
      const meta = {
        agent: 'test-agent',
        model: 'gpt-4',
        tools: [],
        description: 'Test',
      };

      const result = generateFrontmatter(meta);

      expect(result).toContain('tools: []');
    });

    it('does not include generated timestamp per CONTEXT.md requirement', () => {
      const meta = {
        agent: 'test-agent',
        model: 'gpt-4',
        tools: [],
        description: 'Test',
        generated: '2024-01-15T10:00:00Z',
      };

      const result = generateFrontmatter(meta);

      // Should not include generated field to look manually written
      expect(result).not.toContain('generated:');
    });
  });

  describe('renderTemplate', () => {
    it('replaces single variable', () => {
      const template = 'Hello {{name}}!';
      const variables = { name: 'World' };

      const result = renderTemplate(template, variables);

      expect(result).toBe('Hello World!');
    });

    it('replaces multiple variables', () => {
      const template = '{{greeting}} {{name}}! Your age is {{age}}.';
      const variables = {
        greeting: 'Hi',
        name: 'Alice',
        age: '30',
      };

      const result = renderTemplate(template, variables);

      expect(result).toBe('Hi Alice! Your age is 30.');
    });

    it('replaces multiple occurrences of same variable', () => {
      const template = '{{name}} said: Hello {{name}}!';
      const variables = { name: 'Bob' };

      const result = renderTemplate(template, variables);

      expect(result).toBe('Bob said: Hello Bob!');
    });

    it('leaves unreplaced variables when not in variables object', () => {
      const template = 'Hello {{name}}! {{missing}} here.';
      const variables = { name: 'World' };

      const result = renderTemplate(template, variables);

      expect(result).toBe('Hello World! {{missing}} here.');
    });

    it('skips undefined variables', () => {
      const template = 'Hello {{name}}!';
      const variables = { name: undefined };

      const result = renderTemplate(template, variables);

      expect(result).toBe('Hello {{name}}!');
    });

    it('handles empty variables object', () => {
      const template = 'Hello {{name}}!';
      const variables = {};

      const result = renderTemplate(template, variables);

      expect(result).toBe('Hello {{name}}!');
    });

    it('handles template without variables', () => {
      const template = 'Hello World!';
      const variables = { name: 'Test' };

      const result = renderTemplate(template, variables);

      expect(result).toBe('Hello World!');
    });

    it('handles empty string values', () => {
      const template = 'Hello {{name}}!';
      const variables = { name: '' };

      const result = renderTemplate(template, variables);

      expect(result).toBe('Hello !');
    });

    it('handles special regex characters in variable values', () => {
      const template = 'Path: {{path}}';
      const variables = { path: '/usr/local/$HOME' };

      const result = renderTemplate(template, variables);

      expect(result).toBe('Path: /usr/local/$HOME');
    });

    it('handles multiline content in variables', () => {
      const template = 'Content:\n{{content}}';
      const variables = { content: 'Line 1\nLine 2\nLine 3' };

      const result = renderTemplate(template, variables);

      expect(result).toBe('Content:\nLine 1\nLine 2\nLine 3');
    });
  });

  describe('parsePromptFile', () => {
    it('parses frontmatter and content from prompt file', () => {
      const content = `---
agent: test-agent
model: gpt-4
tools:
  - read_file
  - write_file
description: Test description
---

# Prompt Content

This is the prompt body.`;

      const result = parsePromptFile(content);

      expect(result.frontmatter.agent).toBe('test-agent');
      expect(result.frontmatter.model).toBe('gpt-4');
      expect(result.frontmatter.description).toBe('Test description');
      expect(result.frontmatter.tools).toEqual(['read_file', 'write_file']);
      expect(result.content).toContain('# Prompt Content');
      expect(result.content).toContain('This is the prompt body.');
    });

    it('parses frontmatter with command field', () => {
      const content = `---
agent: test-agent
model: gpt-4
tools: []
description: Test
command: prime
---

Content`;

      const result = parsePromptFile(content);

      expect(result.frontmatter.command).toBe('prime');
    });

    it('handles content with no frontmatter', () => {
      const content = '# Just Content\n\nNo frontmatter here.';

      const result = parsePromptFile(content);

      // gray-matter returns empty object for data when no frontmatter
      expect(result.content).toContain('# Just Content');
    });

    it('handles empty content after frontmatter', () => {
      const content = `---
agent: test-agent
model: gpt-4
tools: []
description: Test
---`;

      const result = parsePromptFile(content);

      expect(result.frontmatter.agent).toBe('test-agent');
      expect(result.content.trim()).toBe('');
    });
  });

  describe('createPromptFile', () => {
    it('creates complete prompt file with frontmatter and content', () => {
      const content = '# Test Prompt\n\nThis is the body.';
      const meta = {
        agent: 'test-agent',
        model: 'gpt-4',
        tools: ['read_file'],
        description: 'Test prompt',
      };

      const result = createPromptFile(content, meta);

      expect(result).toMatch(/^---/);
      expect(result).toContain('agent: test-agent');
      expect(result).toContain('model: gpt-4');
      expect(result).toContain('description: Test prompt');
      expect(result).toContain('# Test Prompt');
      expect(result).toContain('This is the body.');
    });

    it('includes command in frontmatter when provided', () => {
      const content = 'Content';
      const meta = {
        agent: 'test-agent',
        model: 'gpt-4',
        tools: [],
        description: 'Test',
        command: 'execute',
      };

      const result = createPromptFile(content, meta);

      expect(result).toContain('command: execute');
    });

    it('omits command when not provided', () => {
      const content = 'Content';
      const meta = {
        agent: 'test-agent',
        model: 'gpt-4',
        tools: [],
        description: 'Test',
      };

      const result = createPromptFile(content, meta);

      expect(result).not.toContain('command:');
    });

    it('trims content whitespace', () => {
      const content = '  \n  Content with whitespace  \n  ';
      const meta = {
        agent: 'test-agent',
        model: 'gpt-4',
        tools: [],
        description: 'Test',
      };

      const result = createPromptFile(content, meta);

      // Should contain trimmed content
      expect(result).toContain('Content with whitespace');
    });
  });

  describe('applyExtensionTweaks', () => {
    it('returns content unchanged for roocode extension', () => {
      const content = 'Test content for RooCode';

      const result = applyExtensionTweaks(content, 'roocode');

      expect(result).toBe('Test content for RooCode');
    });

    it('returns content unchanged for kilocode extension', () => {
      const content = 'Test content for KiloCode';

      const result = applyExtensionTweaks(content, 'kilocode');

      expect(result).toBe('Test content for KiloCode');
    });

    it('handles empty content', () => {
      const content = '';

      const resultRoo = applyExtensionTweaks(content, 'roocode');
      const resultKilo = applyExtensionTweaks(content, 'kilocode');

      expect(resultRoo).toBe('');
      expect(resultKilo).toBe('');
    });

    it('handles multiline content', () => {
      const content = 'Line 1\nLine 2\nLine 3';

      const resultRoo = applyExtensionTweaks(content, 'roocode');
      const resultKilo = applyExtensionTweaks(content, 'kilocode');

      expect(resultRoo).toBe(content);
      expect(resultKilo).toBe(content);
    });
  });
});

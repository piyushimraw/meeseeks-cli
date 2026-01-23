import * as matterModule from 'gray-matter';
import type { MetaPromptExtension } from '../../types/index.js';

// gray-matter exports as default, access it via .default
const matter = (matterModule as any).default || matterModule;

interface PromptFrontmatter {
  agent: string;
  model: string;
  tools: string[];
  description: string;
  command?: string;
  generated?: string;
}

/**
 * Generate YAML frontmatter for a prompt file
 */
export function generateFrontmatter(meta: PromptFrontmatter): string {
  const frontmatter: Record<string, unknown> = {
    agent: meta.agent,
    model: meta.model,
    tools: meta.tools,
    description: meta.description,
  };

  if (meta.command) {
    frontmatter.command = meta.command;
  }

  // Note: We don't add 'generated' timestamp to look manually written per CONTEXT.md
  return matter.stringify('', frontmatter).trim() + '\n';
}

/**
 * Render a template with variable substitution
 * Variables are in {{variableName}} format
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string | undefined>
): string {
  let rendered = template;

  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, value);
    }
  }

  return rendered;
}

/**
 * Parse a prompt file to extract frontmatter and content
 */
export function parsePromptFile(content: string): { frontmatter: PromptFrontmatter; content: string } {
  const parsed = (matter as any)(content);
  return {
    frontmatter: parsed.data as PromptFrontmatter,
    content: parsed.content,
  };
}

/**
 * Create a complete prompt file with frontmatter and content
 */
export function createPromptFile(
  content: string,
  meta: PromptFrontmatter
): string {
  // Use matter.stringify to create properly formatted output
  return matter.stringify(content.trim(), {
    agent: meta.agent,
    model: meta.model,
    tools: meta.tools,
    description: meta.description,
    ...(meta.command ? { command: meta.command } : {}),
  });
}

/**
 * Apply extension-specific transformations to content
 */
export function applyExtensionTweaks(
  content: string,
  extension: MetaPromptExtension
): string {
  // Currently both extensions use same format
  // This function is a hook for future differences
  if (extension === 'kilocode') {
    // KiloCode-specific adjustments if any
    // For now, both use the same format
  }
  return content;
}

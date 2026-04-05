import fs from 'node:fs';
import path from 'node:path';

interface GatheredContext {
  codebaseStructure: string;
  gitHistory: string;
  projectDocs: string;
  figmaContext?: string;
  externalDocs?: string;
}

const DOC_FILES = ['README.md', 'CLAUDE.md', 'AGENTS.md'];

export function gatherCodebaseStructure(projectRoot: string, maxDepth: number = 3): string {
  const lines: string[] = [];

  function walk(dir: string, prefix: string, depth: number) {
    if (depth > maxDepth) return;
    const entries = fs.readdirSync(dir, {withFileTypes: true})
      .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'dist')
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

    for (const entry of entries) {
      lines.push(`${prefix}${entry.name}${entry.isDirectory() ? '/' : ''}`);
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), prefix + '  ', depth + 1);
      }
    }
  }

  walk(projectRoot, '', 0);
  return lines.join('\n');
}

export function gatherProjectDocs(projectRoot: string): string {
  const sections: string[] = [];

  for (const docFile of DOC_FILES) {
    const filePath = path.join(projectRoot, docFile);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      sections.push(`### ${docFile}\n\n${content}`);
    }
  }

  const tasksDir = path.join(projectRoot, 'tasks');
  if (fs.existsSync(tasksDir)) {
    const prdFiles = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json') || f.endsWith('.md'));
    if (prdFiles.length > 0) {
      sections.push(`### Existing PRDs\n\nFound in tasks/: ${prdFiles.join(', ')}`);
    }
  }

  return sections.join('\n\n');
}

export function buildContextPrompt(context: GatheredContext): string {
  const sections: string[] = [];

  if (context.codebaseStructure) {
    sections.push(`## Codebase Structure\n\n\`\`\`\n${context.codebaseStructure}\n\`\`\``);
  }

  if (context.gitHistory) {
    sections.push(`## Git History\n\n${context.gitHistory}`);
  }

  if (context.projectDocs) {
    sections.push(`## Project Documentation\n\n${context.projectDocs}`);
  }

  if (context.figmaContext) {
    sections.push(`## Figma Design Context\n\n${context.figmaContext}`);
  }

  if (context.externalDocs) {
    sections.push(`## External Documentation\n\n${context.externalDocs}`);
  }

  return sections.join('\n\n---\n\n');
}

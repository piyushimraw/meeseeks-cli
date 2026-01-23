import * as fs from 'fs';
import * as path from 'path';
import type { MetaPromptExtension } from '../../types/index.js';
import type { MetaPromptConfig, FileGenerationResult, OverwriteChoice, PrimeMetadata } from './types.js';

/**
 * Ensure target directory exists
 */
export function ensureTargetDir(targetDir: string): void {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
}

/**
 * Get the target directory for an extension
 */
export function getTargetDir(projectRoot: string, extension: MetaPromptExtension): string {
  const dir = extension === 'roocode' ? '.roo' : '.kilocode/workflows';
  return path.join(projectRoot, dir);
}

/**
 * Get the commands subdirectory for an extension
 * RooCode uses a commands/ subdirectory, KiloCode puts files directly in workflows/
 */
export function getCommandsSubdir(extension: MetaPromptExtension): string {
  return extension === 'roocode' ? 'commands' : '';
}

/**
 * Get the output file extension for an extension
 * RooCode uses .md, KiloCode uses .prompt.md
 */
export function getOutputExtension(extension: MetaPromptExtension): string {
  return extension === 'roocode' ? '.md' : '.prompt.md';
}

/**
 * Check if a file exists and return its content if it does
 */
export function checkExistingFile(filePath: string): { exists: boolean; content?: string } {
  if (fs.existsSync(filePath)) {
    return {
      exists: true,
      content: fs.readFileSync(filePath, 'utf-8'),
    };
  }
  return { exists: false };
}

/**
 * Write a file with proper directory creation
 */
export function writeFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Generate a file with overwrite handling
 * Returns the result of the generation attempt
 */
export async function generateFile(
  filePath: string,
  content: string,
  overwriteChoice?: OverwriteChoice
): Promise<FileGenerationResult> {
  try {
    const existing = checkExistingFile(filePath);

    if (existing.exists) {
      if (overwriteChoice === 'skip') {
        return { path: filePath, status: 'skipped' };
      }

      if (overwriteChoice === 'overwrite' || !overwriteChoice) {
        writeFile(filePath, content);
        return { path: filePath, status: 'updated' };
      }

      // 'diff' case - handled by caller showing diff first
      return { path: filePath, status: 'skipped' };
    }

    writeFile(filePath, content);
    return { path: filePath, status: 'created' };
  } catch (error) {
    return {
      path: filePath,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Load prime metadata from target directory
 */
export function loadPrimeMetadata(targetDir: string): PrimeMetadata | null {
  const metaPath = path.join(targetDir, '.prime-meta.json');
  try {
    if (fs.existsSync(metaPath)) {
      return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Save prime metadata to target directory
 */
export function savePrimeMetadata(targetDir: string, metadata: PrimeMetadata): void {
  const metaPath = path.join(targetDir, '.prime-meta.json');
  writeFile(metaPath, JSON.stringify(metadata, null, 2));
}

/**
 * Generate INDEX.md listing all generated files
 */
export function generateIndexMd(targetDir: string, files: string[]): string {
  const primeFiles = files.filter(f =>
    ['ARCHITECTURE.md', 'CONVENTION.md', 'INTEGRATION.md', 'STACK.md', 'STRUCTURE.md'].some(
      name => f.endsWith(name)
    )
  );
  const commandFiles = files.filter(f => f.includes('/commands/') || f.includes('\\commands\\'));
  const planFiles = files.filter(f => f.includes('/plans/') || f.includes('\\plans\\'));

  let content = `# Meta Prompting Files

This directory contains AI-assisted development workflow configuration.

## Prime Files (Codebase Context)

`;

  for (const file of primeFiles) {
    const name = path.basename(file, '.md');
    content += `- [${name}](${path.relative(targetDir, file).replace(/\\/g, '/')})\n`;
  }

  if (commandFiles.length > 0) {
    content += `\n## Command Prompts\n\n`;
    for (const file of commandFiles) {
      const name = path.basename(file, '.prompt.md');
      content += `- [${name}](${path.relative(targetDir, file).replace(/\\/g, '/')})\n`;
    }
  }

  if (planFiles.length > 0) {
    content += `\n## Plans\n\n`;
    for (const file of planFiles) {
      const name = path.basename(file);
      content += `- [${name}](${path.relative(targetDir, file).replace(/\\/g, '/')})\n`;
    }
  }

  content += `\n---
*Run \`/prime\` to regenerate codebase context files.*
`;

  return content;
}

/**
 * Get list of all generated files in target directory
 */
export function listGeneratedFiles(targetDir: string): string[] {
  const files: string[] = [];

  function walkDir(dir: string) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.prompt.md')) {
        files.push(fullPath);
      }
    }
  }

  walkDir(targetDir);
  return files;
}

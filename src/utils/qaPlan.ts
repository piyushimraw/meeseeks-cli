import * as fs from 'fs';
import * as path from 'path';

const PLANS_DIR = 'plans/qa';

export interface QAPlanMetadata {
  filename: string;
  branchInfo: string;
  model: string | null;
  knowledgeBase: string | null;
  generatedAt: string;
}

/**
 * Sanitize filename - remove special characters, replace spaces with hyphens
 */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100); // Limit length
}

/**
 * Ensure plans/qa directory exists
 */
function ensurePlansDir(): string {
  const plansDir = path.join(process.cwd(), PLANS_DIR);
  if (!fs.existsSync(plansDir)) {
    fs.mkdirSync(plansDir, {recursive: true});
  }
  return plansDir;
}

/**
 * Generate markdown content with metadata header
 */
function formatQAPlanMarkdown(content: string, metadata: QAPlanMetadata): string {
  const lines = [
    `# QA Plan: ${metadata.filename}`,
    '',
    `**Generated**: ${new Date(metadata.generatedAt).toLocaleString()}`,
    `**Branch**: ${metadata.branchInfo}`,
    `**Model**: ${metadata.model || 'Unknown'}`,
    `**Knowledge Base**: ${metadata.knowledgeBase || 'None'}`,
    '',
    '---',
    '',
    content,
  ];
  return lines.join('\n');
}

/**
 * Save QA plan to markdown file
 * Returns the full path on success, null on error
 */
export function saveQAPlan(
  content: string,
  filename: string,
  metadata: Omit<QAPlanMetadata, 'filename' | 'generatedAt'>
): {success: boolean; path?: string; error?: string} {
  try {
    const sanitized = sanitizeFilename(filename);
    if (!sanitized) {
      return {success: false, error: 'Invalid filename'};
    }

    const plansDir = ensurePlansDir();
    const filePath = path.join(plansDir, `${sanitized}.md`);

    const fullMetadata: QAPlanMetadata = {
      ...metadata,
      filename: sanitized,
      generatedAt: new Date().toISOString(),
    };

    const markdown = formatQAPlanMarkdown(content, fullMetadata);
    fs.writeFileSync(filePath, markdown, 'utf-8');

    return {success: true, path: filePath};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save file',
    };
  }
}

/**
 * Generate a default filename from branch info
 */
export function generateDefaultFilename(branchInfo: string): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const branch = branchInfo.split(' ')[0] || 'qa-plan';
  return sanitizeFilename(`${branch}-${date}`);
}

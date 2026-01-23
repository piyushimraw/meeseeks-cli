import * as fs from 'fs';
import * as path from 'path';

/**
 * Information gathered during plan creation
 */
export interface PlanContext {
  ticket?: {
    key: string;
    summary: string;
    description: string;
    acceptanceCriteria?: string;
    comments?: string[];
  };
  description?: string;
  confluencePages?: Array<{ title: string; url: string; content: string }>;
  externalDocs?: Array<{ url: string; content: string }>;
  codebaseContext?: {
    architecture?: string;
    conventions?: string;
    integration?: string;
    stack?: string;
    structure?: string;
  };
  relatedCode?: Array<{ file: string; relevance: string }>;
}

/**
 * Plan file metadata
 */
export interface PlanMetadata {
  ticket?: string;
  created: string;
  status: 'draft' | 'approved' | 'in-progress' | 'complete';
  type: 'implementation' | 'acceptance';
}

/**
 * Ensure ./plans/ directory exists
 */
export function ensurePlansDir(projectRoot: string = process.cwd()): string {
  const plansDir = path.join(projectRoot, 'plans');
  if (!fs.existsSync(plansDir)) {
    fs.mkdirSync(plansDir, { recursive: true });
  }
  return plansDir;
}

/**
 * Generate filename from ticket key or description slug
 * Format: {ticket-key-lowercase}-{slug}-{type}.md
 * Example: eng-123-user-auth-impl.md
 */
export function generatePlanFilename(
  ticketKeyOrDescription: string,
  planType: 'impl' | 'acceptance' | 'context',
  maxSlugLength: number = 30
): string {
  // Detect if input is a ticket key (e.g., ENG-123, PROJ-456)
  const ticketPattern = /^[A-Z]+-\d+$/i;
  const isTicket = ticketPattern.test(ticketKeyOrDescription.trim());

  if (isTicket) {
    // Ticket key format: lowercase-ticket-key-type.md
    const ticketKey = ticketKeyOrDescription.toLowerCase().trim();
    return `${ticketKey}-${planType}.md`;
  }

  // Description format: slug-type.md
  // Slugify: lowercase, replace spaces/special chars with hyphens, trim
  let slug = ticketKeyOrDescription
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .slice(0, maxSlugLength); // Limit length

  return `${slug}-${planType}.md`;
}

/**
 * Build context file content from gathered information
 */
export function buildPlanContext(context: PlanContext): string {
  let content = '# Plan Context\n\n';
  content += `*Generated: ${new Date().toISOString()}*\n\n`;

  // Ticket information
  if (context.ticket) {
    content += '## JIRA Ticket\n\n';
    content += `**Key**: ${context.ticket.key}\n`;
    content += `**Summary**: ${context.ticket.summary}\n\n`;

    if (context.ticket.description) {
      content += '### Description\n\n';
      content += context.ticket.description + '\n\n';
    }

    if (context.ticket.acceptanceCriteria) {
      content += '### Acceptance Criteria\n\n';
      content += context.ticket.acceptanceCriteria + '\n\n';
    }

    if (context.ticket.comments && context.ticket.comments.length > 0) {
      content += '### Comments\n\n';
      context.ticket.comments.forEach((comment, idx) => {
        content += `**Comment ${idx + 1}**:\n${comment}\n\n`;
      });
    }
  }

  // Manual description
  if (context.description && !context.ticket) {
    content += '## Description\n\n';
    content += context.description + '\n\n';
  }

  // Confluence pages
  if (context.confluencePages && context.confluencePages.length > 0) {
    content += '## Confluence Documentation\n\n';
    context.confluencePages.forEach((page) => {
      content += `### ${page.title}\n`;
      content += `*URL*: ${page.url}\n\n`;
      content += page.content + '\n\n';
    });
  }

  // External documentation
  if (context.externalDocs && context.externalDocs.length > 0) {
    content += '## External Documentation\n\n';
    context.externalDocs.forEach((doc) => {
      content += `### ${doc.url}\n\n`;
      content += doc.content + '\n\n';
    });
  }

  // Codebase context
  if (context.codebaseContext) {
    content += '## Codebase Context\n\n';

    if (context.codebaseContext.architecture) {
      content += '### Architecture\n\n';
      content += context.codebaseContext.architecture + '\n\n';
    }

    if (context.codebaseContext.stack) {
      content += '### Tech Stack\n\n';
      content += context.codebaseContext.stack + '\n\n';
    }

    if (context.codebaseContext.conventions) {
      content += '### Conventions\n\n';
      content += context.codebaseContext.conventions + '\n\n';
    }

    if (context.codebaseContext.structure) {
      content += '### Structure\n\n';
      content += context.codebaseContext.structure + '\n\n';
    }

    if (context.codebaseContext.integration) {
      content += '### Integrations\n\n';
      content += context.codebaseContext.integration + '\n\n';
    }
  }

  // Related code
  if (context.relatedCode && context.relatedCode.length > 0) {
    content += '## Related Code\n\n';
    context.relatedCode.forEach((code) => {
      content += `### ${code.file}\n`;
      content += `*Relevance*: ${code.relevance}\n\n`;
    });
  }

  return content;
}

/**
 * Format context.md content for plan generation
 */
export function formatContextFile(context: PlanContext): string {
  return buildPlanContext(context);
}

/**
 * Save plan file to ./plans/ directory
 */
export function savePlanFile(
  content: string,
  filename: string,
  projectRoot: string = process.cwd()
): string {
  const plansDir = ensurePlansDir(projectRoot);
  const filePath = path.join(plansDir, filename);

  fs.writeFileSync(filePath, content, 'utf-8');

  return filePath;
}

/**
 * Save context file alongside plan
 */
export function saveContextFile(
  context: PlanContext,
  planFilename: string,
  projectRoot: string = process.cwd()
): string {
  const contextContent = formatContextFile(context);
  const contextFilename = planFilename.replace(/-(impl|acceptance)\.md$/, '-context.md');

  return savePlanFile(contextContent, contextFilename, projectRoot);
}

/**
 * Check if a plan file exists
 */
export function planExists(
  filename: string,
  projectRoot: string = process.cwd()
): boolean {
  const plansDir = path.join(projectRoot, 'plans');
  const filePath = path.join(plansDir, filename);
  return fs.existsSync(filePath);
}

/**
 * Read plan file content
 */
export function readPlan(
  filename: string,
  projectRoot: string = process.cwd()
): string | null {
  const plansDir = path.join(projectRoot, 'plans');
  const filePath = path.join(plansDir, filename);

  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * List all plan files in ./plans/ directory
 */
export function listPlans(projectRoot: string = process.cwd()): string[] {
  const plansDir = path.join(projectRoot, 'plans');

  if (!fs.existsSync(plansDir)) {
    return [];
  }

  try {
    const files = fs.readdirSync(plansDir);
    return files
      .filter((file) => file.endsWith('.md'))
      .sort((a, b) => {
        // Sort by modified time, newest first
        const statA = fs.statSync(path.join(plansDir, a));
        const statB = fs.statSync(path.join(plansDir, b));
        return statB.mtime.getTime() - statA.mtime.getTime();
      });
  } catch {
    return [];
  }
}

/**
 * Get plan metadata from file
 * Parses frontmatter or initial metadata block
 */
export function getPlanMetadata(
  filename: string,
  projectRoot: string = process.cwd()
): PlanMetadata | null {
  const content = readPlan(filename, projectRoot);
  if (!content) return null;

  // Try to parse metadata from markdown
  // Look for patterns like:
  // **Ticket**: ENG-123
  // **Created**: 2024-01-15
  // **Status**: Draft

  const metadata: Partial<PlanMetadata> = {
    type: filename.includes('-impl.md') ? 'implementation' : 'acceptance',
  };

  // Extract ticket
  const ticketMatch = content.match(/\*\*Ticket\*\*:\s*([A-Z]+-\d+)/i);
  if (ticketMatch) {
    metadata.ticket = ticketMatch[1];
  }

  // Extract created date
  const createdMatch = content.match(/\*\*Created\*\*:\s*([^\n]+)/i);
  if (createdMatch) {
    metadata.created = createdMatch[1].trim();
  }

  // Extract status
  const statusMatch = content.match(/\*\*Status\*\*:\s*([^\n]+)/i);
  if (statusMatch) {
    const status = statusMatch[1].trim().toLowerCase();
    if (['draft', 'approved', 'in-progress', 'complete'].includes(status)) {
      metadata.status = status as PlanMetadata['status'];
    }
  }

  // Set defaults if not found
  if (!metadata.created) {
    // Use file creation time
    const filePath = path.join(projectRoot, 'plans', filename);
    const stats = fs.statSync(filePath);
    metadata.created = stats.birthtime.toISOString();
  }

  if (!metadata.status) {
    metadata.status = 'draft';
  }

  return metadata as PlanMetadata;
}

/**
 * Find plans by ticket key
 */
export function findPlansByTicket(
  ticketKey: string,
  projectRoot: string = process.cwd()
): string[] {
  const allPlans = listPlans(projectRoot);
  const normalizedKey = ticketKey.toLowerCase();

  return allPlans.filter((plan) => plan.toLowerCase().startsWith(normalizedKey));
}

/**
 * Get plan type from filename
 */
export function getPlanType(filename: string): 'implementation' | 'acceptance' | 'context' | 'unknown' {
  if (filename.endsWith('-impl.md')) return 'implementation';
  if (filename.endsWith('-acceptance.md')) return 'acceptance';
  if (filename.endsWith('-context.md')) return 'context';
  return 'unknown';
}

/**
 * Generate plan filename variations for a ticket/description
 */
export function getPlanFilenames(ticketKeyOrDescription: string): {
  impl: string;
  acceptance: string;
  context: string;
} {
  return {
    impl: generatePlanFilename(ticketKeyOrDescription, 'impl'),
    acceptance: generatePlanFilename(ticketKeyOrDescription, 'acceptance'),
    context: generatePlanFilename(ticketKeyOrDescription, 'context'),
  };
}

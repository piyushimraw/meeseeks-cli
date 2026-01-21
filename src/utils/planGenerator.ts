import * as fs from 'fs';
import * as path from 'path';
import slugifyLib from 'slugify';
import type { PlanMetadata, PlanType, ExistingPlans } from '../types/index.js';

const slugify = slugifyLib as (text: string, options?: {
  replacement?: string;
  remove?: RegExp;
  lower?: boolean;
  strict?: boolean;
  locale?: string;
  trim?: boolean;
}) => string;

const PLANS_DIR = 'plans';

/**
 * Ensure plans directory exists
 */
function ensurePlansDir(): string {
  const plansDir = path.join(process.cwd(), PLANS_DIR);
  if (!fs.existsSync(plansDir)) {
    fs.mkdirSync(plansDir, { recursive: true });
  }
  return plansDir;
}

/**
 * Generate filename for a plan
 * Format: ticketkey-slug-summary-plantype.md (e.g., proj-123-add-user-auth-impl.md)
 */
export function generatePlanFilename(
  ticketKey: string,
  ticketSummary: string,
  planType: PlanType
): string {
  const slug = slugify(ticketSummary, { lower: true, strict: true }).slice(0, 30);
  return `${ticketKey.toLowerCase()}-${slug}-${planType}.md`;
}

/**
 * Format plan content with metadata header
 */
function formatPlanMarkdown(content: string, meta: PlanMetadata): string {
  const typeLabel = meta.planType === 'impl' ? 'Implementation' : 'Verification';
  return `# ${typeLabel} Plan: ${meta.ticketKey}

**Ticket:** ${meta.ticketKey} - ${meta.ticketSummary}
**Generated:** ${new Date(meta.generatedAt).toLocaleString()}
**Model:** ${meta.model}
${meta.kbUsed ? `**Knowledge Base:** ${meta.kbUsed}` : ''}

---

${content}
`;
}

/**
 * Save a plan to the plans directory
 */
export function savePlan(
  content: string,
  meta: PlanMetadata
): { success: boolean; path?: string; error?: string } {
  try {
    const plansDir = ensurePlansDir();
    const filename = generatePlanFilename(meta.ticketKey, meta.ticketSummary, meta.planType);
    const filePath = path.join(plansDir, filename);

    const markdown = formatPlanMarkdown(content, meta);
    fs.writeFileSync(filePath, markdown, 'utf-8');

    return { success: true, path: filePath };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save plan',
    };
  }
}

/**
 * Check if a ticket has existing plans
 */
export function hasExistingPlans(ticketKey: string): ExistingPlans {
  const plansDir = path.join(process.cwd(), PLANS_DIR);

  if (!fs.existsSync(plansDir)) {
    return { impl: false, verify: false };
  }

  const files = fs.readdirSync(plansDir);
  const ticketPrefix = ticketKey.toLowerCase();

  const implFile = files.find(f => f.startsWith(ticketPrefix) && f.endsWith('-impl.md'));
  const verifyFile = files.find(f => f.startsWith(ticketPrefix) && f.endsWith('-verify.md'));

  return {
    impl: !!implFile,
    verify: !!verifyFile,
    implPath: implFile ? path.join(plansDir, implFile) : undefined,
    verifyPath: verifyFile ? path.join(plansDir, verifyFile) : undefined,
  };
}

/**
 * Get all plans for a ticket (content)
 */
export function getPlanContent(filePath: string): string | null {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch {
    // Ignore errors
  }
  return null;
}

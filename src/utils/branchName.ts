import { runGit } from './git.js';
import slugifyLib from 'slugify';

const slugify = (slugifyLib as any).default || slugifyLib;

const MAX_BRANCH_LENGTH = 50;

/**
 * Generate a branch name from ticket key and summary
 * Format: ticket-key-slug-title (lowercase)
 * Max 50 characters total
 */
export function generateBranchName(ticketKey: string, summary: string): string {
  const slug = slugify(summary, {
    lower: true,
    strict: true,
    replacement: '-',
  });

  const prefix = ticketKey.toLowerCase();
  const maxSlugLength = MAX_BRANCH_LENGTH - prefix.length - 1; // -1 for separator

  const truncatedSlug = slug.substring(0, maxSlugLength);
  // Remove trailing hyphen if truncation created one
  const cleanSlug = truncatedSlug.replace(/-+$/, '');

  return `${prefix}-${cleanSlug}`;
}

/**
 * Validate branch name against git rules
 */
export function isValidBranchName(name: string): boolean {
  const result = runGit(['check-ref-format', '--branch', name]);
  return result.success;
}

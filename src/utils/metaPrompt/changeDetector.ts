import { simpleGit, SimpleGit } from 'simple-git';
import path from 'path';
import type { PrimeFile } from './types.js';

export interface ChangeDetectionResult {
  hasChanges: boolean;
  changedFiles: string[];
  affectedPrimeFiles: PrimeFile['name'][];
  currentCommit: string;
  previousCommit?: string;
}

/**
 * Get the current HEAD commit hash
 */
export async function getCurrentCommit(projectRoot: string): Promise<string> {
  const git = simpleGit(projectRoot);
  const log = await git.log({ maxCount: 1 });
  return log.latest?.hash || '';
}

/**
 * Get files changed since a specific commit
 */
export async function getChangedFilesSince(
  projectRoot: string,
  sinceCommit: string
): Promise<string[]> {
  const git = simpleGit(projectRoot);

  try {
    // Get diff summary between the commit and HEAD
    const diffSummary = await git.diffSummary([sinceCommit, 'HEAD']);

    // Extract file paths from the diff
    const changedFiles = diffSummary.files.map(file => file.file);

    return changedFiles;
  } catch (error) {
    // If commit doesn't exist or diff fails, return empty array
    console.error('Error getting changed files:', error);
    return [];
  }
}

/**
 * Map changed files to affected prime file types
 *
 * This determines which prime files need regeneration based on what changed:
 * - Source code changes -> ARCHITECTURE, CONVENTION, STRUCTURE
 * - Config changes -> STACK, INTEGRATION
 * - Test changes -> CONVENTION, STRUCTURE
 * - Documentation changes -> No prime file updates needed
 */
export function getAffectedPrimeFiles(changedFiles: string[]): PrimeFile['name'][] {
  const affectedSet = new Set<PrimeFile['name']>();

  for (const file of changedFiles) {
    const normalized = file.toLowerCase();

    // Package manifest changes affect STACK and INTEGRATION
    if (
      normalized.includes('package.json') ||
      normalized.includes('requirements.txt') ||
      normalized.includes('pyproject.toml') ||
      normalized.includes('cargo.toml') ||
      normalized.includes('go.mod')
    ) {
      affectedSet.add('STACK');
      affectedSet.add('INTEGRATION');
    }

    // Config file changes affect INTEGRATION
    if (
      normalized.includes('.env') ||
      normalized.includes('config') ||
      normalized.includes('.yml') ||
      normalized.includes('.yaml') ||
      normalized.includes('docker')
    ) {
      affectedSet.add('INTEGRATION');
    }

    // Source code changes affect ARCHITECTURE, CONVENTION, STRUCTURE
    if (
      normalized.endsWith('.ts') ||
      normalized.endsWith('.tsx') ||
      normalized.endsWith('.js') ||
      normalized.endsWith('.jsx') ||
      normalized.endsWith('.py') ||
      normalized.endsWith('.rs') ||
      normalized.endsWith('.go')
    ) {
      affectedSet.add('ARCHITECTURE');
      affectedSet.add('CONVENTION');
      affectedSet.add('STRUCTURE');
    }

    // Test file changes affect CONVENTION (test patterns)
    if (
      normalized.includes('.test.') ||
      normalized.includes('.spec.') ||
      normalized.includes('_test.') ||
      normalized.includes('/tests/') ||
      normalized.includes('/test/')
    ) {
      affectedSet.add('CONVENTION');
    }

    // Directory structure changes affect STRUCTURE
    if (normalized.includes('/') && !normalized.includes('.')) {
      // New directories or restructuring
      affectedSet.add('STRUCTURE');
    }
  }

  // If nothing specific matched but files changed, regenerate all
  if (affectedSet.size === 0 && changedFiles.length > 0) {
    return ['ARCHITECTURE', 'CONVENTION', 'INTEGRATION', 'STACK', 'STRUCTURE'];
  }

  return Array.from(affectedSet);
}

/**
 * Detect changes and determine which prime files need regeneration
 */
export async function detectChanges(
  projectRoot: string,
  lastPrimeCommit?: string
): Promise<ChangeDetectionResult> {
  const currentCommit = await getCurrentCommit(projectRoot);

  // If no previous commit recorded, full regeneration needed
  if (!lastPrimeCommit) {
    return {
      hasChanges: true,
      changedFiles: [],
      affectedPrimeFiles: ['ARCHITECTURE', 'CONVENTION', 'INTEGRATION', 'STACK', 'STRUCTURE'],
      currentCommit,
    };
  }

  // Get changed files since last prime run
  const changedFiles = await getChangedFilesSince(projectRoot, lastPrimeCommit);

  // Determine affected prime files
  const affectedPrimeFiles = getAffectedPrimeFiles(changedFiles);

  return {
    hasChanges: changedFiles.length > 0,
    changedFiles,
    affectedPrimeFiles,
    currentCommit,
    previousCommit: lastPrimeCommit,
  };
}

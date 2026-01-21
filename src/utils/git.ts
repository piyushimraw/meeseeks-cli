import {spawnSync} from 'child_process';

export interface GitFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked';
  staged: boolean;
  oldPath?: string;
}

export interface GitStatus {
  isRepo: boolean;
  repoRoot?: string;
  currentBranch?: string;
  changes: GitFileChange[];
  error?: string;
}

export interface FileDiff {
  path: string;
  content: string;
  isBinary: boolean;
  truncated: boolean;
}

export function runGit(args: string[]): {stdout: string; stderr: string; success: boolean} {
  const result = spawnSync('git', args, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    success: result.status === 0,
  };
}

export function isGitInstalled(): boolean {
  const result = runGit(['--version']);
  return result.success;
}

export function isGitRepository(): boolean {
  const result = runGit(['rev-parse', '--is-inside-work-tree']);
  return result.success && result.stdout.trim() === 'true';
}

export function getGitRepoRoot(): string | null {
  const result = runGit(['rev-parse', '--show-toplevel']);
  return result.success ? result.stdout.trim() : null;
}

export function getCurrentBranch(): string | null {
  const result = runGit(['branch', '--show-current']);
  if (result.success && result.stdout.trim()) {
    return result.stdout.trim();
  }

  // Handle detached HEAD state
  const headResult = runGit(['rev-parse', '--short', 'HEAD']);
  if (headResult.success) {
    return `(HEAD detached at ${headResult.stdout.trim()})`;
  }

  return null;
}

function parseStatusCode(code: string): 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked' {
  switch (code) {
    case 'A':
      return 'added';
    case 'M':
      return 'modified';
    case 'D':
      return 'deleted';
    case 'R':
      return 'renamed';
    case '?':
      return 'untracked';
    default:
      return 'modified';
  }
}

export function getGitStatus(): GitStatus {
  if (!isGitInstalled()) {
    return {
      isRepo: false,
      changes: [],
      error: 'Git is not installed or not in PATH',
    };
  }

  if (!isGitRepository()) {
    return {
      isRepo: false,
      changes: [],
    };
  }

  const repoRoot = getGitRepoRoot();
  const currentBranch = getCurrentBranch();
  const changes: GitFileChange[] = [];

  // Get porcelain status for parsing
  const result = runGit(['status', '--porcelain=v1', '-uall']);

  if (!result.success) {
    return {
      isRepo: true,
      repoRoot: repoRoot || undefined,
      currentBranch: currentBranch || undefined,
      changes: [],
      error: result.stderr || 'Failed to get git status',
    };
  }

  const lines = result.stdout.split('\n').filter((line) => line.length > 0);

  for (const line of lines) {
    const stagedCode = line[0];
    const unstagedCode = line[1];
    let filePath = line.slice(3);
    let oldPath: string | undefined;

    // Handle renamed files (format: "R  old -> new" or "RM old -> new")
    if (filePath.includes(' -> ')) {
      const parts = filePath.split(' -> ');
      oldPath = parts[0];
      filePath = parts[1];
    }

    // Staged changes (index column is not space or ?)
    if (stagedCode !== ' ' && stagedCode !== '?') {
      changes.push({
        path: filePath,
        status: parseStatusCode(stagedCode),
        staged: true,
        oldPath,
      });
    }

    // Unstaged changes (worktree column is not space)
    if (unstagedCode !== ' ' && unstagedCode !== '?') {
      changes.push({
        path: filePath,
        status: parseStatusCode(unstagedCode),
        staged: false,
        oldPath,
      });
    }

    // Untracked files
    if (stagedCode === '?' && unstagedCode === '?') {
      changes.push({
        path: filePath,
        status: 'untracked',
        staged: false,
      });
    }
  }

  return {
    isRepo: true,
    repoRoot: repoRoot || undefined,
    currentBranch: currentBranch || undefined,
    changes,
  };
}

const MAX_DIFF_LINES = 500;

export function getFileDiff(path: string, staged: boolean): FileDiff {
  const args = staged
    ? ['diff', '--cached', '--', path]
    : ['diff', '--', path];

  const result = runGit(args);

  // Check for binary files
  if (result.stdout.includes('Binary files')) {
    return {
      path,
      content: '[Binary file - diff not available]',
      isBinary: true,
      truncated: false,
    };
  }

  let content = result.stdout;
  let truncated = false;

  const lines = content.split('\n');
  if (lines.length > MAX_DIFF_LINES) {
    content = lines.slice(0, MAX_DIFF_LINES).join('\n');
    content += `\n\n... ${lines.length - MAX_DIFF_LINES} more lines truncated`;
    truncated = true;
  }

  return {
    path,
    content: content || '(no changes)',
    isBinary: false,
    truncated,
  };
}

export function getUntrackedFileContent(path: string): FileDiff {
  const result = runGit(['show', `:${path}`]);

  // For untracked files, git show won't work, so read the file
  if (!result.success) {
    // Try to show the file content as "new file" diff format
    const catResult = spawnSync('cat', [path], {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    if (catResult.status === 0 && catResult.stdout) {
      const lines = catResult.stdout.split('\n');
      let content = `diff --git a/${path} b/${path}\nnew file\n--- /dev/null\n+++ b/${path}\n`;

      let truncated = false;
      const displayLines = lines.slice(0, MAX_DIFF_LINES);
      content += displayLines.map((line) => `+${line}`).join('\n');

      if (lines.length > MAX_DIFF_LINES) {
        content += `\n\n... ${lines.length - MAX_DIFF_LINES} more lines truncated`;
        truncated = true;
      }

      return {
        path,
        content,
        isBinary: false,
        truncated,
      };
    }

    return {
      path,
      content: '(unable to read file)',
      isBinary: false,
      truncated: false,
    };
  }

  return {
    path,
    content: result.stdout,
    isBinary: false,
    truncated: false,
  };
}

export function getDefaultBranch(): string {
  // Try to get the default branch from remote
  const remoteResult = runGit(['remote', 'show', 'origin']);
  if (remoteResult.success) {
    const match = remoteResult.stdout.match(/HEAD branch:\s*(\S+)/);
    if (match) {
      return match[1];
    }
  }

  // Fallback: check if main or master exists
  const mainResult = runGit(['rev-parse', '--verify', 'main']);
  if (mainResult.success) {
    return 'main';
  }

  const masterResult = runGit(['rev-parse', '--verify', 'master']);
  if (masterResult.success) {
    return 'master';
  }

  return 'main';
}

export function getLocalBranches(): string[] {
  const result = runGit(['branch', '--list', '--format=%(refname:short)']);
  if (result.success) {
    return result.stdout.split('\n').filter(b => b.trim().length > 0);
  }
  return [];
}

export function getUncommittedDiff(): string {
  const stagedResult = runGit(['diff', '--cached']);
  const unstagedResult = runGit(['diff']);

  let diff = '';
  if (stagedResult.stdout) {
    diff += '# Staged Changes\n' + stagedResult.stdout;
  }
  if (unstagedResult.stdout) {
    if (diff) diff += '\n\n';
    diff += '# Unstaged Changes\n' + unstagedResult.stdout;
  }

  return diff || '(no changes)';
}

export function getBranchDiff(baseBranch?: string): string {
  if (!isGitRepository()) {
    return '';
  }

  const base = baseBranch || getDefaultBranch();
  const currentBranch = getCurrentBranch();

  // If on the base branch, get staged/unstaged changes
  if (currentBranch === base || !currentBranch) {
    const stagedResult = runGit(['diff', '--cached']);
    const unstagedResult = runGit(['diff']);

    let diff = '';
    if (stagedResult.stdout) {
      diff += '# Staged Changes\n' + stagedResult.stdout;
    }
    if (unstagedResult.stdout) {
      if (diff) diff += '\n\n';
      diff += '# Unstaged Changes\n' + unstagedResult.stdout;
    }

    return diff || '(no changes)';
  }

  // Get diff between current branch and base branch
  const result = runGit(['diff', `${base}...HEAD`]);

  if (!result.success) {
    // Try without the three-dot notation
    const fallbackResult = runGit(['diff', base, 'HEAD']);
    if (fallbackResult.success) {
      return fallbackResult.stdout || '(no changes)';
    }
    return '(unable to get diff)';
  }

  return result.stdout || '(no changes)';
}

/**
 * Check if there are uncommitted changes in the repository
 */
export function hasUncommittedChanges(): boolean {
  const result = runGit(['status', '--porcelain']);
  return result.success && result.stdout.trim().length > 0;
}

/**
 * Stash current changes with a message
 */
export function stashPush(message: string): { success: boolean; error?: string } {
  const result = runGit(['stash', 'push', '-m', message]);
  if (!result.success) {
    return { success: false, error: result.stderr || 'Failed to stash changes' };
  }
  return { success: true };
}

/**
 * Pop the most recent stash
 */
export function stashPop(): { success: boolean; error?: string } {
  const result = runGit(['stash', 'pop']);
  if (!result.success) {
    return { success: false, error: result.stderr || 'Failed to pop stash' };
  }
  return { success: true };
}

/**
 * Check if a branch exists locally
 */
export function branchExists(name: string): boolean {
  const result = runGit(['show-ref', '--verify', '--quiet', `refs/heads/${name}`]);
  return result.success;
}

/**
 * Create a new branch and checkout to it
 */
export function createBranch(name: string, baseBranch?: string): { success: boolean; error?: string } {
  const args = ['checkout', '-b', name];
  if (baseBranch) {
    args.push(baseBranch);
  }
  const result = runGit(args);
  if (!result.success) {
    return { success: false, error: result.stderr || 'Failed to create branch' };
  }
  return { success: true };
}

/**
 * Checkout an existing branch
 */
export function checkoutBranch(name: string): { success: boolean; error?: string } {
  const result = runGit(['checkout', name]);
  if (!result.success) {
    return { success: false, error: result.stderr || 'Failed to checkout branch' };
  }
  return { success: true };
}

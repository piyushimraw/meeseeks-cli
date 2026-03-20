import {spawn, spawnSync} from 'node:child_process';
import type {ClaudeCliResult} from '../types/superRalph.js';

export interface ClaudeCliOptions {
  prompt: string;
  outputJson?: boolean;
  maxTurns?: number;
  cwd?: string;
}

export function buildClaudeArgs(options: ClaudeCliOptions): string[] {
  const args = ['-p', options.prompt, '--permission-mode', 'acceptEdits'];

  if (options.outputJson) {
    args.push('--output-format', 'json');
  }

  if (options.maxTurns) {
    args.push('--max-turns', String(options.maxTurns));
  }

  return args;
}

export function parseClaudeOutput(exitCode: number, stdout: string, stderr: string): ClaudeCliResult {
  if (exitCode === 0) {
    return {
      success: true,
      output: stdout,
      exitCode,
    };
  }

  return {
    success: false,
    output: stdout,
    exitCode,
    error: stderr,
  };
}

export function isClaudeInstalled(): boolean {
  try {
    const result = spawnSync('claude', ['--version'], {
      encoding: 'utf-8',
      timeout: 5000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

export function runClaude(options: ClaudeCliOptions): Promise<ClaudeCliResult> {
  return new Promise((resolve) => {
    const args = buildClaudeArgs(options);
    const child = spawn('claude', args, {
      cwd: options.cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve(parseClaudeOutput(code ?? 1, stdout, stderr));
    });

    child.on('error', (err) => {
      resolve({
        success: false,
        output: '',
        exitCode: 1,
        error: `Failed to spawn claude: ${err.message}`,
      });
    });
  });
}

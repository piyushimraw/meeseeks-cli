import {spawn, spawnSync} from 'node:child_process';
import type {ClaudeCliResult} from '../types/superRalph.js';

export interface ClaudeCliOptions {
  prompt: string;
  outputJson?: boolean;
  maxTurns?: number;
  cwd?: string;
  onStdoutChunk?: (chunk: string) => void;
  onStderrChunk?: (chunk: string) => void;
  /** Called with parsed assistant text as it streams in */
  onAssistantText?: (text: string) => void;
  /** Called with tool use info as Claude invokes tools */
  onToolUse?: (toolName: string, toolInput: string) => void;
  /** Enable streaming mode (stream-json) for live output */
  streaming?: boolean;
}

export function buildClaudeArgs(options: ClaudeCliOptions): string[] {
  const args = ['-p', options.prompt, '--permission-mode', 'acceptEdits'];

  if (options.streaming) {
    args.push('--output-format', 'stream-json', '--verbose');
  } else if (options.outputJson) {
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

interface StreamEvent {
  type: string;
  subtype?: string;
  message?: {
    content?: Array<{type: string; text?: string; name?: string; input?: unknown}>;
  };
  result?: string;
  is_error?: boolean;
}

function parseStreamLine(line: string, options: ClaudeCliOptions): void {
  if (!line.trim()) return;
  try {
    const event: StreamEvent = JSON.parse(line);

    if (event.type === 'assistant' && event.message?.content) {
      for (const block of event.message.content) {
        if (block.type === 'text' && block.text) {
          options.onAssistantText?.(block.text);
        }
        if (block.type === 'tool_use' && block.name) {
          const inputStr = typeof block.input === 'string'
            ? block.input.slice(0, 100)
            : JSON.stringify(block.input).slice(0, 100);
          options.onToolUse?.(block.name, inputStr);
        }
      }
    }
  } catch {
    // Not valid JSON, skip
  }
}

export function runClaude(options: ClaudeCliOptions): Promise<ClaudeCliResult> {
  // Enable streaming if any live callbacks are provided
  const useStreaming = Boolean(options.onAssistantText || options.onToolUse);
  const effectiveOptions = {...options, streaming: useStreaming || options.streaming};

  return new Promise((resolve) => {
    const args = buildClaudeArgs(effectiveOptions);
    const child = spawn('claude', args, {
      cwd: effectiveOptions.cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let finalResult = '';
    let lineBuffer = '';

    child.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stdout += chunk;
      options.onStdoutChunk?.(chunk);

      if (useStreaming) {
        // Parse stream-json line by line
        lineBuffer += chunk;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || '';
        for (const line of lines) {
          parseStreamLine(line, options);
          // Extract final result text
          try {
            const event = JSON.parse(line);
            if (event.type === 'result' && event.result) {
              finalResult = event.result;
            }
          } catch { /* skip */ }
        }
      }
    });

    child.stderr.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stderr += chunk;
      options.onStderrChunk?.(chunk);
    });

    child.on('close', (code) => {
      // Process any remaining buffer
      if (lineBuffer.trim()) {
        parseStreamLine(lineBuffer, options);
        try {
          const event = JSON.parse(lineBuffer);
          if (event.type === 'result' && event.result) {
            finalResult = event.result;
          }
        } catch { /* skip */ }
      }

      // In streaming mode, use the extracted result text instead of raw stdout
      const output = useStreaming ? (finalResult || stdout) : stdout;
      resolve(parseClaudeOutput(code ?? 1, output, stderr));
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

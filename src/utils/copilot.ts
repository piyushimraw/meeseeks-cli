import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {TokenSource} from '../types/index.js';

export type {TokenSource};

export interface DetectedToken {
  token: string;
  source: TokenSource;
}

export interface CopilotVerifyResult {
  success: boolean;
  error?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * Get token file paths based on platform
 */
function getTokenPaths(): {cli: string; vscode: string; jetbrains: string} {
  const home = os.homedir();
  const isWindows = process.platform === 'win32';

  const configBase = isWindows
    ? path.join(home, 'AppData', 'Local', 'github-copilot')
    : path.join(home, '.config', 'github-copilot');

  return {
    cli: path.join(home, '.copilot-cli-access-token'),
    vscode: path.join(configBase, 'hosts.json'),
    jetbrains: path.join(configBase, 'apps.json'),
  };
}

/**
 * Read token from Copilot CLI file
 */
function readCliToken(filePath: string): string | null {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8').trim();
      if (content && content.length > 0) {
        return content;
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Read OAuth token from hosts.json or apps.json
 */
function readJsonToken(filePath: string): string | null {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      // hosts.json format: { "github.com": { "oauth_token": "..." } }
      if (data['github.com']?.oauth_token) {
        return data['github.com'].oauth_token;
      }

      // apps.json format might vary, check for oauth_token at any level
      for (const key of Object.keys(data)) {
        const entry = data[key];
        if (entry?.oauth_token) {
          return entry.oauth_token;
        }
      }
    }
  } catch {
    // Ignore JSON parse errors
  }
  return null;
}

/**
 * Detect Copilot token from all known locations
 * Returns the first valid token found, checking in order: CLI, VS Code, JetBrains
 */
export function detectCopilotToken(): DetectedToken | null {
  const paths = getTokenPaths();

  // Check CLI token first (highest priority)
  const cliToken = readCliToken(paths.cli);
  if (cliToken) {
    return {token: cliToken, source: 'cli'};
  }

  // Check VS Code token
  const vscodeToken = readJsonToken(paths.vscode);
  if (vscodeToken) {
    return {token: vscodeToken, source: 'vscode'};
  }

  // Check JetBrains token
  const jetbrainsToken = readJsonToken(paths.jetbrains);
  if (jetbrainsToken) {
    return {token: jetbrainsToken, source: 'jetbrains'};
  }

  return null;
}

/**
 * Verify a Copilot token against the API
 */
export async function verifyCopilotToken(
  token: string,
): Promise<CopilotVerifyResult> {
  try {
    const response = await fetch('https://api.githubcopilot.com/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'meeseeks-cli/1.0',
      },
    });

    if (response.ok) {
      return {success: true};
    }

    if (response.status === 401) {
      return {success: false, error: 'Token expired or invalid'};
    }

    if (response.status === 403) {
      return {success: false, error: 'No Copilot subscription found'};
    }

    return {
      success: false,
      error: `API returned status ${response.status}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

/**
 * Send a chat completion request to GitHub Copilot
 */
export async function chatWithCopilot(
  token: string,
  messages: ChatMessage[],
  model: string = 'gpt-4o',
): Promise<ChatResponse> {
  try {
    const response = await fetch(
      'https://api.githubcopilot.com/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'meeseeks-cli/1.0',
        },
        body: JSON.stringify({
          model,
          messages,
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 401) {
        return {success: false, error: 'Token expired or invalid'};
      }
      if (response.status === 403) {
        return {success: false, error: 'No Copilot access'};
      }
      return {
        success: false,
        error: `API returned status ${response.status}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (content) {
      return {success: true, content};
    }

    return {success: false, error: 'No content in response'};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

/**
 * Test Copilot connection with a simple prompt
 */
export async function testCopilotConnection(
  token: string,
): Promise<ChatResponse> {
  return chatWithCopilot(token, [
    {role: 'user', content: 'Say "Hello from Copilot!" in exactly 4 words.'},
  ]);
}

/**
 * Get human-readable source name
 */
export function getSourceDisplayName(source: TokenSource): string {
  switch (source) {
    case 'cli':
      return 'GitHub Copilot CLI';
    case 'vscode':
      return 'VS Code';
    case 'jetbrains':
      return 'JetBrains IDE';
    default:
      return 'Unknown';
  }
}

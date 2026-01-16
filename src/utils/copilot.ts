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
  copilotToken?: string;
}

// Cache for exchanged Copilot tokens
let cachedCopilotToken: {token: string; expiresAt: number; apiEndpoint: string} | null = null;

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
function getTokenPaths(): {cli: string; vscodeApps: string; vscodeHosts: string} {
  const home = os.homedir();
  const isWindows = process.platform === 'win32';

  const configBase = isWindows
    ? path.join(home, 'AppData', 'Local', 'github-copilot')
    : path.join(home, '.config', 'github-copilot');

  return {
    cli: path.join(home, '.copilot-cli-access-token'),
    vscodeApps: path.join(configBase, 'apps.json'),
    vscodeHosts: path.join(configBase, 'hosts.json'),
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
 * Returns the first valid token found, checking in order: CLI, VS Code (apps.json, hosts.json)
 */
export function detectCopilotToken(): DetectedToken | null {
  const paths = getTokenPaths();

  // Check CLI token first (highest priority)
  const cliToken = readCliToken(paths.cli);
  if (cliToken) {
    return {token: cliToken, source: 'cli'};
  }

  // Check VS Code token in apps.json (common on macOS/Linux)
  const vscodeAppsToken = readJsonToken(paths.vscodeApps);
  if (vscodeAppsToken) {
    return {token: vscodeAppsToken, source: 'vscode'};
  }

  // Check VS Code token in hosts.json (fallback)
  const vscodeHostsToken = readJsonToken(paths.vscodeHosts);
  if (vscodeHostsToken) {
    return {token: vscodeHostsToken, source: 'vscode'};
  }

  return null;
}

/**
 * Exchange OAuth token for a Copilot API token
 * VS Code OAuth tokens need to be exchanged before use with the Copilot API
 */
export async function exchangeForCopilotToken(
  oauthToken: string,
): Promise<{success: boolean; token?: string; expiresAt?: number; apiEndpoint?: string; error?: string}> {
  try {
    const response = await fetch(
      'https://api.github.com/copilot_internal/v2/token',
      {
        method: 'GET',
        headers: {
          Authorization: `token ${oauthToken}`,
          Accept: 'application/json',
          'User-Agent': 'meeseeks-cli/1.0',
        },
      },
    );

    if (!response.ok) {
      if (response.status === 401) {
        return {success: false, error: 'OAuth token expired or invalid'};
      }
      if (response.status === 403) {
        return {success: false, error: 'No Copilot subscription found'};
      }
      return {
        success: false,
        error: `Token exchange failed with status ${response.status}`,
      };
    }

    const data = await response.json();
    if (data.token) {
      const expiresAt = data.expires_at
        ? data.expires_at * 1000 // Convert seconds to milliseconds
        : Date.now() + 30 * 60 * 1000; // Default 30 min
      // Use enterprise endpoint if available, otherwise default
      const apiEndpoint = data.endpoints?.api || 'https://api.githubcopilot.com';
      return {success: true, token: data.token, expiresAt, apiEndpoint};
    }

    return {success: false, error: 'No token in response'};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

/**
 * Get a valid Copilot API token, using cache or exchanging if needed
 */
export async function getCopilotApiToken(
  oauthToken: string,
  forceRefresh: boolean = false,
): Promise<{success: boolean; token?: string; apiEndpoint?: string; error?: string}> {
  // Check cache first (unless force refresh requested)
  if (!forceRefresh && cachedCopilotToken && cachedCopilotToken.expiresAt > Date.now() + 60000) {
    return {success: true, token: cachedCopilotToken.token, apiEndpoint: cachedCopilotToken.apiEndpoint};
  }

  // Exchange OAuth token for Copilot token
  const result = await exchangeForCopilotToken(oauthToken);
  if (result.success && result.token) {
    const apiEndpoint = result.apiEndpoint || 'https://api.githubcopilot.com';
    cachedCopilotToken = {
      token: result.token,
      expiresAt: result.expiresAt || Date.now() + 30 * 60 * 1000,
      apiEndpoint,
    };
    return {success: true, token: result.token, apiEndpoint};
  }

  return {success: false, error: result.error};
}

/**
 * Clear cached Copilot token (call on disconnect)
 */
export function clearCopilotTokenCache(): void {
  cachedCopilotToken = null;
}

/**
 * Verify a Copilot token against the API
 * For OAuth tokens (VS Code), exchanges them first
 * Uses a simple chat request to verify since /models endpoint doesn't work on enterprise
 */
export async function verifyCopilotToken(
  token: string,
): Promise<CopilotVerifyResult> {
  try {
    // First try to exchange the token (in case it's an OAuth token)
    const exchangeResult = await getCopilotApiToken(token);
    if (!exchangeResult.success || !exchangeResult.token) {
      return {success: false, error: exchangeResult.error || 'Failed to exchange token'};
    }

    // If token exchange succeeded, the token is valid
    // The exchange endpoint already validates the OAuth token
    return {success: true, copilotToken: exchangeResult.token};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

/**
 * Internal function to make chat request
 */
async function makeChatRequest(
  apiToken: string,
  apiEndpoint: string,
  messages: ChatMessage[],
  model: string,
): Promise<{response: Response | null; error?: string}> {
  try {
    const response = await fetch(
      `${apiEndpoint}/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'meeseeks-cli/1.0',
          'Editor-Version': 'vscode/1.85.0',
          'Editor-Plugin-Version': 'copilot/1.0.0',
          'Copilot-Integration-Id': 'vscode-chat',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
        }),
      },
    );
    return {response};
  } catch (err) {
    return {response: null, error: err instanceof Error ? err.message : 'Network error'};
  }
}

/**
 * Send a chat completion request to GitHub Copilot
 * Automatically exchanges OAuth token for Copilot API token if needed
 */
export async function chatWithCopilot(
  token: string,
  messages: ChatMessage[],
  model: string = 'gpt-4o',
): Promise<ChatResponse> {
  try {
    // Get fresh Copilot API token
    const tokenResult = await getCopilotApiToken(token, true); // Force refresh for chat
    if (!tokenResult.success || !tokenResult.token) {
      return {success: false, error: tokenResult.error || 'Failed to get Copilot token'};
    }

    const apiToken = tokenResult.token;
    const apiEndpoint = tokenResult.apiEndpoint || 'https://api.githubcopilot.com';

    const result = await makeChatRequest(apiToken, apiEndpoint, messages, model);

    if (result.error) {
      return {success: false, error: result.error};
    }

    const response = result.response!;

    if (!response.ok) {
      if (response.status === 401) {
        clearCopilotTokenCache();
        return {success: false, error: 'Token expired or invalid'};
      }
      if (response.status === 403) {
        return {success: false, error: 'No Copilot access'};
      }
      const errorText = await response.text().catch(() => '');
      return {
        success: false,
        error: `API returned status ${response.status}: ${errorText}`,
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
    default:
      return 'Unknown';
  }
}

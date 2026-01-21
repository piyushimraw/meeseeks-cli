import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {TokenSource} from '../types/index.js';

const CONFIG_DIR = path.join(os.homedir(), '.meeseeks');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface MeeseeksConfig {
  copilot?: {
    tokenSource: TokenSource;
    lastVerified?: string;
    selectedModel?: string;  // Selected model ID (e.g., 'gpt-4o')
  };
  services?: Record<string, {
    lastVerified?: string;
    credentials?: Record<string, string>;  // Credential storage for service
  }>;
  jira?: {
    selectedBoardId?: number;      // Last used board
    selectedTicketKey?: string;    // Currently selected ticket (restore on restart)
    storyPointsFieldId?: string;   // Cached custom field ID (future)
  };
}

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, {recursive: true, mode: 0o700});
  }
}

export function loadConfig(): MeeseeksConfig {
  try {
    ensureConfigDir();
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data) as MeeseeksConfig;
    }
  } catch {
    // Return empty config on error
  }
  return {};
}

export function saveConfig(config: MeeseeksConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600, encoding: 'utf-8' });
}

export function saveCopilotConfig(tokenSource: TokenSource): void {
  const config = loadConfig();
  config.copilot = {
    tokenSource,
    lastVerified: new Date().toISOString(),
  };
  saveConfig(config);
}

export function getCopilotConfig(): MeeseeksConfig['copilot'] | undefined {
  const config = loadConfig();
  return config.copilot;
}

export function clearCopilotConfig(): void {
  const config = loadConfig();
  delete config.copilot;
  saveConfig(config);
}

export function isCopilotConnected(): boolean {
  const copilot = getCopilotConfig();
  return !!copilot?.tokenSource;
}

export function saveSelectedModel(modelId: string): void {
  const config = loadConfig();
  if (!config.copilot) {
    config.copilot = {tokenSource: 'unknown'};
  }
  config.copilot.selectedModel = modelId;
  saveConfig(config);
}

export function getSelectedModel(): string | undefined {
  const config = loadConfig();
  return config.copilot?.selectedModel;
}

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.meeseeks');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface MeeseeksConfig {
  github?: {
    pat?: string;
    username?: string;
    hasCopilotAccess?: boolean;
    lastVerified?: string;
  };
}

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, {recursive: true});
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
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function saveGitHubPAT(
  pat: string,
  username: string,
  hasCopilotAccess: boolean,
): void {
  const config = loadConfig();
  config.github = {
    pat,
    username,
    hasCopilotAccess,
    lastVerified: new Date().toISOString(),
  };
  saveConfig(config);
}

export function getGitHubConfig(): MeeseeksConfig['github'] | undefined {
  const config = loadConfig();
  return config.github;
}

export function clearGitHubConfig(): void {
  const config = loadConfig();
  delete config.github;
  saveConfig(config);
}

export function isGitHubConnected(): boolean {
  const github = getGitHubConfig();
  return !!(github?.pat && github?.username);
}
